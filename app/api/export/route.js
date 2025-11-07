import { NextResponse } from "next/server";
import XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase
    .from("lemburan")
    .select("*")
    .order("tanggal", { ascending: true });

  if (error) return NextResponse.json({ error: error.message });

  // Format data agar rapi
  const rows = data.map((d, i) => ({
    "No": i + 1,
    "Nama Karyawan": d.nama,
    "Alasan": d.alasan,
    "Tanggal Mulai": d.tanggal,
    "Jam Mulai": d.jam_mulai,
    "Tanggal Selesai": d.tanggal_selesai,
    "Jam Selesai": d.jam_selesai,
    "Durasi": d.durasi,
    "Foto (Klik Link)": d.foto_url,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto lebar kolom
  const widths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => (r[key] ? r[key].toString().length : 0))
    ) + 2
  }));

  worksheet["!cols"] = widths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Lemburan");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=lemburan.xlsx",
    },
  });
}
