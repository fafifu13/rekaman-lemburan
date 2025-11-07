import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import XLSX from 'xlsx';

export async function GET() {
  // Ambil semua data lembur dari Supabase
  const { data, error } = await supabase
    .from('overtime_records')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal mengambil data' });
  }

  // Convert data Supabase -> data untuk Excel
  const excelData = data.map((row, index) => ({
    No: index + 1,
    Nama: row.name,
    Deskripsi: row.description,
    "Tgl Mulai": new Date(row.start_time).toLocaleDateString("id-ID"),
    "Jam Mulai": new Date(row.start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    "Tgl Selesai": new Date(row.end_time).toLocaleDateString("id-ID"),
    "Jam Selesai": new Date(row.end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    Total: calculateDuration(row.start_time, row.end_time),
    "Link Mulai": row.proof_start_url,
    "Link Selesai": row.proof_end_url
  }));

  // Buat workbook Excel
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Lembur");

  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(excelBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Lembur.xlsx"`,
    },
  });
}

function calculateDuration(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMinutes = Math.floor((endDate - startDate) / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours === 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}
