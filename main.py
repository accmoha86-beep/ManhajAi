"""
database.py - إدارة قاعدة البيانات لبوت Manhaj AI
يحتوي على كل الدوال المتعلَّقة بالـ SQLite:
- تهيئة الجداول
- إدارة الطلبة (إضافة، تفعيل، إلغاء)
- الطلبات المعلَّقة
- التقدُّم والإحصائيات
- الإحالات
- التقارير
"""
import os
import sqlite3
import hashlib
import random
import datetime
import logging

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════
# 📂 مسار قاعدة البيانات
# ═══════════════════════════════════════════════════════════
DB_PATH = os.environ.get("DB_PATH", "/data/manhaj.db")
# تحقَّق إن المسار شغال. لو مش موجود، جرِّب تعمله
db_dir = os.path.dirname(DB_PATH)
if db_dir and not os.path.exists(db_dir):
    try:
        os.makedirs(db_dir, exist_ok=True)
        logger.info(f"✅ أنشأت فولدر {db_dir}")
    except Exception as e:
        # لو فشل (يعني مفيش Volume)، استخدم /tmp كـ fallback
        DB_PATH = "/tmp/manhaj.db"
        logger.error("=" * 60)
        logger.error("🚨 تحذير خطير: Volume غير مفعَّل!")
        logger.error(f"🚨 الـ DB هتتخزن في /tmp (مؤقَّت) وهتضيع عند كل redeploy!")
        logger.error("🚨 فعِّل Volume في Railway على مسار /data فوراً")
        logger.error("=" * 60)


# ═══════════════════════════════════════════════════════════
# 💰 الخطط والإحالات - ثوابت
# ═══════════════════════════════════════════════════════════
PLANS = {
    'full':   {'days': 365, 'price': 100, 'label': '💎 اشتراك - 100ج فقط'}
}

REFERRAL_BONUS_DAYS = 10  # القيمة الافتراضية - بتتخزَّن في DB لما يعدَّلها الأدمن
REFERRALS_NEEDED    = 1


# ═══════════════════════════════════════════════════════════
# 🗄️ تهيئة قاعدة البيانات
# ═══════════════════════════════════════════════════════════
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("""CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        name TEXT, phone TEXT, code TEXT,
        activated_at TEXT, expires_at TEXT,
        is_active INTEGER DEFAULT 1,
        is_trial INTEGER DEFAULT 0,
        warned INTEGER DEFAULT 0,
        plan TEXT DEFAULT 'full',
        referred_by INTEGER DEFAULT 0,
        last_active TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS codes (
        code TEXT PRIMARY KEY, name TEXT, phone TEXT,
        created_at TEXT, used INTEGER DEFAULT 0
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS pending (
        telegram_id INTEGER PRIMARY KEY, step TEXT, name TEXT, extra TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS requests (
        telegram_id INTEGER PRIMARY KEY,
        name TEXT, phone TEXT, status TEXT DEFAULT 'pending',
        plan TEXT DEFAULT 'full', referred_by INTEGER DEFAULT 0
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER,
        category TEXT,
        score INTEGER,
        total INTEGER,
        date TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id INTEGER,
        referred_id INTEGER UNIQUE,
        date TEXT,
        rewarded INTEGER DEFAULT 0
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT, user_id INTEGER, error TEXT, traceback TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS question_stats (
        category TEXT, q_index INTEGER,
        correct INTEGER DEFAULT 0, wrong INTEGER DEFAULT 0,
        PRIMARY KEY (category, q_index)
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY, value TEXT
    )""")
    # 🆕 جدول OTP
    c.execute("""CREATE TABLE IF NOT EXISTS otps (
        telegram_id INTEGER PRIMARY KEY,
        otp_code TEXT,
        phone TEXT,
        name TEXT,
        created_at TEXT,
        attempts INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 0
    )""")
    # 🆕 جدول المدفوعات
    c.execute("""CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER,
        student_name TEXT,
        method TEXT,
        amount REAL,
        transaction_id TEXT UNIQUE,
        receipt_file_id TEXT,
        ai_confidence REAL,
        ai_analysis TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT,
        processed_at TEXT,
        admin_note TEXT
    )""")
    # 🆕 جدول طرق الدفع (إعدادات الأدمن)
    c.execute("""CREATE TABLE IF NOT EXISTS payment_methods (
        method TEXT PRIMARY KEY,
        receiver_number TEXT,
        receiver_name TEXT,
        icon TEXT,
        label TEXT,
        instructions TEXT,
        is_active INTEGER DEFAULT 1
    )""")
    
    # أضف طرق الدفع الافتراضية (لو مش موجودة)
    default_methods = [
        ('vodafone', '', 'Manhaj AI', '📱', 'فودافون كاش',
         '1. افتح تطبيق My Vodafone\n2. اختار "تحويل من المحفظة"\n3. ادفع المبلغ على الرقم\n4. صَوَّر الإيصال وابعته هنا'),
        ('etisalat', '', 'Manhaj AI', '📱', 'اتصالات كاش',
         '1. افتح تطبيق Etisalat Cash\n2. اختار "تحويل أموال"\n3. ادفع المبلغ على الرقم\n4. صَوَّر الإيصال وابعته هنا'),
        ('orange', '', 'Manhaj AI', '📱', 'أورانج كاش',
         '1. افتح تطبيق Orange Cash\n2. اختار "إرسال أموال"\n3. ادفع المبلغ على الرقم\n4. صَوَّر الإيصال وابعته هنا'),
        ('we', '', 'Manhaj AI', '📱', 'وي باي',
         '1. افتح تطبيق WE Pay\n2. اختار "تحويل"\n3. ادفع المبلغ على الرقم\n4. صَوَّر الإيصال وابعته هنا'),
        ('instapay', '', 'Manhaj AI', '💳', 'انستا باي',
         '1. افتح تطبيق InstaPay\n2. اضغط "إرسال أموال"\n3. ابحث بالـ رقم المحمول أو Username\n4. ادفع المبلغ\n5. صَوَّر الإيصال وابعته هنا'),
        ('fawry', '', 'Manhaj AI', '🏪', 'فوري باي',
         '1. روح أقرب فرع فوري\n2. قول لصاحب المحل "فوري باي"\n3. ادفع على الرقم\n4. صَوَّر الإيصال وابعته هنا'),
    ]
    for m in default_methods:
        c.execute("""INSERT OR IGNORE INTO payment_methods 
            (method, receiver_number, receiver_name, icon, label, instructions)
            VALUES (?,?,?,?,?,?)""", m)
    
    conn.commit(); conn.close()
    logger.info(f"✅ DB initialized at {DB_PATH}")


# ═══════════════════════════════════════════════════════════
# 🛠️ دوال مساعدة
# ═══════════════════════════════════════════════════════════
def generate_code(name):
    raw = f"{name}{datetime.datetime.now().isoformat()}{random.randint(1000,9999)}"
    return hashlib.md5(raw.encode()).hexdigest()[:8].upper()


def log_error(user_id, error_msg, tb=""):
    """تسجيل الأخطاء في DB"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("INSERT INTO errors (date, user_id, error, traceback) VALUES (?,?,?,?)",
                    (datetime.datetime.now().isoformat(), user_id, str(error_msg)[:500], tb[:2000]))
        conn.commit(); conn.close()
    except Exception as e:
        logger.error(f"Failed to log error: {e}")


def update_last_active(telegram_id):
    """تحديث آخر نشاط للطالب"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE students SET last_active=? WHERE telegram_id=?",
                    (datetime.datetime.now().isoformat(), telegram_id))
        conn.commit(); conn.close()
    except: pass


# ═══════════════════════════════════════════════════════════
# 👥 إدارة الطلبة
# ═══════════════════════════════════════════════════════════
def activate_by_admin(telegram_id, name, phone, plan='full'):
    """تفعيل اشتراك حسب الخطَّة - يحتفظ بـ referred_by من التسجيل"""
    code = generate_code(name)
    days = PLANS.get(plan, PLANS['full'])['days']
    expires = (datetime.datetime.now() + datetime.timedelta(days=days)).isoformat()
    
    # امسك referred_by من السجل القديم (لو موجود) عشان ما يضيعش
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT referred_by FROM students WHERE telegram_id=?", (telegram_id,))
    row = c.fetchone()
    referred_by = row[0] if row else 0
    
    conn.execute("""INSERT OR REPLACE INTO students 
        (telegram_id,name,phone,code,activated_at,expires_at,is_active,is_trial,warned,plan,referred_by)
        VALUES (?,?,?,?,?,?,1,0,0,?,?)""",
        (telegram_id, name, phone, code, datetime.datetime.now().isoformat(), expires, plan, referred_by))
    conn.commit(); conn.close()
    # معالجة مكافأة الإحالة
    process_referral_reward(telegram_id)
    return code


def extend_subscription(telegram_id, days):
    """إضافة أيام لاشتراك موجود"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT expires_at FROM students WHERE telegram_id=?", (telegram_id,))
    row = c.fetchone()
    if row and row[0]:
        try:
            current_expiry = datetime.datetime.fromisoformat(row[0])
            now = datetime.datetime.now()
            base = max(current_expiry, now)
            new_expiry = (base + datetime.timedelta(days=days)).isoformat()
            conn.execute("UPDATE students SET expires_at=?, is_active=1 WHERE telegram_id=?",
                        (new_expiry, telegram_id))
            conn.commit(); conn.close()
            return True
        except Exception as e:
            logger.error(f"extend_subscription error: {e}")
    conn.close()
    return False


def start_trial(telegram_id, name, phone, referred_by=0):
    if is_trial_used(telegram_id): return False
    expires = (datetime.datetime.now() + datetime.timedelta(hours=24)).isoformat()
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""INSERT INTO students 
        (telegram_id,name,phone,activated_at,expires_at,is_active,is_trial,warned,plan,referred_by)
        VALUES (?,?,?,?,?,1,1,0,'trial',?)""",
        (telegram_id, name, phone, datetime.datetime.now().isoformat(), expires, referred_by))
    conn.commit(); conn.close()
    return True


def is_trial_used(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id FROM students WHERE telegram_id=?", (telegram_id,))
    row = c.fetchone(); conn.close()
    return bool(row)


def is_subscribed(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT is_active,expires_at FROM students WHERE telegram_id=? AND is_active=1", (telegram_id,))
    row = c.fetchone(); conn.close()
    if not row: return False
    if row[1]:
        try:
            if datetime.datetime.now() > datetime.datetime.fromisoformat(row[1]):
                conn2 = sqlite3.connect(DB_PATH)
                conn2.execute("UPDATE students SET is_active=0 WHERE telegram_id=?", (telegram_id,))
                conn2.commit(); conn2.close()
                return False
        except: pass
    return True


def get_trial_info(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT is_trial,expires_at FROM students WHERE telegram_id=? AND is_active=1", (telegram_id,))
    row = c.fetchone(); conn.close()
    if not row: return None
    is_trial, expires_at = row
    if not is_trial: return None
    try:
        remaining = datetime.datetime.fromisoformat(expires_at) - datetime.datetime.now()
        total_sec = remaining.total_seconds()
        if total_sec <= 0: return (True, 0, 0)
        return (True, int(total_sec // 3600), int((total_sec % 3600) // 60))
    except: return None


def get_subscription_info(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT plan,expires_at,is_trial FROM students WHERE telegram_id=? AND is_active=1", (telegram_id,))
    row = c.fetchone(); conn.close()
    if not row: return None
    plan, expires_at, is_trial = row
    try:
        remaining = datetime.datetime.fromisoformat(expires_at) - datetime.datetime.now()
        days_left = max(0, remaining.days)
        return {'plan': plan, 'days_left': days_left, 'is_trial': bool(is_trial)}
    except: return None


def set_trial_warned(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE students SET warned=1 WHERE telegram_id=?", (telegram_id,))
    conn.commit(); conn.close()


def get_all_trial_students():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT telegram_id,expires_at,warned FROM students WHERE is_trial=1 AND is_active=1")
    rows = c.fetchall(); conn.close()
    return rows


def deactivate_student(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE students SET is_active=0 WHERE telegram_id=?", (telegram_id,))
    affected = c.rowcount; conn.commit(); conn.close()
    return affected > 0


def get_all_students():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT name,phone,telegram_id,activated_at,is_active,is_trial,plan FROM students ORDER BY id DESC")
    rows = c.fetchall(); conn.close()
    return rows


def get_all_active_student_ids():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT telegram_id FROM students WHERE is_active=1")
    rows = c.fetchall(); conn.close()
    return [r[0] for r in rows]


# ═══════════════════════════════════════════════════════════
# 📋 الطلبات المعلَّقة
# ═══════════════════════════════════════════════════════════
def save_request(telegram_id, name, phone, plan='full', referred_by=0):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""INSERT OR REPLACE INTO requests 
        (telegram_id,name,phone,status,plan,referred_by) VALUES (?,?,?,'pending',?,?)""",
        (telegram_id, name, phone, plan, referred_by))
    conn.commit(); conn.close()


def get_request(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT name,phone,status,plan FROM requests WHERE telegram_id=?", (telegram_id,))
    row = c.fetchone(); conn.close()
    return {"name": row[0], "phone": row[1], "status": row[2], "plan": row[3]} if row else {}


def is_request_exists(telegram_id):
    req = get_request(telegram_id)
    return req.get("status") if req else None


def update_request_status(telegram_id, status):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE requests SET status=? WHERE telegram_id=?", (status, telegram_id))
    conn.commit(); conn.close()


def get_pending_requests():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT telegram_id,name,phone,plan FROM requests WHERE status='pending' ORDER BY rowid DESC")
    rows = c.fetchall(); conn.close()
    return rows


# ═══════════════════════════════════════════════════════════
# 📝 Pending Steps (خطوات التسجيل)
# ═══════════════════════════════════════════════════════════
def get_pending_step(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT step,name,extra FROM pending WHERE telegram_id=?", (telegram_id,))
    row = c.fetchone(); conn.close()
    return {"step": row[0], "name": row[1], "extra": row[2] or ""} if row else {}


def set_pending_step(telegram_id, step, name="", extra=""):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT OR REPLACE INTO pending (telegram_id,step,name,extra) VALUES (?,?,?,?)",
                (telegram_id, step, name, extra))
    conn.commit(); conn.close()


def clear_pending_step(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM pending WHERE telegram_id=?", (telegram_id,))
    conn.commit(); conn.close()


# ═══════════════════════════════════════════════════════════
# 📊 إحصائيات
# ═══════════════════════════════════════════════════════════
def get_stats():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM students WHERE is_active=1 AND is_trial=0")
    paid = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM students WHERE is_active=1 AND is_trial=1")
    trial = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM requests WHERE status='pending'")
    pending = c.fetchone()[0]
    conn.close()
    return paid, trial, pending


# ═══════════════════════════════════════════════════════════
# 📈 التقدُّم والنتائج
# ═══════════════════════════════════════════════════════════
def save_progress(telegram_id, category, score, total):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT INTO progress (telegram_id,category,score,total,date) VALUES (?,?,?,?,?)",
                (telegram_id, category, score, total, datetime.datetime.now().isoformat()))
    conn.commit(); conn.close()


def get_student_progress(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT category, AVG(CAST(score AS FLOAT)/total*100), COUNT(*) 
                 FROM progress WHERE telegram_id=? GROUP BY category""", (telegram_id,))
    rows = c.fetchall(); conn.close()
    return [(cat, round(avg or 0, 1), count) for cat, avg, count in rows]


def get_leaderboard(limit=10):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT s.name, AVG(CAST(p.score AS FLOAT)/p.total*100) AS avg_pct, COUNT(p.id) AS exams
                 FROM progress p JOIN students s ON p.telegram_id=s.telegram_id
                 GROUP BY p.telegram_id HAVING exams>=3
                 ORDER BY avg_pct DESC LIMIT ?""", (limit,))
    rows = c.fetchall(); conn.close()
    return [(name, round(avg, 1), exams) for name, avg, exams in rows]


def record_question_stat(category, q_index, correct):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    field = 'correct' if correct else 'wrong'
    c.execute(f"""INSERT INTO question_stats (category, q_index, {field}) VALUES (?, ?, 1)
                  ON CONFLICT(category, q_index) DO UPDATE SET {field}={field}+1""",
              (category, q_index))
    conn.commit(); conn.close()


def get_hardest_questions(limit=10):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT category, q_index, correct, wrong,
                 CAST(wrong AS FLOAT)/(correct+wrong)*100 AS error_rate
                 FROM question_stats WHERE (correct+wrong) >= 5
                 ORDER BY error_rate DESC LIMIT ?""", (limit,))
    rows = c.fetchall(); conn.close()
    return rows


# ═══════════════════════════════════════════════════════════
# 🎁 الإحالات
# ═══════════════════════════════════════════════════════════
def add_referral(referrer_id, referred_id):
    if referrer_id == referred_id: return False
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("INSERT INTO referrals (referrer_id, referred_id, date) VALUES (?,?,?)",
                    (referrer_id, referred_id, datetime.datetime.now().isoformat()))
        conn.commit(); conn.close()
        return True
    except: return False


def count_referrals(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT COUNT(*) FROM referrals r 
                 JOIN students s ON r.referred_id=s.telegram_id
                 WHERE r.referrer_id=? AND s.is_trial=0""", (telegram_id,))
    count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM referrals WHERE referrer_id=? AND rewarded=1", (telegram_id,))
    rewarded = c.fetchone()[0]
    conn.close()
    return count, rewarded


def get_referral_bonus_days():
    """جلب عدد أيام مكافأة الإحالة (من settings أو القيمة الافتراضية)"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT value FROM settings WHERE key='referral_bonus_days'")
    row = c.fetchone(); conn.close()
    if row:
        try:
            return int(row[0])
        except:
            return REFERRAL_BONUS_DAYS
    return REFERRAL_BONUS_DAYS


def set_referral_bonus_days(days):
    """تعديل عدد أيام مكافأة الإحالة (0 = إلغاء النظام)"""
    days = max(0, int(days))  # مايكونش سالب
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""INSERT OR REPLACE INTO settings (key, value) 
                    VALUES ('referral_bonus_days', ?)""", (str(days),))
    conn.commit(); conn.close()
    return days


def process_referral_reward(referred_id):
    """عند تفعيل اشتراك مدفوع، كافئ المُحيل بعدد الأيام المحدَّد في الإعدادات"""
    # جلب عدد الأيام من DB (متغيَّر من الأدمن)
    bonus_days = get_referral_bonus_days()
    if bonus_days <= 0:
        return  # النظام معطَّل من الأدمن
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT referred_by FROM students WHERE telegram_id=?", (referred_id,))
    row = c.fetchone()
    if not row or not row[0]:
        conn.close(); return
    referrer_id = row[0]
    
    c.execute("SELECT rewarded FROM referrals WHERE referrer_id=? AND referred_id=?",
              (referrer_id, referred_id))
    ref_row = c.fetchone()
    if not ref_row or ref_row[0]:
        conn.close(); return
    
    conn.close()
    extend_subscription(referrer_id, bonus_days)
    
    conn = sqlite3.connect(DB_PATH)
    conn.execute("UPDATE referrals SET rewarded=1 WHERE referrer_id=? AND referred_id=?",
                (referrer_id, referred_id))
    conn.commit(); conn.close()
    logger.info(f"🎁 مكافأة إحالة: {referrer_id} حصل على {bonus_days} أيام")
    return referrer_id




# ═══════════════════════════════════════════════════════════
# 🔐 نظام OTP (كود تحقُّق داخل البوت)
# ═══════════════════════════════════════════════════════════
def create_otp(telegram_id, name, phone):
    """توليد OTP جديد (6 أرقام)"""
    otp = str(random.randint(100000, 999999))
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""INSERT OR REPLACE INTO otps 
        (telegram_id, otp_code, phone, name, created_at, attempts, verified)
        VALUES (?,?,?,?,?,0,0)""",
        (telegram_id, otp, phone, name, datetime.datetime.now().isoformat()))
    conn.commit(); conn.close()
    return otp


def verify_otp(telegram_id, entered_code):
    """التحقُّق من OTP. يرجع:
    - ('ok', name, phone): صح
    - ('wrong', attempts_left): غلط
    - ('expired', 0): منتهي (>10 دقايق)
    - ('not_found', 0): مفيش OTP
    - ('too_many', 0): عدد محاولات زيادة
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT otp_code, phone, name, created_at, attempts, verified 
                 FROM otps WHERE telegram_id=?""", (telegram_id,))
    row = c.fetchone()
    if not row:
        conn.close(); return ('not_found', 0)
    otp_code, phone, name, created_at, attempts, verified = row
    if verified:
        conn.close(); return ('ok', name, phone)
    # فحص انتهاء الصلاحية (10 دقايق)
    try:
        age = (datetime.datetime.now() - datetime.datetime.fromisoformat(created_at)).total_seconds()
        if age > 600:
            conn.close(); return ('expired', 0)
    except: pass
    # فحص عدد المحاولات
    if attempts >= 5:
        conn.close(); return ('too_many', 0)
    # قارن الكود
    if str(entered_code).strip() == otp_code:
        conn.execute("UPDATE otps SET verified=1 WHERE telegram_id=?", (telegram_id,))
        conn.commit(); conn.close()
        return ('ok', name, phone)
    else:
        conn.execute("UPDATE otps SET attempts=attempts+1 WHERE telegram_id=?", (telegram_id,))
        conn.commit(); conn.close()
        return ('wrong', 5 - attempts - 1)


def clear_otp(telegram_id):
    """امسح OTP بعد الاستخدام"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM otps WHERE telegram_id=?", (telegram_id,))
    conn.commit(); conn.close()


# ═══════════════════════════════════════════════════════════
# 💳 نظام المدفوعات
# ═══════════════════════════════════════════════════════════
def get_payment_methods(active_only=True):
    """جلب طرق الدفع المتاحة"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if active_only:
        c.execute("""SELECT method, receiver_number, receiver_name, icon, label, instructions
                     FROM payment_methods WHERE is_active=1""")
    else:
        c.execute("""SELECT method, receiver_number, receiver_name, icon, label, instructions, is_active
                     FROM payment_methods""")
    rows = c.fetchall(); conn.close()
    return rows


def get_payment_method(method_id):
    """جلب تفاصيل طريقة دفع محدَّدة"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT method, receiver_number, receiver_name, icon, label, instructions, is_active
                 FROM payment_methods WHERE method=?""", (method_id,))
    row = c.fetchone(); conn.close()
    if not row: return None
    return {
        'method': row[0], 'receiver_number': row[1], 'receiver_name': row[2],
        'icon': row[3], 'label': row[4], 'instructions': row[5], 'is_active': row[6]
    }


def update_payment_method(method_id, receiver_number=None, is_active=None):
    """تحديث رقم المحفظة أو تفعيل/إلغاء طريقة دفع"""
    conn = sqlite3.connect(DB_PATH)
    if receiver_number is not None:
        conn.execute("UPDATE payment_methods SET receiver_number=? WHERE method=?",
                    (receiver_number, method_id))
    if is_active is not None:
        conn.execute("UPDATE payment_methods SET is_active=? WHERE method=?",
                    (1 if is_active else 0, method_id))
    conn.commit(); conn.close()


def create_payment(telegram_id, student_name, method, amount, receipt_file_id):
    """تسجيل محاولة دفع جديدة"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO payments 
        (telegram_id, student_name, method, amount, receipt_file_id, status, created_at)
        VALUES (?,?,?,?,?,'pending',?)""",
        (telegram_id, student_name, method, amount, receipt_file_id,
         datetime.datetime.now().isoformat()))
    payment_id = c.lastrowid
    conn.commit(); conn.close()
    return payment_id


def update_payment_analysis(payment_id, transaction_id, confidence, analysis, status):
    """حفظ نتيجة فحص الـ AI"""
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("""UPDATE payments 
            SET transaction_id=?, ai_confidence=?, ai_analysis=?, status=?,
                processed_at=?
            WHERE id=?""",
            (transaction_id, confidence, analysis, status,
             datetime.datetime.now().isoformat(), payment_id))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        # transaction_id مكرَّر = محاولة احتيال (نفس الإيصال اتبعت قبل كده)
        conn.execute("""UPDATE payments SET status='duplicate', ai_analysis=?, 
                        processed_at=? WHERE id=?""",
                    ('رقم العملية مستخدم قبل كده',
                     datetime.datetime.now().isoformat(), payment_id))
        conn.commit(); conn.close()
        return False


def check_duplicate_transaction(transaction_id):
    """التحقُّق إن رقم العملية ماستخدمش قبل كده"""
    if not transaction_id: return False
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id FROM payments WHERE transaction_id=? AND status IN ('approved', 'pending')",
              (transaction_id,))
    row = c.fetchone(); conn.close()
    return bool(row)


def get_pending_payments():
    """جلب المدفوعات اللي محتاجة مراجعة من الأدمن"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT id, telegram_id, student_name, method, amount, 
                        transaction_id, ai_confidence, ai_analysis, created_at
                 FROM payments 
                 WHERE status IN ('needs_review', 'pending')
                 ORDER BY created_at DESC""")
    rows = c.fetchall(); conn.close()
    return rows


def get_payment(payment_id):
    """جلب تفاصيل دفعة"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT id, telegram_id, student_name, method, amount, 
                        transaction_id, receipt_file_id, ai_confidence, 
                        ai_analysis, status, created_at
                 FROM payments WHERE id=?""", (payment_id,))
    row = c.fetchone(); conn.close()
    if not row: return None
    return {
        'id': row[0], 'telegram_id': row[1], 'student_name': row[2],
        'method': row[3], 'amount': row[4], 'transaction_id': row[5],
        'receipt_file_id': row[6], 'ai_confidence': row[7],
        'ai_analysis': row[8], 'status': row[9], 'created_at': row[10]
    }


def set_payment_status(payment_id, status, admin_note=""):
    """تحديث حالة دفعة (approve/reject/review)"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""UPDATE payments SET status=?, admin_note=?, processed_at=?
                    WHERE id=?""",
                (status, admin_note, datetime.datetime.now().isoformat(), payment_id))
    conn.commit(); conn.close()


def get_payment_stats():
    """إحصائيات الدفع"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # عدد المدفوعات حسب الحالة
    c.execute("""SELECT status, COUNT(*), SUM(amount) 
                 FROM payments GROUP BY status""")
    by_status = {row[0]: {'count': row[1], 'total': row[2] or 0} 
                 for row in c.fetchall()}
    
    # التوزيع حسب طريقة الدفع
    c.execute("""SELECT method, COUNT(*), SUM(amount) 
                 FROM payments WHERE status='approved' GROUP BY method""")
    by_method = [{'method': row[0], 'count': row[1], 'total': row[2] or 0}
                 for row in c.fetchall()]
    
    # إيرادات اليوم/الأسبوع/الشهر
    now = datetime.datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - datetime.timedelta(days=7)).isoformat()
    month_start = (now - datetime.timedelta(days=30)).isoformat()
    
    revenues = {}
    for period, start in [('today', today_start), ('week', week_start), ('month', month_start)]:
        c.execute("""SELECT SUM(amount) FROM payments 
                     WHERE status='approved' AND processed_at>=?""", (start,))
        revenues[period] = c.fetchone()[0] or 0
    
    conn.close()
    return {'by_status': by_status, 'by_method': by_method, 'revenues': revenues}


# ═══════════════════════════════════════════════════════════
# 📄 تقارير تفصيلية
# ═══════════════════════════════════════════════════════════
def get_full_student_report():
    """تقرير كامل عن كل الطلبة"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT s.telegram_id, s.name, s.phone, s.code, s.plan,
                        s.activated_at, s.expires_at, s.is_active, s.is_trial,
                        s.last_active, s.referred_by,
                        (SELECT COUNT(*) FROM progress p WHERE p.telegram_id=s.telegram_id) as exams,
                        (SELECT AVG(CAST(p.score AS FLOAT)/p.total*100) FROM progress p 
                         WHERE p.telegram_id=s.telegram_id) as avg_score,
                        (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id=s.telegram_id) as refs
                 FROM students s ORDER BY s.id DESC""")
    rows = c.fetchall()
    conn.close()
    return rows


def search_student(query):
    """بحث بالاسم أو الهاتف أو الـ ID"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    q = f"%{query}%"
    c.execute("""SELECT telegram_id, name, phone, plan, activated_at, expires_at, is_active, is_trial
                 FROM students 
                 WHERE name LIKE ? OR phone LIKE ? OR CAST(telegram_id AS TEXT) LIKE ?
                 LIMIT 10""", (q, q, q))
    rows = c.fetchall()
    conn.close()
    return rows


def get_student_detail(telegram_id):
    """تفاصيل كاملة لطالب واحد"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""SELECT telegram_id, name, phone, code, plan, activated_at, expires_at,
                        is_active, is_trial, last_active, referred_by
                 FROM students WHERE telegram_id=?""", (telegram_id,))
    student = c.fetchone()
    if not student:
        conn.close(); return None
    
    c.execute("""SELECT category, COUNT(*), AVG(CAST(score AS FLOAT)/total*100)
                 FROM progress WHERE telegram_id=? GROUP BY category""", (telegram_id,))
    exams = c.fetchall()
    
    c.execute("SELECT COUNT(*) FROM referrals WHERE referrer_id=?", (telegram_id,))
    refs = c.fetchone()[0]
    
    conn.close()
    return {'student': student, 'exams': exams, 'refs': refs}
