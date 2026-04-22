// app/api/download/route.ts — PDF download with watermark
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/infrastructure/supabase/server';
import { getAuthUser } from '@/lib/auth';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    const user = authResult.data;

    const body = await request.json();
    const { contentType, contentId } = body;

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'نوع المحتوى ومعرفه مطلوبان' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Fetch content based on type
    let contentText = '';
    let title = '';

    if (contentType === 'summary') {
      const { data } = await supabase
        .from('summaries')
        .select('content_ar, lesson_id')
        .eq('id', contentId)
        .single();

      if (!data) {
        return NextResponse.json({ error: 'الملخص غير موجود' }, { status: 404 });
      }
      contentText = typeof data.content_ar === 'string'
        ? data.content_ar
        : JSON.stringify(data.content_ar, null, 2);

      const { data: lesson } = await supabase
        .from('lessons')
        .select('title_ar')
        .eq('id', data.lesson_id)
        .single();
      title = lesson?.title_ar || 'ملخص';
    } else if (contentType === 'questions') {
      const { data: questions } = await supabase
        .from('questions')
        .select('question_ar, type, options, correct_answer, difficulty')
        .eq('lesson_id', contentId)
        .eq('is_published', true);

      if (!questions || questions.length === 0) {
        return NextResponse.json({ error: 'لا توجد أسئلة' }, { status: 404 });
      }

      const { data: lesson } = await supabase
        .from('lessons')
        .select('title_ar')
        .eq('id', contentId)
        .single();
      title = lesson?.title_ar || 'أسئلة';

      contentText = questions
        .map(
          (q, i) =>
            `${i + 1}. ${q.question_ar}\n${
              q.options && Array.isArray(q.options)
                ? q.options.map((o: string, j: number) => `   ${String.fromCharCode(1571 + j)}) ${o}`).join('\n')
                : ''
            }\n`
        )
        .join('\n');
    } else {
      return NextResponse.json({ error: 'نوع المحتوى غير مدعوم' }, { status: 400 });
    }

    // Log download
    await supabase.from('download_logs').insert({
      user_id: user.id,
      content_type: contentType,
      content_id: contentId,
      created_at: new Date().toISOString(),
    });

    // Generate PDF with watermark
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pageWidth = 595;
    const pageHeight = 842;

    // Split content into pages
    const lines = contentText.split('\n');
    const linesPerPage = 40;

    for (let i = 0; i < lines.length; i += linesPerPage) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      const pageLines = lines.slice(i, i + linesPerPage);

      // Add text content
      let y = pageHeight - 60;
      for (const line of pageLines) {
        page.drawText(line.substring(0, 80), {
          x: 50,
          y,
          size: 11,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 18;
      }

      // Add watermark (diagonal, semi-transparent)
      const watermarkText = `${user.fullName} - ${user.phone} - Manhaj AI`;
      page.drawText(watermarkText, {
        x: pageWidth / 2 - 150,
        y: pageHeight / 2,
        size: 48,
        font,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.15,
        rotate: degrees(45),
      });
    }

    // If no lines, add at least one page
    if (lines.length === 0) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawText('No content', { x: 50, y: pageHeight - 60, size: 14, font });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[Download] Unexpected error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
