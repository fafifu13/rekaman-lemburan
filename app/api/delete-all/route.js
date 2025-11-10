import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function DELETE() {

  const { error } = await supabase
    .from('overtime_records')
    .delete()
    .neq('id', 0)   // hapus semua data

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: "Semua data berhasil dihapus" })
}
