export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'

export async function GET() {
  // Ambil data dari Supabase
  const { data, error } = await supabase
    .from('overtime_records')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Konversi data ke format XLSX
  const rows = data.map((item, index) => {
    const start = new Date(item.start_time)
    const end = new Date(item.end_time)

    return {
      No: index + 1,
      Nama: item.name,
      Deskripsi: item.description,
      "Tgl Mulai": start.toLocaleDateString('id-ID'),
      "Jam Mulai": start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      "Tgl Selesai": end.toLocaleDateString('id-ID'),
      "Jam Selesai": end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      Total: getDuration(item.start_time, item.end_time),
      "Link Mulai": item.proof_start_url,
      "Link Selesai": item.proof_end_url
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)

  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 40 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 50 },
    { wch: 50 }
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Lembur')

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(excelBuffer, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="Lembur.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  })
}

function getDuration(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.floor((e - s) / 60000)
  const hours = Math.floor(diff / 60)
  const minutes = diff % 60

  if (hours === 0) return `${minutes} menit`
  if (minutes === 0) return `${hours} jam`
  return `${hours} jam ${minutes} menit`
}
