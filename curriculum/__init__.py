"""
═══════════════════════════════════════════════════════════
📚 Curriculum Module - مجمِّع المواد
═══════════════════════════════════════════════════════════

المهمة: يجمع كل المواد المتاحة ويوفرها للبوت.

لإضافة مادة جديدة:
1. اعمل ملف جديد باسم: subject_grade.py
   مثلاً: arabic_grade_2.py, english_grade_3_scientific.py
   
2. افتح الملف اللي عملته واكتب فيه:
   - SUBJECT_INFO = {...}
   - SUMMARIES = {...}
   - QUESTIONS = {...}
   (شوف template.py كمرجع)

3. ضيف سطر import هنا:
   from . import arabic_grade_2
   
4. ضيف المادة في REGISTRY:
   REGISTRY['arabic_g2'] = arabic_grade_2

5. خلاص! البوت هيشوف المادة الجديدة تلقائياً.
═══════════════════════════════════════════════════════════
"""

# ═══ استيراد المواد ═══
from . import physics_grade_2  # الفيزياء - تانية ثانوي


# ═══ سجل المواد (Registry) ═══
# مفتاح القاموس = كود المادة (code من SUBJECT_INFO)
# قيمة القاموس = الـ module نفسه
REGISTRY = {
    'physics_g2': physics_grade_2,
    # مثال: 'arabic_g2': arabic_grade_2,
}


# ═══ دوال مساعدة ═══
def get_subject(code):
    """جلب مادة معيَّنة بكودها"""
    return REGISTRY.get(code)


def get_all_subjects():
    """قائمة كل المواد المتاحة"""
    return [
        {
            'code': code,
            'info': module.SUBJECT_INFO,
            'summaries_count': len(module.SUMMARIES),
            'questions_count': sum(len(qs) for qs in module.QUESTIONS.values()),
        }
        for code, module in REGISTRY.items()
    ]


def get_subjects_by_grade(grade):
    """جلب كل مواد صف معيَّن (grade_1/2/3)"""
    return [
        {'code': code, 'info': m.SUBJECT_INFO}
        for code, m in REGISTRY.items()
        if m.SUBJECT_INFO.get('grade') == grade
    ]


# ═══ للتوافق مع الكود القديم ═══
# البوت الحالي بيستخدم SUMMARIES و QUESTIONS مباشرة لمادة واحدة (الفيزياء)
# لما نضيف مواد تانية، هنشيل السطور دي ونستخدم REGISTRY
SUMMARIES = physics_grade_2.SUMMARIES
QUESTIONS = physics_grade_2.QUESTIONS
