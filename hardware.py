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
        try:
            with pulse_locks[tank_id]:
                tank_pulse_counts[tank_id] += 1
                count = tank_pulse_counts[tank_id]
            print(f"🔥 PULSE DETECTED! Tank {tank_id}, Pin {channel}, Count: {count}")
        except Exception as e:
            print(f"❌ ERROR in pulse callback for tank {tank_id}: {e}")
    return callback

def measure_water_flow_for_tank(tank, duration):
    """قياس التدفق لخزان واحد - thread safe"""
    tank_id = tank.get("_id", tank.get("id", "unknown"))
    flow_pin = tank["hardware"]["waterflow_sensor"]
    valve_pin = tank["hardware"]["solenoid_valve"]

    print(f"🔧 TANK {tank_id} - Starting setup:")
    print(f"   - Flow sensor pin: {flow_pin}")
    print(f"   - Valve pin: {valve_pin}")
    print(f"   - Duration: {duration} seconds")

    # إعداد العدادات والأقفال لهذا الخزان
    tank_pulse_counts[tank_id] = 0
    pulse_locks[tank_id] = threading.Lock()

    try:
        # إعداد البنات
        print(f"🔧 TANK {tank_id} - Setting up GPIO pins...")
        GPIO.setup(flow_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(valve_pin, GPIO.OUT)
        print(f"✅ TANK {tank_id} - GPIO setup completed")

        # فتح البوابة (تشغيل الريلاي بـ LOW)
        GPIO.output(valve_pin, GPIO.LOW)
        print(f"🚰 TANK {tank_id} - Solenoid valve OPENED (pin {valve_pin} = LOW)")

        # إعداد callback للنبضات
        callback = count_pulse_for_tank(tank_id)
        print(f"🔧 TANK {tank_id} - Registering pulse callback...")
        GPIO.add_event_detect(flow_pin, GPIO.FALLING, callback=callback)
        print(f"✅ TANK {tank_id} - Pulse detection registered on pin {flow_pin}")

        # اختبار حالة الـ pin قبل البدء
        initial_pin_state = GPIO.input(flow_pin)
        print(f"📊 TANK {tank_id} - Initial flow pin state: {initial_pin_state}")

        start_time = time.time()
        last_count = 0

        while time.time() - start_time < duration:
            time.sleep(0.5)  # تقليل التكرار لتقليل الضوضاء
            with pulse_locks[tank_id]:
                current_count = tank_pulse_counts[tank_id]

            # طباعة فقط عند تغيير العدد
            if current_count != last_count:
                print(f"💧 TANK {tank_id} - NEW PULSE! Count: {current_count}")
                last_count = current_count

            # اختبار حالة الـ pin
            pin_state = GPIO.input(flow_pin)
            if time.time() - start_time < 2:  # طباعة حالة الـ pin في أول ثانيتين فقط
                print(f"📊 TANK {tank_id} - Pin {flow_pin} state: {pin_state}")

        print(f"⏰ TANK {tank_id} - Measurement period ended")
        GPIO.remove_event_detect(flow_pin)
        print(f"🔧 TANK {tank_id} - Event detection removed")

        # إغلاق البوابة (HIGH لإطفاء الريلاي)
        time.sleep(1)
        GPIO.output(valve_pin, GPIO.HIGH)
        print(f"🚰 TANK {tank_id} - Solenoid valve CLOSED (pin {valve_pin} = HIGH)")

        # حساب اللترات من النبضات
        with pulse_locks[tank_id]:
            final_pulse_count = tank_pulse_counts[tank_id]

        liters = final_pulse_count / FLOW_PULSE_PER_LITER

        # قراءة الـ ultrasonic لمعرفة الكمية الفعلية في الخزان
        print(f"📏 TANK {tank_id} - Reading ultrasonic sensor...")
        final_liters = read_tank_ultrasonic(tank)

        result = {
            "tank_id": tank_id,
            "pulses": final_pulse_count,
            "liters": round(liters, 2),
            "final_liters": final_liters
        }

        print(f"✅ TANK {tank_id} - FINAL RESULT: {result}")
        return result

    except Exception as e:
        print(f"❌ ERROR in tank {tank_id}: {str(e)}")
        import traceback
        print(f"❌ TRACEBACK: {traceback.format_exc()}")
        try:
            GPIO.output(valve_pin, GPIO.HIGH)  # إغلاق البوابة في حالة الخطأ
            print(f"🚰 TANK {tank_id} - Emergency valve close")
        except Exception as cleanup_error:
            print(f"❌ TANK {tank_id} - Cleanup error: {cleanup_error}")
        return {
            "tank_id": tank_id,
            "pulses": 0,
            "liters": 0,
            "final_liters": 0,
            "error": str(e)
        }
    finally:
        # تنظيف البيانات
        if tank_id in tank_pulse_counts:
            del tank_pulse_counts[tank_id]
        if tank_id in pulse_locks:
            del pulse_locks[tank_id]
        print(f"🧹 TANK {tank_id} - Cleanup completed")

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
        print(f"🚀 Starting parallel water flow measurement for {len(tanks)} tanks")

        # طباعة تفاصيل كل خزان قبل البدء
        for i, tank in enumerate(tanks):
            tank_id = tank.get("_id", tank.get("id", f"tank_{i}"))
            flow_pin = tank["hardware"]["waterflow_sensor"]
            valve_pin = tank["hardware"]["solenoid_valve"]
            print(f"📋 Tank {i+1}: ID={tank_id}, Flow={flow_pin}, Valve={valve_pin}")

        with ThreadPoolExecutor(max_workers=len(tanks)) as executor:
            # إرسال كل خزان لـ thread منفصل
            futures = [
                executor.submit(measure_water_flow_for_tank, tank, duration)
                for tank in tanks
            ]

            print(f"⚡ {len(futures)} threads started, waiting for completion...")

            # انتظار انتهاء كل الـ threads وجمع النتائج
            tank_results = []
            for i, future in enumerate(futures):
                print(f"⏳ Waiting for thread {i+1}...")
                result = future.result()
                tank_results.append(result)
                print(f"✅ Thread {i+1} completed: {result}")

        print(f"🏁 All threads completed. Results: {tank_results}")

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

def read_tank_ultrasonic(tank):
    """قراءة حجم الماء في الخزان باستخدام الـ ultrasonic sensor"""
    try:
        tank_id = tank.get("_id", tank.get("id", "unknown"))

        # التحقق من وجود بيانات الـ ultrasonic
        if "ultrasonic_sensor_echo" not in tank["hardware"] or "ultrasonic_sensor_trig" not in tank["hardware"]:
            print(f"⚠️ TANK {tank_id} - Missing ultrasonic sensor data")
            return 0

        ECHO_PIN = tank["hardware"]["ultrasonic_sensor_echo"]
        TRIG_PIN = tank["hardware"]["ultrasonic_sensor_trig"]

        # التحقق من وجود أبعاد الخزان
        if "height" not in tank or "radius" not in tank:
            print(f"⚠️ TANK {tank_id} - Missing tank dimensions")
            return 0

        TANK_HEIGHT = tank["height"]
        TANK_RADIUS = tank["radius"]

        print(f"📏 TANK {tank_id} - Ultrasonic: TRIG={TRIG_PIN}, ECHO={ECHO_PIN}")

        GPIO.setup(TRIG_PIN, GPIO.OUT)
        GPIO.setup(ECHO_PIN, GPIO.IN)

        readings = []
        for _ in range(5):
            dist = measure_once(TRIG_PIN, ECHO_PIN)
            if dist is not None:
                readings.append(dist)
            time.sleep(0.1)  # small delay between readings

        if not readings:
            print(f"❌ TANK {tank_id} - All ultrasonic readings failed")
            return 0

        avg_distance = round(sum(readings) / len(readings), 2)
        print(f"📏 TANK {tank_id} - Readings: {readings}")
        print(f"📏 TANK {tank_id} - Average distance: {avg_distance} cm")

        # حساب ارتفاع الماء
        WATER_HEIGHT = TANK_HEIGHT - avg_distance
        WATER_HEIGHT = max(WATER_HEIGHT, 0)  # تجنب القيم السالبة

        # حساب الحجم باللتر
        volume_cm3 = math.pi * (TANK_RADIUS ** 2) * WATER_HEIGHT
        volume_liters = round(volume_cm3 / 1000, 2)

        print(f"📏 TANK {tank_id} - Water height: {WATER_HEIGHT} cm, Volume: {volume_liters} L")
        return volume_liters

    except Exception as e:
        print(f"❌ TANK {tank_id} - Error reading ultrasonic: {str(e)}")
        return 0

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
