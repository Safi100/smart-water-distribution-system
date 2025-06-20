import RPi.GPIO as GPIO
import time

def test_dual_relay():
    # استخدام أرقام الـ GPIO
    RELAY1 = 23
    RELAY2 = 24

    # إعدادات GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(RELAY1, GPIO.OUT)
    GPIO.setup(RELAY2, GPIO.OUT)

    print("تشغيل الريلي الأول لمدة 3 ثواني")
    GPIO.output(RELAY1, GPIO.LOW)  # في بعض الريليات LOW تعني تشغيل
    time.sleep(3)
    GPIO.output(RELAY1, GPIO.HIGH)

    print("تشغيل الريلي الثاني لمدة 3 ثواني")
    GPIO.output(RELAY2, GPIO.LOW)
    time.sleep(3)
    GPIO.output(RELAY2, GPIO.HIGH)

    # تنظيف الـ GPIO
    GPIO.cleanup()

if __name__ == "__main__":
    test_dual_relay()
