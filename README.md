# 🤖 Manhaj AI

بوت تيليجرام ذكي لتعليم الفيزياء للصف الثاني الثانوي (الترم الثاني - 2026).

---

## ✨ المميزات

### للطلبة:
- 📚 20 ملخَّص كامل للوحدات الثلاث
- 📝 276 سؤال MCQ بالشرح
- 💬 شات ذكي بالذكاء الاصطناعي (GPT-4o-mini)
- 📊 تتبُّع التقدُّم الشخصي
- 🏆 ترتيب الأوائل (Leaderboard)
- 🎓 شهادات إنجاز (عند تجاوز 80%)
- 🆓 تجربة مجانية 24 ساعة
- 🎁 اشتراكات مجانية بنظام الإحالة (10 أيام لكل صديق)

### للأدمن:
- 👑 لوحة تحكُّم كاملة بـ 15 زر
- 💰 نظام دفع أوتوماتيك بـ AI Vision
- 📊 إحصائيات وتحليلات تفصيلية
- 📄 تقارير CSV قابلة للتصدير
- 🔍 بحث متقدم عن الطلبة
- 💾 Backup تلقائي كل ساعة
- 📢 Broadcast للإعلانات

### نظام الدفع الأوتوماتيك:
- 📱 6 طرق دفع مصرية (فودافون/اتصالات/أورانج/وي/إنستا باي/فوري)
- 🤖 AI يفحص الإيصال تلقائياً
- ✅ تفعيل فوري لو AI متأكد >85%
- 🛡️ حماية من الإيصالات المكرَّرة

---

## 📁 هيكل المشروع

```
manhaj-ai-bot/
│
├── main.py              منطق البوت (122 KB)
├── database.py          قاعدة البيانات (35 KB)
│
├── curriculum/          مجلَّد المناهج
│   ├── __init__.py           مجمِّع المواد
│   ├── physics_grade_2.py    الفيزياء تانية ثانوي
│   └── template.py           قالب لإضافة مواد جديدة
│
├── requirements.txt     المكتبات
├── Procfile             إعدادات Railway
├── runtime.txt          إصدار Python
├── .gitignore           حماية الـ secrets
└── README.md            هذا الملف
```

---

## 🚀 خطوات التشغيل

### 1. أنشئ Repository على GitHub

- روح github.com/new
- اسم الـ repo: manhaj-ai-bot
- اختار Private
- اضغط Create

### 2. ارفع الملفات على GitHub

ارفع كل الملفات:
- main.py
- database.py
- curriculum/ (الفولدر كامل)
- requirements.txt
- Procfile
- runtime.txt
- .gitignore
- README.md

### 3. أنشئ حساب Railway

- روح railway.app → Login with GitHub
- اضغط New Project → Deploy from GitHub Repo
- اختار manhaj-ai-bot

### 4. ضيف Environment Variables

في Railway → تاب Variables → New Variable:

| Variable | Value |
|----------|-------|
| BOT_TOKEN | توكن البوت من @BotFather |
| OPENAI_API_KEY | مفتاح OpenAI من platform.openai.com |
| ADMIN_ID | Telegram ID بتاعك (من @userinfobot) |
| BOT_USERNAME | اسم البوت بدون @ |
| DB_PATH | /data/manhaj.db |

### 5. أضف Volume لقاعدة البيانات (مهم!)

في Railway:
- اضغط + Create → Volume
- Mount Path: /data
- اضغط Attach

### 6. بعد التشغيل - إعداد طرق الدفع

1. افتح البوت كأدمن: /start
2. اضغط ⚙️ إعداد الدفع
3. لكل طريقة دفع:
   - اضغط عليها
   - اضغط ✏️ تعديل الرقم
   - ادخل رقم محفظتك
4. الطرق تتفعَّل تلقائياً

---

## 💰 التكلفة الشهرية

| الخدمة | التكلفة |
|--------|---------|
| Railway (Hobby Plan) | ~$5 |
| OpenAI API | $10-30 حسب الاستخدام |
| المجموع | ~$15-35 شهرياً |

---

## 🛠️ تعديل المنهج

### لتحديث محتوى الفيزياء:
افتح curriculum/physics_grade_2.py وعدِّل في:
- SUMMARIES للملخَّصات
- QUESTIONS للأسئلة

### لإضافة مادة جديدة:
1. انسخ curriculum/template.py وسمِّه {subject}_grade_{number}.py
2. املأ المحتوى
3. افتح curriculum/__init__.py:
   - ضيف: from . import subject_grade_X
   - ضيف للـ REGISTRY

---

## 🔒 الأمان

- ✅ OTP محمي بعدد محاولات
- ✅ Transaction ID فريد لمنع الاحتيال
- ✅ حماية صلاحيات الأدمن
- ✅ Error handler ذكي
- ✅ Auto-backup كل ساعة

---

## 📞 الدعم

لأي استفسار أو مشكلة، تواصل مع الأدمن عبر البوت.

---

**صُنع بـ ❤️ للطلبة المصريين**
