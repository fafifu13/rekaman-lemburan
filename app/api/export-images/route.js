export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { supabase } from '../../../lib/supabase'

// Download file dari Supabase Storage
async function fetchImage(url) {
  try {
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    return Buffer.from(buffer)
  } catch (err) {
    return null
  }
}

export async function GET() {
  // Ambil data
  const { data, error } = await supabase
    .from('overtime_records')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Buat workbook Excel
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Lembur')

  // Header kolom
  sheet.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama", key: "nama", width: 25 },
    { header: "Deskripsi", key: "desc", width: 30 },
    { header: "Tgl Mulai", key: "tglMulai", width: 12 },
    { header: "Jam Mulai", key: "jamMulai", width: 12 },
    { header: "Tgl Selesai", key: "tglSelesai", width: 12 },
    { header: "Jam Selesai", key: "jamSelesai", width: 12 },
    { header: "Total", key: "total", width: 15 },
    { header: "Foto Mulai", key: "fotoMulai", width: 18 },
    { header: "Foto Selesai", key: "fotoSelesai", width: 18 }
  ]

  // Header rata tengah + bold
  sheet.getRow(1).eachCell((cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.font = { bold: true }
  })

  // Loop data
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const start = new Date(item.start_time)
    const end = new Date(item.end_time)

    const rowIndex = i + 2 // row 1 = header

    // Tambah row data
    sheet.addRow({
      no: i + 1,
      nama: item.name,
      desc: item.description,
      tglMulai: start.toLocaleDateString('id-ID'),
      jamMulai: start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tglSelesai: end.toLocaleDateString('id-ID'),
      jamSelesai: end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      total: getDuration(item.start_time, item.end_time)
    })

    // Row rata tengah
    sheet.getRow(rowIndex).eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" }
    })

    // ---- ✅ Ukuran foto yang pas ----
    const maxWidth = 90
    const maxHeight = 90

    // FOTO MULAI
    const imgStart = await fetchImage(item.proof_start_url)
    if (imgStart) {
      const idStart = workbook.addImage({
        buffer: imgStart,
        extension: 'png'
      })
      sheet.addImage(idStart, {
        tl: { col: 8, row: rowIndex - 1 },
        ext: { width: maxWidth, height: maxHeight }
      })
    }

    // FOTO SELESAI
    const imgEnd = await fetchImage(item.proof_end_url)
    if (imgEnd) {
      const idEnd = workbook.addImage({
        buffer: imgEnd,
        extension: 'png'
      })
      sheet.addImage(idEnd, {
        tl: { col: 9, row: rowIndex - 1 },
        ext: { width: maxWidth, height: maxHeight }
      })
    }

    // ✅ Tinggi baris agar gambar pas di tengah dan tidak melewati kolom
    sheet.getRow(rowIndex).height = 85
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="Lembur_Dengan_Gambar.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  })
}

// Hitung durasi
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
