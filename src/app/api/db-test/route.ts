import { createSupabaseServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Test basic connection
    const { count, error } = await supabase.from('shops').select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: error.message
      }, { status: 500 });
    }

    // Check if tables exist by trying to select from each
    const tables = ['shops', 'products', 'materials', 'finance_categories', 'categories'];
    const tableStatus: Record<string, boolean> = {};

    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('count', { count: 'exact', head: true });
        tableStatus[table] = !tableError;
      } catch {
        tableStatus[table] = false;
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      tables: tableStatus,
      shopCount: count || 0
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}