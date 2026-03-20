import { useState, useEffect } from 'react'
import '../../styles/Dashboard.css'
import { auth } from '../../config/firebase'
import { getTeacherClasses, getClassById, updateClassSheetId } from '../../services/classService'
import { getClassAssignments } from '../../services/assignmentService'

function Grade() {
  const [classes, setClasses] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [sheetId, setSheetId] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (auth.currentUser) loadClasses()
  }, [])

  const loadClasses = async () => {
    const items = await getTeacherClasses(auth.currentUser.uid)
    setClasses(items)
    if (items.length > 0) {
      setSelectedClassId(items[0].id)
      loadClassSheet(items[0].id)
    }
  }

  const loadClassSheet = async (classId) => {
    const cls = await getClassById(classId)
    const s = cls?.sheetId || ''
    setSheetId(s)
    setEmbedUrl(s ? `https://docs.google.com/spreadsheets/d/${s}/htmlembed` : '')
  }

  const handleClassChange = (e) => {
    const id = e.target.value
    setSelectedClassId(id)
    loadClassSheet(id)
  }

  const handleSaveSheet = async () => {
    if (!selectedClassId) return setMessage({ type: 'error', text: 'Select a class first' })
    const res = await updateClassSheetId(selectedClassId, sheetId)
    if (res.success) {
      setMessage({ type: 'success', text: 'Sheet ID saved' })
      setEmbedUrl(sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed` : '')
    } else setMessage({ type: 'error', text: res.error || 'Failed to save' })
  }

  const handleExportToSheets = async () => {
    if (!selectedClassId) return setMessage({ type: 'error', text: 'Select a class first' })
    if (!sheetId) return setMessage({ type: 'error', text: 'Set a Google Sheet ID for this class first' })

    try {
      const assignments = await getClassAssignments(selectedClassId)

      // Build rows: [studentId, studentName, assignmentId, assignmentTitle, grade, timestamp]
      const rows = []
      for (const a of assignments) {
        const subs = a.submissions || []
        for (const s of subs) {
          rows.push([
            s.studentId || '',
            s.studentName || '',
            a.id || '',
            a.title || '',
            s.grade != null ? String(s.grade) : '',
            s.submittedAt ? (s.submittedAt.seconds ? new Date(s.submittedAt.seconds * 1000).toISOString() : String(s.submittedAt)) : ''
          ])
        }
      }

      if (rows.length === 0) return setMessage({ type: 'info', text: 'No submission rows to export' })

      const apiUrl = import.meta.env.VITE_SHEETS_API_URL || 'http://localhost:4000'
      const resp = await fetch(`${apiUrl}/append-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId, range: 'Sheet1!A:F', values: rows[0] })
      })

      if (!resp.ok) throw new Error('Failed to append')
      setMessage({ type: 'success', text: 'Exported first row to sheet (demo). Use backend batching for full export.' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Grades</h1>
        <p className="page-subtitle">Manage student grades and Google Sheets export</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8 }}>Select Class:</label>
        <select value={selectedClassId} onChange={handleClassChange}>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name} • {c.grade}-{c.section}</option>)}
        </select>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Google Sheet Integration</h3>
        <p>Provide the Google Sheet ID for this class. Teachers should share the sheet with the service account or publish it to the web for embedding.</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enter Google Sheet ID"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn" onClick={handleSaveSheet}>Save</button>
          <button className="btn" onClick={handleExportToSheets}>Export to Google Sheets</button>
        </div>
        {message && (
          <div style={{ marginTop: 8, color: message.type === 'error' ? 'red' : 'green' }}>{message.text}</div>
        )}
      </div>

      <div className="card">
        <h3>Embedded Sheet Preview</h3>
        {embedUrl ? (
          <iframe title="class-sheet" src={embedUrl} style={{ width: '100%', height: 600, border: '1px solid #ddd' }} />
        ) : (
          <p>No sheet configured. Save a Google Sheet ID to preview it here.</p>
        )}
      </div>
    </div>
  )
}

export default Grade
