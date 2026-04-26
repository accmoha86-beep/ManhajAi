import { NextRequest, NextResponse } from 'next/server';

// Normalize Arabic text — remove diacritics, normalize hamza/alef, etc.
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '') // remove tashkeel
    .replace(/[إأآٱ]/g, 'ا') // normalize alef
    .replace(/ة/g, 'ه') // ta marbuta → ha
    .replace(/ى/g, 'ي') // alef maqsura → ya
    .replace(/ؤ/g, 'و') // waw hamza
    .replace(/ئ/g, 'ي') // ya hamza
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Extract meaningful keywords from model answer
function extractKeywords(text: string): string[] {
  const normalized = normalizeArabic(text);
  
  // Arabic stop words to ignore
  const stopWords = new Set([
    'في', 'من', 'على', 'الى', 'ان', 'هو', 'هي', 'هذا', 'هذه', 'ذلك', 'تلك',
    'التي', 'الذي', 'الذين', 'اللذين', 'اللتين', 'كان', 'كانت', 'يكون', 'تكون',
    'عن', 'مع', 'بين', 'حتى', 'لان', 'لكن', 'او', 'ثم', 'بل', 'لا', 'نعم',
    'كل', 'بعض', 'غير', 'اي', 'اذا', 'عند', 'عندما', 'قد', 'لم', 'لن', 'ما',
    'هل', 'كيف', 'لماذا', 'اين', 'متى', 'كم', 'وهو', 'وهي', 'فهو', 'فهي',
    'به', 'بها', 'له', 'لها', 'منه', 'منها', 'فيه', 'فيها', 'عليه', 'عليها',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'may', 'might', 'must', 'can', 'could', 'of', 'in', 'to', 'for', 'with',
    'on', 'at', 'from', 'by', 'about', 'as', 'into', 'through', 'during',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither',
    'it', 'its', 'this', 'that', 'these', 'those', 'he', 'she', 'they', 'we',
    'يتم', 'حيث', 'وذلك', 'ولا', 'ولكن', 'وقد', 'التى', 'يعني', 'تعتبر', 'يعتبر',
    'هناك', 'ليس', 'ليست', 'ايضا', 'جدا', 'اكثر', 'اقل', 'بعد', 'قبل', 'خلال',
    'مثل', 'نحو', 'حول', 'ضد', 'تحت', 'فوق', 'امام', 'خلف', 'داخل', 'خارج',
  ]);

  const words = normalized.split(/[\s,،.؟?!:;()\[\]{}\-\/\\]+/);
  
  // Filter: remove stop words, short words, numbers only
  const keywords = words.filter(w => 
    w.length > 2 && 
    !stopWords.has(w) && 
    !/^\d+$/.test(w)
  );

  // Also extract multi-word phrases (bigrams) for compound terms
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i].length > 1 && words[i + 1].length > 1 && 
        !stopWords.has(words[i]) && !stopWords.has(words[i + 1])) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
  }

  return [...new Set([...keywords, ...bigrams])];
}

// Check if student answer contains a keyword (fuzzy match)
function containsKeyword(studentText: string, keyword: string): boolean {
  // Direct inclusion
  if (studentText.includes(keyword)) return true;
  
  // For single words, check if any student word starts with the keyword root (3+ chars)
  if (!keyword.includes(' ') && keyword.length >= 4) {
    const root = keyword.substring(0, Math.max(3, Math.floor(keyword.length * 0.7)));
    const studentWords = studentText.split(/\s+/);
    return studentWords.some(w => w.includes(root) || root.includes(w.substring(0, root.length)));
  }
  
  return false;
}

// Grade a single essay question
function gradeEssay(
  studentAnswer: string, 
  modelAnswer: string,
  questionText: string
): { score: number; feedback: string; matchedKeywords: string[]; totalKeywords: number } {
  
  if (!studentAnswer || studentAnswer.trim().length < 3) {
    return { 
      score: 0, 
      feedback: '❌ لم يتم كتابة إجابة',
      matchedKeywords: [],
      totalKeywords: 0
    };
  }

  const normalizedStudent = normalizeArabic(studentAnswer);
  const keywords = extractKeywords(modelAnswer);
  
  if (keywords.length === 0) {
    // If no keywords extractable, check basic length similarity
    return {
      score: normalizedStudent.length > 10 ? 50 : 0,
      feedback: normalizedStudent.length > 10 
        ? '⚠️ تم تقييم إجابتك — راجع الإجابة النموذجية للتأكد'
        : '❌ إجابة قصيرة جداً',
      matchedKeywords: [],
      totalKeywords: 0
    };
  }

  // Check which keywords the student mentioned
  const matched = keywords.filter(kw => containsKeyword(normalizedStudent, kw));
  
  // Score calculation
  const ratio = matched.length / keywords.length;
  let score: number;
  let feedback: string;

  if (ratio >= 0.8) {
    score = 100;
    feedback = '✅ إجابة ممتازة! شملت معظم النقاط المطلوبة';
  } else if (ratio >= 0.6) {
    score = 80;
    feedback = '✅ إجابة جيدة جداً — فيه نقاط بسيطة ناقصة';
  } else if (ratio >= 0.4) {
    score = 60;
    feedback = '⚠️ إجابة مقبولة — محتاج تضيف تفاصيل أكتر';
  } else if (ratio >= 0.2) {
    score = 40;
    feedback = '⚠️ إجابة ناقصة — راجع الملخص وحاول تاني';
  } else if (ratio > 0) {
    score = 20;
    feedback = '❌ إجابة ضعيفة — محتاج مراجعة الدرس';
  } else {
    score = 0;
    feedback = '❌ الإجابة لا تحتوي على النقاط المطلوبة';
  }

  return { 
    score, 
    feedback,
    matchedKeywords: matched.filter(k => !k.includes(' ')).slice(0, 5), // Show top 5 single keywords
    totalKeywords: keywords.filter(k => !k.includes(' ')).length
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { essays } = body;
    
    // essays = [{ questionId, questionText, studentAnswer, correctAnswer }]
    if (!essays || !Array.isArray(essays) || essays.length === 0) {
      return NextResponse.json({ success: false, error: 'لا توجد أسئلة مقالية' }, { status: 400 });
    }

    const results = essays.map((essay: { 
      questionId: string; 
      questionText: string; 
      studentAnswer: string; 
      correctAnswer: string 
    }) => {
      const grading = gradeEssay(
        essay.studentAnswer || '', 
        essay.correctAnswer || '',
        essay.questionText || ''
      );
      
      return {
        questionId: essay.questionId,
        score: grading.score,
        feedback: grading.feedback,
        matchedKeywords: grading.matchedKeywords,
        totalKeywords: grading.totalKeywords,
        modelAnswer: essay.correctAnswer
      };
    });

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    console.error('Grade essay error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ في التصحيح' }, { status: 500 });
  }
}
