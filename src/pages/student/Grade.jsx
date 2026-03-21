import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getStudentClasses } from '../../services/classService'
import '../../styles/Dashboard.css'

const SHEETS_API = '/sheets-api'

function Grade() {
  const [classes, setClasses] = useState([])
  const [gradesMap, setGradesMap] = useState({}) // classId -> { headers, row, loading, error }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAll = async () => {
      if (!auth.currentUser) return
      const enrolled = await getStudentClasses(auth.currentUser.uid)
      setClasses(enrolled)
      setLoading(false)

      // Fetch grades for each class that has a sheetId
      enrolled.forEach(async (cls) => {
        if (!cls.sheetId) return
        setGradesMap(prev => ({ ...prev, [cls.id]: { loading: true } }))
        try {
          const res = await fetch(
            `${SHEETS_API}/student-grades?sheetId=${cls.sheetId}&studentId=${auth.currentUser.uid}`
          )
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          setGradesMap(prev => ({ ...prev, [cls.id]: { headers: data.headers, row: data.row, loading: false } }))
        } catch (e) {
          setGradesMap(prev => ({ ...prev, [cls.id]: { error: e.message, loading: false } }))
        }
      })
    }
    loadAll()
  }, [])

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container"><p>Loading grades...</p></div>
      </div>
    )
  }

  const classesWithSheets = classes.filter(c => c.sheetId)
  const classesWithoutSheets = classes.filter(c => !c.sheetId)

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Grades</h1>
        <p className="page-subtitle">Your academic performance across all classes</p>
      </div>

      {classes.length === 0 && (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <h3>No Classes Joined</h3>
            <p>Join a class to see your grades here.</p>
          </div>
        </div>
      )}

      {classesWithSheets.map((cls) => {
        const g = gradesMap[cls.id]
        return (
          <div key={cls.id} style={{ marginBottom: 28, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {/* Class header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{cls.name}</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  Grade {cls.grade} · {cls.section} · {cls.teacherName}
                </p>
              </div>
              <span style={{ fontSize: 22 }}>📊</span>
            </div>

            {/* Grades content */}
            <div style={{ padding: '16px 20px' }}>
              {!g || g.loading ? (
                <p style={{ color: '#6b7280', fontSize: 13 }}>Loading grades…</p>
              ) : g.error ? (
                <p style={{ color: '#dc2626', fontSize: 13 }}>Could not load grades: {g.error}</p>
              ) : !g.row || g.row.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 13 }}>No grade data found for you yet. Your teacher may not have entered grades yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: 400 }}>
                    <thead>
                      <tr>
                        {(g.headers || []).map((h, i) => (
                          <th key={i} style={{ background: '#f3f4f6', padding: '8px 16px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {(g.headers || []).map((_, i) => {
                          const val = g.row[i] ?? '—'
                          // Highlight numeric grades
                          const isScore = i > 1 && !isNaN(parseFloat(val)) && val !== '—'
                          const score = parseFloat(val)
                          const color = isScore ? (score >= 75 ? '#16a34a' : '#dc2626') : '#111827'
                          return (
                            <td key={i} style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', color, fontWeight: isScore ? 600 : 400 }}>
                              {val}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {classesWithoutSheets.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>Classes without grade sheets:</p>
          {classesWithoutSheets.map(cls => (
            <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{cls.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>No grade sheet linked by teacher yet</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Grade
