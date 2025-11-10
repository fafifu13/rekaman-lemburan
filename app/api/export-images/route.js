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

  // Header
  sheet.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama", key: "nama", width: 25 },
    { header: "Deskripsi", key: "desc", width: 30 },
    { header: "Tgl Mulai", key: "tglMulai", width: 12 },
    { header: "Jam Mulai", key: "jamMulai", width: 12 },
    { header: "Tgl Selesai", key: "tglSelesai", width: 12 },
    { header: "Jam Selesai", key: "jamSelesai", width: 12 },
    { header: "Total", key: "total", width: 15 },
    { header: "Foto Mulai", key: "fotoMulai", width: 20 },
    { header: "Foto Selesai", key: "fotoSelesai", width: 20 }
  ]

  // ✅ Header rata tengah + bold
  sheet.getRow(1).eachCell((cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.font = { bold: true }
  })

  // Loop data
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    const start = new Date(item.start_time)
    const end = new Date(item.end_time)

    const rowIndex = i + 2 // Row 1 = header

    // Add row
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

    // ✅ Row data rata tengah
    sheet.getRow(rowIndex).eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" }
    })

    // Foto MULAI
    const img1 = await fetchImage(item.proof_start_url)
    if (img1) {
      const id1 = workbook.addImage({
        buffer: img1,
        extension: 'png',
      })
      sheet.addImage(id1, {
        tl: { col: 8, row: rowIndex - 1 },
        ext: { width: 100, height: 100 }
      })
    }

    // Foto SELESAI
    const img2 = await fetchImage(item.proof_end_url)
    if (img2) {
      const id2 = workbook.addImage({
        buffer: img2,
        extension: 'png',
      })
      sheet.addImage(id2, {
        tl: { col: 9, row: rowIndex - 1 },
        ext: { width: 100, height: 100 }
      })
    }

    // Tinggi baris agar gambar pas
    sheet.getRow(rowIndex).height = 80
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
