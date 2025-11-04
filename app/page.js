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
      setFormData({ description: '', startTime: '', endTime: '', proofStart: null, proofEnd: null })
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
    csvContent += "No,Nama,Deskripsi,Tgl Mulai,Jam Mulai,Tgl Selesai,Jam Selesai,Total,Link Mulai,Link Selesai\n"
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
        const { error } = await supabase.from('overtime_records').delete().gte('id', 0)
        if (error) throw error
        await loadData()
        alert('Semua data berhasil dihapus!')
      } catch (error) {
        alert('Gagal menghapus data: ' + error.message)
      }
    }
  }

  const viewPreview = (data) => {
    setPreviewData(data)
    setShowPreview(true)
  }

  const duration = calculateDuration(formData.startTime, formData.endTime)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto pb-20">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sistem Lemburan Bulanan</h1>
            <div className="flex gap-2">
              {!isAdmin ? (
                <button onClick={() => setShowAdminLogin(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm">Admin</button>
              ) : (
                <>
                  <button onClick={() => setShowPreview(true)} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">Preview</button>
                  <button onClick={downloadExcel} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">Download</button>
                  <button onClick={clearAllData} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">Hapus</button>
                  <button onClick={() => setIsAdmin(false)} className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm">Logout</button>
                </>
              )}
            </div>
          </div>
        </div>

        {showAdminLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-80">
              <h2 className="text-xl font-bold mb-4">Login Admin</h2>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Masukkan password" className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4" onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()} />
              <div className="flex gap-2">
                <button onClick={handleAdminLogin} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Login</button>
                <button onClick={() => { setShowAdminLogin(false); setAdminPassword('') }} className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Batal</button>
              </div>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl p-6 w-full max-w-6xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Preview Data Lembur</h2>
                <button onClick={() => setShowPreview(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Tutup</button>
              </div>
              
              {overtimeData.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Belum ada data lembur</p>
              ) : (
                <div className="space-y-4">
                  {overtimeData.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:shadow-lg transition">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                          <p className="text-sm text-gray-500">#{idx + 1}</p>
                        </div>
                        <button onClick={() => viewPreview(item)} className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">Detail</button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600 font-semibold">Deskripsi:</p>
                          <p className="text-gray-800">{item.description}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-semibold">Total Waktu:</p>
                          <p className="text-indigo-600 font-bold">{calculateDuration(item.start_time, item.end_time)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-semibold">Mulai:</p>
                          <p className="text-gray-800">{new Date(item.start_time).toLocaleString('id-ID')}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 font-semibold">Selesai:</p>
                          <p className="text-gray-800">{new Date(item.end_time).toLocaleString('id-ID')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Bukti Mulai:</p>
                          <img src={item.proof_start_url} alt="Bukti Mulai" className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => window.open(item.proof_start_url, '_blank')} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Bukti Selesai:</p>
                          <img src={item.proof_end_url} alt="Bukti Selesai" className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80" onClick={() => window.open(item.proof_end_url, '_blank')} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {previewData && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{previewData.name}</h2>
                <button onClick={() => setPreviewData(null)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Tutup</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-gray-700">Deskripsi Pekerjaan:</p>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">{previewData.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-gray-700">Jam Mulai:</p>
                    <p className="text-gray-800">{new Date(previewData.start_time).toLocaleString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Jam Selesai:</p>
                    <p className="text-gray-800">{new Date(previewData.end_time).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="bg-indigo-50 p-3 rounded">
                  <p className="font-bold text-indigo-700 text-center text-lg">
                    Total: {calculateDuration(previewData.start_time, previewData.end_time)}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-gray-700 mb-2">Bukti Jam Mulai:</p>
                  <img src={previewData.proof_start_url} alt="Bukti Mulai" className="w-full rounded-lg shadow-lg cursor-pointer" onClick={() => window.open(previewData.proof_start_url, '_blank')} />
                </div>

                <div>
                  <p className="font-semibold text-gray-700 mb-2">Bukti Jam Selesai:</p>
                  <img src={previewData.proof_end_url} alt="Bukti Selesai" className="w-full rounded-lg shadow-lg cursor-pointer" onClick={() => window.open(previewData.proof_end_url, '_blank')} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Nama Karyawan</label>
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-lg">
            <option value="">-- Pilih Nama --</option>
            {employees.map((emp, idx) => (<option key={idx} value={emp}>{emp}</option>))}
          </select>
        </div>

        {selectedEmployee && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">{selectedEmployee}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Alasan/Deskripsi Pekerjaan Lembur</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg" rows="3" placeholder="Jelaskan pekerjaan lembur..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Tanggal & Jam Mulai</label>
                  <input type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Tanggal & Jam Selesai</label>
                  <input type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                </div>
              </div>
              {duration && (<div className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg text-center font-bold">Total Waktu Lembur: {duration}</div>)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Bukti Jam Mulai</label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center" onDrop={(e) => handleDrop(e, 'proofStart')} onDragOver={(e) => e.preventDefault()} onPaste={(e) => handlePaste(e, 'proofStart')} tabIndex={0}>
                    <p className="text-sm mb-2">Drag, paste, atau klik</p>
                    <input type="file" id="proof-start" onChange={(e) => handleFileChange(e, 'proofStart')} accept="image/*" className="hidden" />
                    <label htmlFor="proof-start" className="px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer inline-block">Pilih File</label>
                    {formData.proofStart && (<p className="mt-2 text-green-600 text-sm">✓ {formData.proofStart.name}</p>)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Bukti Jam Selesai</label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center" onDrop={(e) => handleDrop(e, 'proofEnd')} onDragOver={(e) => e.preventDefault()} onPaste={(e) => handlePaste(e, 'proofEnd')} tabIndex={0}>
                    <p className="text-sm mb-2">Drag, paste, atau klik</p>
                    <input type="file" id="proof-end" onChange={(e) => handleFileChange(e, 'proofEnd')} accept="image/*" className="hidden" />
                    <label htmlFor="proof-end" className="px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer inline-block">Pilih File</label>
                    {formData.proofEnd && (<p className="mt-2 text-green-600 text-sm">✓ {formData.proofEnd.name}</p>)}
                  </div>
                </div>
              </div>
              <button onClick={handleSaveOvertime} disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400">{loading ? 'Menyimpan...' : 'Simpan Lembur'}</button>
            </div>
          </div>
        )}
      </div>
      <footer className="fixed bottom-0 left-0 right-0 bg-indigo-700 text-white py-4"><p className="text-center font-semibold">KJPP AMANAH</p></footer>
    </div>
  )
}
