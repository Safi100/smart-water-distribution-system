import RPi.GPIO as GPIO
import time

FLOW_PIN = 26  # غيّر حسب توصيلك

pulse_count = 0
flow_rate = 0
liters = 0
start_time = time.time()

# كل نبضة = كمية ماء صغيرة (حسب نوع الحساس)
# YF-S201: ~ 450 نبضة = 1 لتر
PULSES_PER_LITER = 450

def count_pulse(channel):
    global pulse_count
    pulse_count += 1

# إعداد GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(FLOW_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.add_event_detect(FLOW_PIN, GPIO.FALLING, callback=count_pulse)

print("بدء قراءة تدفق الماء...")

try:
    while True:
        time.sleep(1)  # حساب كل ثانية
        elapsed = time.time() - start_time

        # حساب عدد الليترات المقاسة
        liters = pulse_count / PULSES_PER_LITER
        flow_rate = (pulse_count / elapsed) / PULSES_PER_LITER  # لتر/ثانية

        print(f"النبضات: {pulse_count} | التدفق: {flow_rate:.3f} لتر/ثانية | الحجم: {liters:.3f} لتر")

        # إعادة التوقيت والعداد إذا بدك كل ثانية:
        pulse_count = 0
        start_time = time.time()

except KeyboardInterrupt:
    print("\nتم الإيقاف من المستخدم.")

finally:
    GPIO.cleanup()
