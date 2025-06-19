from flask import Flask, request, jsonify
import RPi.GPIO as GPIO
import time
import math

app = Flask(__name__)
GPIO.setmode(GPIO.BCM)

FLOW_PULSE_PER_LITER = 450  # YF-S201
pulse_count = 0  # متغير عام

def count_pulse(channel):
    global pulse_count
    pulse_count += 1

def measure_water_flow_single(tank, duration):
    global pulse_count
    pulse_count = 0  # إعادة تعيين العداد في بداية القياس

    flow_pin = tank["hardware"]["waterflow_sensor"]
    GPIO.setup(flow_pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)   
    GPIO.add_event_detect(flow_pin, GPIO.FALLING, callback=count_pulse)

    time.sleep(duration)

    GPIO.remove_event_detect(flow_pin)
    liters = pulse_count / FLOW_PULSE_PER_LITER

    result = {
        "tank_id": tank["id"],
        "pulses": pulse_count,  # استخدم العد الصحيح هنا
        "liters": round(liters, 2)
    }

    return result


@app.route('/control_water_pump', methods=['POST'])
def control_water_pump():
    try:
        pump_data = request.get_json()
        if not pump_data:
            return jsonify({"error": "No JSON payload received"}), 400

        pin = pump_data['main_tank']['hardware']['water_pump']
        duration = pump_data['main_tank']['water_pump_duration']
        tanks = pump_data.get('tanks', [])

        GPIO.setmode(GPIO.BCM)
        GPIO.setup(pin, GPIO.OUT)

        # تشغيل المضخة
        print(f"Turning ON water pump on pin {pin} for {duration} seconds")
        GPIO.output(pin, GPIO.HIGH)

        # قراءة التدفق
        tank_results = measure_water_flow(tanks, duration)

        # إيقاف المضخة
        GPIO.output(pin, GPIO.LOW)
        print(f"Water pump on pin {pin} turned OFF")

        GPIO.cleanup()

        return jsonify({
            "message": "Water pump controlled successfully",
            "pin": pin,
            "duration": duration,
            "status": "completed",
            "tanks": tank_results
        }), 200

    except Exception as e:
        try:
            if 'pin' in locals():
                GPIO.output(pin, GPIO.LOW)
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
