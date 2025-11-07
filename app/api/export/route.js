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

  const rows = data.map((d) => ({
    "Nama Karyawan": d.nama,
    "Alasan Lembur": d.alasan,
    "Tanggal": d.tanggal,
    "Jam Mulai": d.jam_mulai,
    "Jam Selesai": d.jam_selesai,
    "Foto (Klik Link)": d.foto_url,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const colWidths = [];
  const keys = Object.keys(rows[0] || {});
  keys.forEach((key) => {
    let max = key.length;
    rows.forEach((r) => {
      const val = r[key] ? String(r[key]) : "";
      if (val.length > max) max = val.length;
    });
    colWidths.push({ wch: max + 2 });
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Lemburan");

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=lemburan.xlsx",
    },
  });
}
