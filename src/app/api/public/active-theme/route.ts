import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await sb
      .from('themes')
      .select('slug, name_ar')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ slug: 'default', name: 'الأساسي' });
    }

    return NextResponse.json({ slug: data.slug, name: data.name_ar });
  } catch {
    return NextResponse.json({ slug: 'default', name: 'الأساسي' });
  }
}
