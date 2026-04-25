import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.rpc('get_content_job', { p_job_id: jobId });

    if (error) {
      console.error('[ContentStatus] RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = data[0];
    return NextResponse.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.progress_message,
      totalPages: job.total_pages,
      totalChunks: job.total_chunks,
      processedChunks: job.processed_chunks,
      questionsCount: job.questions_count,
      error: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    });
  } catch (err: any) {
    console.error('[ContentStatus] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
