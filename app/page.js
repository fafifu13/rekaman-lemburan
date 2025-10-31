'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function OvertimeTracker() {
  const employees = [
    "Luthfi Nur Fadhilah",
    "Melita Sulistyaningtyas",
    "Nur Ibnu Fadhilah",
    "Salsabila Zahra S",
    "Mintoko Yusuf M",
    "Ahmad Dennis Faza K",
    "Sakhaa' De Sela 'Aisy",
    "Nafisa Ischabita",
    "Rekno Widianingsih"
  ]

  const [overtimeData, setOvertimeData] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    startTime: '',
    endTime: '',
    proofStart: null,
    proofEnd: null
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('overtime_records')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setOvertimeData(data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const calculateDuration = (start, end) => {
    if (!start || !end) return ''
    
    const startDate = new Date(start)
    const endDate = new Date(end)
    let totalMinutes = Math.floor((endDate - startDate) / (1000 * 60))
    
    if (totalMinutes < 0) return 'Waktu tidak valid'
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    if (hours === 0) return `${minutes} menit`
    if (minutes === 0) return `${hours} jam`
    return `${hours} jam ${minutes} menit`
  }

  const uploadImage = async (file, fileName) => {
    try {
      const { data, error } = await supabase.storage
        .from('overtime-proofs')
        .upload(`${Date.now()}_${fileName}`, file)
      
      if (error) throw error
      
      const { data: urlData } = supabase.storage
        .from('overtime-proofs')
        .getPublicUrl(data.path)
      
      return urlData.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  const handleFileChange = (e, proofType) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setFormData({ ...formData, [proofType]: file })
    } else if (file) {
      alert('Hanya file gambar yang diperbolehkan!')
    }
  }

  const handleDrop = (e, proofType) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setFormData({ ...formData, [proofType]: file })
    }
  }

  const handlePaste = (e, proofType) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          setFormData({ ...formData, [proofType]: file })
        }
        break
      }
    }
  }

  const handleSaveOvertime = async () => {
    if (!selectedEmployee) {
      alert('Pilih nama karyawan terlebih dahulu!')
      return
    }

    if (!formData.description || !formData.startTime || !formData.endTime || !formData.proofStart || !formData.proofEnd) {
      alert('Harap lengkapi semua data sebelum menyimpan!')
      return
    }

    setLoading(true)

    try {
      const proofStartUrl = await uploadImage(formData.proofStart, 'proof_start.jpg')
      const proofEndUrl = await uploadImage(formData.proofEnd, 'proof_end.jpg')

      const { error } = await supabase
        .from('overtime_records')
        .insert([{
          name: selectedEmployee,
          description: formData.description,
          start_time: formData.startTime,
          end_time: formData.endTime,
          proof_start_url: proofStartUrl,
          proof_end_url: proofEndUrl
        }])

      if (error) throw error

      alert('Data lembur berhasil disimpan!')
      setFormData({
        description: '',
        startTime: '',
        endTime: '',
        proofStart: null,
        proofEnd: null
      })
      await loadData()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Gagal menyimpan data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdmin(true)
      setShowAdminLogin(false)
      setAdminPassword('')
    } else {
      alert('Password salah!')
    }
  }

  const downloadExcel = () => {
    let csvContent = "\uFEFF"
    csvContent += "No,Nama,Alasan/Deskripsi,Tanggal Mulai,Jam Mulai,Tanggal Selesai,Jam Selesai,Total Waktu,Link Bukti Mulai,Link Bukti Selesai\n"
    
    overtimeData.forEach((item, index) => {
      const duration = calculateDuration(item.start_time, item.end_time)
      const startDate = new Date(item.start_time)
      const endDate = new Date(item.end_time)
      
      const row = [
        index + 1,
        `"${item.name}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${startDate.toLocaleDateString('id-ID')}"`,
        `"${startDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}"`,
        `"${endDate.toLocaleDateString('id-ID')}"`,
        `"${endDate.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}"`,
        `"${duration}"`,
        `"${item.proof_start_url}"`,
        `"${item.proof_end_url}"`
      ].join(',')
      
      csvContent += row + "\n"
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Lemburan_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`
    link.click()
  }

  const clearAllData = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua data lembur?')) {
      try {
        const { error } = await supabase
          .from('overtime_records')
          .delete()
          .gte('id', 0)
        
        if (error) throw error
        await loadData()
        alert('Semua data berhasil dihapus!')
      } catch (error) {
        alert('Gagal menghapus data: ' + error.message)
      }
    }
  }

  const duration = calculateDuration(formData.startTime, formData.endTime)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pb-20">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">⏰ Sistem Lemburan Bulanan</h1>
            <div className="flex gap-2">
              {!isAdmin ? (
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  👤 Admin
                </button>
              ) : (
                <>
                  <button
                    onClick={downloadExcel}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    📥 Download
                  </button>
                  <button
                    onClick={clearAllData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    🗑️ Hapus
                  </button>
                  <button
                    onClick={() => setIsAdmin(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {showAdminLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-80">
              <h2 className="text-xl font-bold mb-4">Login Admin</h2>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setShowAdminLogin(false)
                    setAdminPassword('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Nama Karyawan</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmpl
