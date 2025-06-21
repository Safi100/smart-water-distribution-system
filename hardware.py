from flask import Flask, request, jsonify
import RPi.GPIO as GPIO
import time
import math

app = Flask(__name__)
GPIO.setmode(GPIO.BCM)

FLOW_PULSE_PER_LITER = 350  # YF-S201
pulse_count = 0  # متغير عام

def count_pulse(channel):
    global pulse_count
    print("Pulse detected!")
    pulse_count += 1

def measure_water_flow_single(tank, duration):
    global pulse_count
    pulse_count = 0

    flow_pin = tank["hardware"]["waterflow_sensor"]
    valve_pin = tank["hardware"]["solenoid_valve"]

    print(f"Starting water flow measurement on pin {flow_pin}")
    
    # إعداد البنات
    GPIO.setup(flow_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

    GPIO.add_event_detect(flow_pin, GPIO.FALLING, callback=count_pulse)

    start_time = time.time()
    while time.time() - start_time < duration:
        time.sleep(0.05)
        print("Pulse count so far:", pulse_count)

    GPIO.remove_event_detect(flow_pin)

    liters = pulse_count / FLOW_PULSE_PER_LITER

    result = {
        "tank_id": tank["id"],
        "pulses": pulse_count,
        "liters": round(liters, 2)
    }

    return result

@app.route('/control_water_pump', methods=['POST'])
def control_water_pump():
    try:
        pump_data = request.get_json()
        if not pump_data:
            return jsonify({"error": "No JSON payload received"}), 400
        print(pump_data['main_tank'])
        water_pump_pin = pump_data['main_tank']['hardware']['water_pump']
        duration = pump_data['main_tank']['water_pump_duration']
        tank = pump_data.get('tank', {})
        valve_pin = tank["hardware"]["solenoid_valve"]

        GPIO.setmode(GPIO.BCM)
        GPIO.setup(water_pump_pin, GPIO.OUT)
        GPIO.setup(valve_pin, GPIO.OUT)

        # تشغيل المضخة
        print(f"Turning ON water pump on pin {water_pump_pin} for {duration} seconds")
        GPIO.output(water_pump_pin, GPIO.HIGH)
        time.sleep(1)

        # فتح البوابة (تشغيل الريلاي بـ LOW)
        GPIO.output(valve_pin, GPIO.LOW)
        print(f"Solenoid valve on pin {valve_pin} opened (LOW)")

        # قراءة التدفق
        tank_results = measure_water_flow_single(tank, duration)

        # إيقاف المضخة
        GPIO.output(water_pump_pin, GPIO.LOW)
        print(f"Water pump on pin {water_pump_pin} turned OFF")
        # إغلاق البوابة (HIGH لإطفاء الريلاي)
        time.sleep(2)
        GPIO.output(valve_pin, GPIO.HIGH)
        print(f"Solenoid valve on pin {valve_pin} closed (HIGH)")

        GPIO.cleanup()

        return jsonify({
            "message": "Water pump controlled successfully",
            "pin": water_pump_pin,
            "duration": duration,
            "status": "completed",
            "tanks": tank_results
        }), 200

    except Exception as e:
        try:
            if 'water_pump_pin' in locals():
                GPIO.output(water_pump_pin, GPIO.LOW)
        except:
            pass
        GPIO.cleanup()
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
