import { useState, useEffect, useRef, useCallback } from 'react'
import { auth } from '../../config/firebase'
import { getTeacherClasses } from '../../services/classService'
import Notification from '../../components/Notification'
import '../../styles/Assignment.css'

const SHEETS_API = '/sheets-api'

function colLetter(idx) {
  let l = '', n = idx + 1
  while (n > 0) { l = String.fromCharCode(65 + (n - 1) % 26) + l; n = Math.floor((n - 1) / 26) }
  return l
}

async function sheetsGet(url) {
  const res = await fetch(url)
  const text = await res.text()
  try { return JSON.parse(text) } catch { throw new Error(text.slice(0, 120)) }
}

async function sheetsPut(url, body) {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const text = await res.text()
  try { return JSON.parse(text) } catch { throw new Error(text.slice(0, 120)) }
}

// ── Inline Sheet Viewer/Editor ───────────────────────────────────────────────
function SheetViewer({ classItem, onClose }) {
  const [tableData, setTableData] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [notification, setNotification] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { loadSheet() }, [])
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const loadSheet = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await sheetsGet(`${SHEETS_API}/read-grades?sheetId=${classItem.sheetId}`)
      setTableData(data.values || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const commitEdit = useCallback(async () => {
    if (!editing) return
    const { row, col } = editing
    const original = (tableData[row] || [])[col] ?? ''
    setEditing(null)
    if (editVal === original) return

    const range = `Sheet1!${colLetter(col)}${row + 1}`
    setSaving(true)
    try {
      await sheetsPut(`${SHEETS_API}/update-cell`, { sheetId: classItem.sheetId, range, value: editVal })
      setTableData(prev => {
        const next = prev.map(r => [...r])
        if (!next[row]) next[row] = []
        next[row][col] = editVal
        return next
      })
      setNotification({ message: 'Cell saved to Google Sheet', type: 'success' })
    } catch (e) {
      setNotification({ message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }, [editing, editVal, tableData, classItem.sheetId])

  const headers = tableData[0] || []
  const rows = tableData.slice(1)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 1100, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📊 {classItem.name} — Grade Sheet</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {rows.length} students · Double-click any cell to edit
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {saving && <span style={{ fontSize: 12, color: '#6b7280' }}>Saving…</span>}
            <button onClick={loadSheet} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>↻ Refresh</button>
            <a href={`https://docs.google.com/spreadsheets/d/${classItem.sheetId}/edit`} target="_blank" rel="noreferrer"
              style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13, textDecoration: 'none', color: '#111' }}>
              Open in Sheets ↗
            </a>
            <button onClick={onClose} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: '#dc2626' }}>✕ Close</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#6b7280' }}>Loading sheet data…</div>
          )}
          {error && (
            <div style={{ padding: 20, color: '#dc2626', background: '#fee2e2', margin: 16, borderRadius: 8 }}>
              <strong>Error:</strong> {error}
              {error.includes('403') || error.includes('permission') ? (
                <p style={{ margin: '8px 0 0' }}>Make sure the Google Sheet is shared with the service account email.</p>
              ) : null}
            </div>
          )}
          {!loading && !error && tableData.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ background: '#f9fafb', color: '#9ca3af', padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', borderRight: '1px solid #e5e7eb', width: 40, position: 'sticky', top: 0, zIndex: 1 }}>#</th>
                  {headers.map((h, i) => (
                    <th key={i} style={{ background: '#f9fafb', color: '#374151', padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', borderRight: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap', fontWeight: 600 }}>
                      <span style={{ color: '#d1d5db', marginRight: 6, fontSize: 11 }}>{colLetter(i)}</span>{h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ color: '#9ca3af', textAlign: 'center', padding: '0 8px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', height: 36, fontSize: 11 }}>{rIdx + 2}</td>
                    {headers.map((_, cIdx) => {
                      const actualRow = rIdx + 1
                      const isEditing = editing?.row === actualRow && editing?.col === cIdx
                      const val = row[cIdx] ?? ''
                      return (
                        <td key={cIdx}
                          onDoubleClick={() => { setEditing({ row: actualRow, col: cIdx }); setEditVal(val) }}
                          style={{ borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', height: 36, minWidth: 100, maxWidth: 240, padding: 0, position: 'relative', outline: isEditing ? '2px solid #6366f1' : 'none', outlineOffset: -2, background: isEditing ? '#eef2ff' : 'inherit' }}>
                          {isEditing ? (
                            <input ref={inputRef} value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(null) }}
                              style={{ width: '100%', height: '100%', padding: '0 12px', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#4f46e5' }} />
                          ) : (
                            <span style={{ display: 'block', padding: '0 12px', lineHeight: '36px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && !error && tableData.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#6b7280' }}>No data found in this sheet.</div>
          )}
        </div>

        {/* Footer hint */}
        {!loading && tableData.length > 0 && (
          <div style={{ padding: '8px 20px', borderTop: '1px solid #e5e7eb', fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
            Double-click any cell to edit · Enter to save · Esc to cancel
          </div>
        )}
      </div>

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
    </div>
  )
}

// ── Main Grade Page ──────────────────────────────────────────────────────────
function Grade() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState(null)
  const [notification, setNotification] = useState(null)

  useEffect(() => { loadClasses() }, [])

  const loadClasses = async () => {
    if (auth.currentUser) {
      const teacherClasses = await getTeacherClasses(auth.currentUser.uid)
      setClasses(teacherClasses.sort((a, b) => a.name.localeCompare(b.name)))
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container"><p>Loading classes...</p></div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Grades</h1>
        <p className="page-subtitle">Click a class card to view and edit its grade sheet</p>
      </div>

      <div className="classes-grid">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className={`class-card ${!classItem.sheetId ? 'no-sheet' : ''}`}
            onClick={() => classItem.sheetId ? setSelectedClass(classItem) : setNotification({ message: 'No Google Sheet linked to this class. Edit the class to add a Sheet ID.', type: 'error' })}
            style={{ cursor: classItem.sheetId ? 'pointer' : 'not-allowed' }}
          >
            <div className="class-card-header">
              <div>
                <h3>{classItem.name}</h3>
                <p className="class-grade-section">{classItem.grade}-{classItem.section}</p>
                <p className="class-students">{classItem.studentCount || 0} Students</p>
              </div>
              {classItem.sheetId ? (
                <span className="sheet-badge" title="Click to open grade sheet">📊</span>
              ) : (
                <span className="no-sheet-badge" title="No Sheet linked">⚠️</span>
              )}
            </div>
            {classItem.sheetId ? (
              <div className="class-sheet-info">
                <small>Click to view &amp; edit grades</small>
              </div>
            ) : (
              <div className="class-sheet-info">
                <small style={{ color: '#f59e0b' }}>No sheet linked yet</small>
              </div>
            )}
          </div>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <h3>No Classes Yet</h3>
            <p>Create classes with Google Sheet IDs in the Dashboard to manage grades here.</p>
          </div>
        </div>
      )}

      {selectedClass && (
        <SheetViewer classItem={selectedClass} onClose={() => setSelectedClass(null)} />
      )}

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
    </div>
  )
}

export default Grade
