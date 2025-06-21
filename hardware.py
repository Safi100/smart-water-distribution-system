from flask import Flask, request, jsonify
import RPi.GPIO as GPIO
import time
import math
import threading
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)
GPIO.setmode(GPIO.BCM)

FLOW_PULSE_PER_LITER = 350  # YF-S201

# قاموس لحفظ عدادات النبضات لكل خزان
tank_pulse_counts = {}
pulse_locks = {}

def count_pulse_for_tank(tank_id):
    """إنشاء دالة callback مخصصة لكل خزان"""
    def callback(channel):
        with pulse_locks[tank_id]:
            tank_pulse_counts[tank_id] += 1
            print(f"Pulse detected for tank {tank_id}! Count: {tank_pulse_counts[tank_id]}")
    return callback

def measure_water_flow_for_tank(tank, duration):
    """قياس التدفق لخزان واحد - thread safe"""
    tank_id = tank.get("_id", tank.get("id", "unknown"))
    flow_pin = tank["hardware"]["waterflow_sensor"]
    valve_pin = tank["hardware"]["solenoid_valve"]

    # إعداد العدادات والأقفال لهذا الخزان
    tank_pulse_counts[tank_id] = 0
    pulse_locks[tank_id] = threading.Lock()

    print(f"Starting water flow measurement for tank {tank_id} on pin {flow_pin}")

    try:
        # إعداد البنات
        GPIO.setup(flow_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(valve_pin, GPIO.OUT)

        # فتح البوابة (تشغيل الريلاي بـ LOW)
        GPIO.output(valve_pin, GPIO.LOW)
        print(f"Solenoid valve on pin {valve_pin} opened (LOW) for tank {tank_id}")

        # إعداد callback للنبضات
        callback = count_pulse_for_tank(tank_id)
        GPIO.add_event_detect(flow_pin, GPIO.FALLING, callback=callback)

        start_time = time.time()
        while time.time() - start_time < duration:
            time.sleep(0.1)
            with pulse_locks[tank_id]:
                current_count = tank_pulse_counts[tank_id]
            print(f"Tank {tank_id} pulse count so far: {current_count}")

        GPIO.remove_event_detect(flow_pin)

        # إغلاق البوابة (HIGH لإطفاء الريلاي)
        time.sleep(1)
        GPIO.output(valve_pin, GPIO.HIGH)
        print(f"Solenoid valve on pin {valve_pin} closed (HIGH) for tank {tank_id}")

        # حساب اللترات
        with pulse_locks[tank_id]:
            final_pulse_count = tank_pulse_counts[tank_id]

        liters = final_pulse_count / FLOW_PULSE_PER_LITER

        result = {
            "tank_id": tank_id,
            "pulses": final_pulse_count,
            "liters": round(liters, 2)
        }

        print(f"Tank {tank_id} measurement completed: {result}")
        return result

    except Exception as e:
        print(f"Error measuring tank {tank_id}: {str(e)}")
        try:
            GPIO.output(valve_pin, GPIO.HIGH)  # إغلاق البوابة في حالة الخطأ
        except:
            pass
        return {
            "tank_id": tank_id,
            "pulses": 0,
            "liters": 0,
            "error": str(e)
        }
    finally:
        # تنظيف البيانات
        if tank_id in tank_pulse_counts:
            del tank_pulse_counts[tank_id]
        if tank_id in pulse_locks:
            del pulse_locks[tank_id]

@app.route('/control_water_pump', methods=['POST'])
def control_water_pump():
    try:
        pump_data = request.get_json()
        if not pump_data:
            return jsonify({"error": "No JSON payload received"}), 400

        print("Received pump data:", pump_data)

        water_pump_pin = pump_data['main_tank']['hardware']['water_pump']
        duration = pump_data['main_tank']['water_pump_duration']
        tanks = pump_data.get('tanks', [])

        if not tanks:
            return jsonify({"error": "No tanks provided"}), 400

        GPIO.setmode(GPIO.BCM)
        GPIO.setup(water_pump_pin, GPIO.OUT)

        # تشغيل المضخة
        print(f"Turning ON water pump on pin {water_pump_pin} for {duration} seconds")
        GPIO.output(water_pump_pin, GPIO.HIGH)
        time.sleep(1)

        # تشغيل قياس التدفق لكل الخزانات بالتوازي
        print(f"Starting parallel water flow measurement for {len(tanks)} tanks")

        with ThreadPoolExecutor(max_workers=len(tanks)) as executor:
            # إرسال كل خزان لـ thread منفصل
            futures = [
                executor.submit(measure_water_flow_for_tank, tank, duration)
                for tank in tanks
            ]

            # انتظار انتهاء كل الـ threads وجمع النتائج
            tank_results = []
            for future in futures:
                result = future.result()
                tank_results.append(result)

        # إيقاف المضخة
        GPIO.output(water_pump_pin, GPIO.LOW)
        print(f"Water pump on pin {water_pump_pin} turned OFF")

        time.sleep(1)
        GPIO.cleanup()

        return jsonify({
            "message": f"Water pump controlled successfully for {len(tanks)} tanks",
            "pin": water_pump_pin,
            "duration": duration,
            "status": "completed",
            "tanks": tank_results
        }), 200

    except Exception as e:
        print(f"Error in control_water_pump: {str(e)}")
        try:
            if 'water_pump_pin' in locals():
                GPIO.output(water_pump_pin, GPIO.LOW)
        except:
            pass
        try:
            GPIO.cleanup()
        except:
            pass
        return jsonify({"error": str(e)}), 500

def measure_once(TRIG_PIN, ECHO_PIN):
    GPIO.output(TRIG_PIN, False)
    time.sleep(0.05)

    GPIO.output(TRIG_PIN, True)
    time.sleep(0.00001)
    GPIO.output(TRIG_PIN, False)

    start_time = time.time()
    timeout = start_time + 0.04
    while GPIO.input(ECHO_PIN) == 0 and time.time() < timeout:
        pulse_start = time.time()

    timeout = time.time() + 0.04
    while GPIO.input(ECHO_PIN) == 1 and time.time() < timeout:
        pulse_end = time.time()

    try:
        pulse_duration = pulse_end - pulse_start
        if pulse_duration <= 0 or pulse_duration > 0.04:
            return None
        distance_cm = round(pulse_duration * 17150, 2)
        return distance_cm
    except:
        return None

@app.route('/calculate_tank_capacity', methods=['POST'])
def calculate_tank_capacity():
    try:
        tank_data = request.get_json()
        if not tank_data:
            return jsonify({"error": "No JSON payload received"}), 400

        ECHO_PIN = tank_data['hardware']['ultrasonic_sensor_echo']
        TRIG_PIN = tank_data['hardware']['ultrasonic_sensor_trig']

        GPIO.setmode(GPIO.BCM)
        GPIO.setup(TRIG_PIN, GPIO.OUT)
        GPIO.setup(ECHO_PIN, GPIO.IN)

        readings = []
        for _ in range(5):
            dist = measure_once(TRIG_PIN, ECHO_PIN)
            if dist is not None:
                readings.append(dist)
            time.sleep(0.1)  # small delay between readings

        if not readings:
            return jsonify({"error": "All readings failed"}), 500

        avg_distance = round(sum(readings) / len(readings), 2)
        print("Readings:", readings)
        print("Average distance:", avg_distance)
        TANK_HEIGHT = tank_data['height']
        TANK_RADIUS = tank_data['radius']

        # Distance from sensor to water surface
        WATER_HEIGHT = TANK_HEIGHT - avg_distance  # in cm
        WATER_HEIGHT = max(WATER_HEIGHT, 0)  # Avoid negative value
        # Volume in cubic centimeters, then convert to liters
        volume_cm3 = math.pi * (TANK_RADIUS ** 2) * WATER_HEIGHT
        volume_liters = round(volume_cm3 / 1000, 2)

        return jsonify({
            "average_distance_cm": avg_distance,
            "water_height_cm": WATER_HEIGHT,
            "estimated_volume_liters": volume_liters,
            "readings": readings
        }), 200


    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
