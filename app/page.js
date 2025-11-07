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
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
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
      const fileExt = file.name.split('.').pop()
      const filePath = `${Date.now()}_${fileName}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('overtime-proofs')
        .upload(filePath, file)
      
      if (uploadError) throw uploadError
      
      const { data } = supabase.storage
        .from('overtime-proofs')
        .getPublicUrl(filePath)
      
      return data.publicUrl
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
      const proofStartUrl = await uploadImage(formData.proofStart, 'start')
      const proofEndUrl = await uploadImage(formData.proofEnd, 'end')
      const { error } = await supabase.from('overtime_records').insert([{
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
      setShowPreview(true)
    } else {
      alert('Password salah!')
    }
  }

  const deleteOvertimeRecord = async (id, name) => {
    if (!window.confirm(`Hapus data lembur untuk ${name}?\n\nData yang dihapus tidak dapat dikembalikan!`)) {
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('overtime_records')
        .delete()
        .match({ id: id })
        .select()
      
      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      setOvertimeData(prevData => prevData.filter(item => item.id !== id))
      await loadData()
      
      alert('Data berhasil dihapus!')
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Gagal menghapus data: ' + error.message)
      await loadData()
    } finally {
      setLoading(false)
    }
  }

  const downloadExcel = () => {
    let csvContent = "\uFEFF"
    csvContent += "No,Nama,Deskripsi,Tgl Mulai,Jam Mulai,Tgl Selesai,Jam Selesai,Total,Link Mulai,Link Selesai\n"
    
    filteredData.forEach((item, index) => {
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
    let fileName = 'Lemburan'
    if (filterEmployee) fileName += `_${filterEmployee}`
    if (filterMonth && filterYear) fileName += `_${filterMonth}-${filterYear}`
    fileName += `_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`
    link.download = fileName
    link.click()
  }

  const viewPreview = (data) => {
    setPreviewData(data)
  }

  const getAvailableMonths = () => {
    const months = new Set()
    overtimeData.forEach(item => {
      const date = new Date(item.created_at)
      months.add(date.getMonth() + 1)
    })
    return Array.from(months).sort((a, b) => a - b)
  }

  const getAvailableYears = () => {
    const years = new Set()
    overtimeData.forEach(item => {
      const date = new Date(item.created_at)
      years.add(date.getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const filteredData = overtimeData.filter(item => {
    const itemDate = new Date(item.created_at)
    const itemMonth = itemDate.getMonth() + 1
    const itemYear = itemDate.getFullYear()
    
    const matchesEmployee = !filterEmployee || item.name === filterEmployee
    const matchesMonth = !filterMonth || itemMonth === parseInt(filterMonth)
    const matchesYear = !filterYear || itemYear === parseInt(filterYear)
    
    return matchesEmployee && matchesMonth && matchesYear
  })

  const duration = calculateDuration(formData.startTime, formData.endTime)

  // Jika admin, tampilkan halaman admin
  if (isAdmin && showPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 through-blue-300 to-yellow-300 p-4 animate-gradient">
        <style>{`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 15s ease infinite;
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .fade-in-up {
            animation: fadeInUp 0.6s ease-out;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          .pulse-slow {
            animation: pulse 2s ease-in-out infinite;
          }
        `}</style>
        <div className="max-w-6xl mx-auto pb-20">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6 fade-in-up border border-white/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">📊 Dashboard Admin - Data Lembur</h1>
                <p className="text-sm text-gray-600 mt-1">Kelola dan pantau data lembur karyawan</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadExcel} className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all text-sm font-semibold">📥 Download</button>
                <button onClick={() => { setIsAdmin(false); setShowPreview(false) }} className="px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all text-sm font-semibold">🚪 Logout</button>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 fade-in-up border border-white/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🔍</span>
              Filter Data
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Nama Karyawan:</label>
                <select 
                  value={filterEmployee} 
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="">-- Semua Karyawan --</option>
                  {employees.map((emp, idx) => (
                    <option key={idx} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Bulan:</label>
                <select 
                  value={filterMonth} 
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="">-- Semua Bulan --</option>
                  {getAvailableMonths().map(month => (
                    <option key={month} value={month}>{monthNames[month - 1]}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Tahun:</label>
                <select 
                  value={filterYear} 
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="">-- Semua Tahun --</option>
                  {getAvailableYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {(filterEmployee || filterMonth || filterYear) && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800 font-semibold">
                  <strong>📋 Menampilkan:</strong> {filteredData.length} data
                  {filterEmployee && ` - ${filterEmployee}`}
                  {filterMonth && ` - ${monthNames[parseInt(filterMonth) - 1]}`}
                  {filterYear && ` ${filterYear}`}
                </p>
              </div>
            )}
          </div>

          {filteredData.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-12 text-center fade-in-up border border-white/20">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 text-lg font-semibold">Belum ada data lembur yang sesuai dengan filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredData.map((item) => (
                <div key={item.id} className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:shadow-2xl transform hover:scale-[1.01] transition-all border border-white/20 fade-in-up">
                  <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{item.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <span>📅</span>
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => viewPreview(item)} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-xl hover:shadow-lg transform hover:scale-105 transition-all font-semibold">📋 Detail</button>
                      <button onClick={() => deleteOvertimeRecord(item.id, item.name)} disabled={loading} className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm rounded-xl hover:shadow-lg transform hover:scale-105 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">🗑️ Hapus</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-gray-600 font-bold mb-1">📝 Deskripsi:</p>
                      <p className="text-gray-800">{item.description}</p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl">
                      <p className="text-gray-600 font-bold mb-1">⏱️ Total Waktu:</p>
                      <p className="text-indigo-600 font-bold text-lg">{calculateDuration(item.start_time, item.end_time)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-gray-600 font-bold mb-1">🕐 Mulai:</p>
                      <p className="text-gray-800">{new Date(item.start_time).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-gray-600 font-bold mb-1">🕐 Selesai:</p>
                      <p className="text-gray-800">{new Date(item.end_time).toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-2 font-bold flex items-center gap-1">
                        <span>📸</span>
                        Bukti Jam Mulai:
                      </p>
                      <img src={item.proof_start_url} alt="Bukti Mulai" className="w-full h-40 object-cover rounded-xl border-2 border-gray-200 cursor-pointer hover:opacity-80 hover:scale-105 transition-all shadow-md" onClick={() => window.open(item.proof_start_url, '_blank')} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-2 font-bold flex items-center gap-1">
                        <span>📸</span>
                        Bukti Jam Selesai:
                      </p>
                      <img src={item.proof_end_url} alt="Bukti Selesai" className="w-full h-40 object-cover rounded-xl border-2 border-gray-200 cursor-pointer hover:opacity-80 hover:scale-105 transition-all shadow-md" onClick={() => window.open(item.proof_end_url, '_blank')} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {previewData && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in-up">
              <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{previewData.name}</h2>
                  <button onClick={() => setPreviewData(null)} className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all font-semibold">✕ Tutup</button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span>📝</span>
                      Deskripsi Pekerjaan:
                    </p>
                    <p className="text-gray-800">{previewData.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="font-bold text-gray-700 mb-2">🕐 Jam Mulai:</p>
                      <p className="text-gray-800">{new Date(previewData.start_time).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl">
                      <p className="font-bold text-gray-700 mb-2">🕐 Jam Selesai:</p>
                      <p className="text-gray-800">{new Date(previewData.end_time).toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 rounded-xl pulse-slow">
                    <p className="font-bold text-white text-center text-lg">
                      ⏱️ Total: {calculateDuration(previewData.start_time, previewData.end_time)}
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span>📸</span>
                      Bukti Jam Mulai:
                    </p>
                    <img src={previewData.proof_start_url} alt="Bukti Mulai" className="w-full rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(previewData.proof_start_url, '_blank')} />
                  </div>

                  <div>
                    <p className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span>📸</span>
                      Bukti Jam Selesai:
                    </p>
                    <img src={previewData.proof_end_url} alt="Bukti Selesai" className="w-full rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => window.open(previewData.proof_end_url, '_blank')} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 shadow-lg">
          <p className="text-center font-bold text-lg">✨ KJPP AMANAH ✨</p>
        </footer>
      </div>
    )
  }

  // Halaman untuk karyawan (non-admin)
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 animate-gradient">
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 15s ease infinite;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
      <div className="max-w-4xl mx-auto pb-20">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6 fade-in-up border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                ⏰ Sistem Lemburan Bulanan
              </h1>
              <p className="text-sm text-gray-600 mt-1">Catat jam lembur dengan mudah dan cepat</p>
            </div>
            <button onClick={() => setShowAdminLogin(true)} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 text-sm font-semibold float">
              🔐 Admin
            </button>
          </div>
        </div>

        {showAdminLogin && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 fade-in-up">
            <div className="bg-white rounded-2xl p-8 w-80 shadow-2xl transform scale-100 transition-transform">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Login Admin</h2>
              </div>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Masukkan password" className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-4 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()} />
              <div className="flex gap-3">
                <button onClick={handleAdminLogin} className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transform hover:scale-105 transition-all font-semibold">Login</button>
                <button onClick={() => { setShowAdminLogin(false); setAdminPassword('') }} className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold">Batal</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-4 fade-in-up border border-white/20 transform hover:scale-[1.02] transition-all duration-300">
          <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-xl">👤</span>
            Pilih Nama Karyawan
          </label>
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-all cursor-pointer hover:border-indigo-400">
            <option value="">-- Pilih Nama --</option>
            {employees.map((emp, idx) => (<option key={idx} value={emp}>{emp}</option>))}
          </select>
        </div>

        {selectedEmployee && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20 fade-in-up">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <span className="text-2xl">✨</span>
              {selectedEmployee}
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                  <span>📝</span>
                  Alasan/Deskripsi Pekerjaan Lembur
                </label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" rows="3" placeholder="Jelaskan pekerjaan lembur..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <span>🕐</span>
                    Tanggal & Jam Mulai
                  </label>
                  <input type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <span>🕐</span>
                    Tanggal & Jam Selesai
                  </label>
                  <input type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
                </div>
              </div>
              {duration && (<div className="px-4 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-center font-bold text-lg shadow-lg pulse-slow">⏱️ Total Waktu Lembur: {duration}</div>)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <span>📸</span>
                    Bukti Jam Mulai
                  </label>
                  <div className="border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer" onDrop={(e) => handleDrop(e, 'proofStart')} onDragOver={(e) => e.preventDefault()} onPaste={(e) => handlePaste(e, 'proofStart')} tabIndex={0}>
                    <p className="text-sm mb-3 text-gray-600">📤 Drag, paste, atau klik</p>
                    <input type="file" id="proof-start" onChange={(e) => handleFileChange(e, 'proofStart')} accept="image/*" className="hidden" />
                    <label htmlFor="proof-start" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl cursor-pointer inline-block hover:shadow-lg transform hover:scale-105 transition-all font-semibold">Pilih File</label>
                    {formData.proofStart && (<p className="mt-3 text-green-600 text-sm font-semibold">✓ {formData.proofStart.name}</p>)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <span>📸</span>
                    Bukti Jam Selesai
                  </label>
                  <div className="border-2 border-dashed border-indigo-300 rounded-xl p-6 text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer" onDrop={(e) => handleDrop(e, 'proofEnd')} onDragOver={(e) => e.preventDefault()} onPaste={(e) => handlePaste(e, 'proofEnd')} tabIndex={0}>
                    <p className="text-sm mb-3 text-gray-600">📤 Drag, paste, atau klik</p>
                    <input type="file" id="proof-end" onChange={(e) => handleFileChange(e, 'proofEnd')} accept="image/*" className="hidden" />
                    <label htmlFor="proof-end" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl cursor-pointer inline-block hover:shadow-lg transform hover:scale-105 transition-all font-semibold">Pilih File</label>
                    {formData.proofEnd && (<p className="mt-3 text-green-600 text-sm font-semibold">✓ {formData.proofEnd.name}</p>)}
                  </div>
                </div>
              </div>
              <button onClick={handleSaveOvertime} disabled={loading} className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">{loading ? '⏳ Menyimpan...' : '💾 Simpan Lembur'}</button>
            </div>
          </div>
        )}
      </div>
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 shadow-lg">
        <p className="text-center font-bold text-lg">✨ KJPP AMANAH ✨</p>
      </footer>
    </div>
  )
}
