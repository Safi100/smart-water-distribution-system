import RPi.GPIO as GPIO
import time
import os

FLOW_PIN = 25  # GPIO pin
PULSES_PER_LITER = 450
COUNTER_FILE = "water_volume.txt"

pulse_count = 0
total_liters = 0.0

# ⬅️ تحميل القيمة من الملف إن وجدت
if os.path.exists(COUNTER_FILE):
    with open(COUNTER_FILE, "r") as f:
        try:
            total_liters = float(f.read().strip())
        except:
            total_liters = 0.0

# ⬅️ تعريف الكولباك عند وجود نبضة
def callback(channel):
    global pulse_count
    pulse_count += 1

# ⬅️ إعدادات GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(FLOW_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.add_event_detect(FLOW_PIN, GPIO.RISING, callback=callback)

print("Started water monitoring. Press Ctrl+C to exit.")

try:
    while True:
        time.sleep(1)
        liters = pulse_count / PULSES_PER_LITER
        pulse_count = 0
        total_liters += liters

        print(f"Water passed this second: {liters:.3f} L | Total: {total_liters:.3f} L")

        # ⬅️ حفظ القيمة إلى ملف
        with open(COUNTER_FILE, "w") as f:
            f.write(f"{total_liters:.5f}")

except KeyboardInterrupt:
    print("\nStopped by user.")

finally:
    GPIO.cleanup()
