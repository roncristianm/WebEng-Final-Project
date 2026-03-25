// src/components/EditContentModal.jsx
// Shared edit modal for assignments, announcements, and materials

import { useState } from 'react'

const CLOSE_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

/* ── Announcement Edit ── */
function EditAnnouncementForm({ data, onSave, onClose, saving }) {
  const [title,   setTitle]   = useState(data.title   || '')
  const [content, setContent] = useState(data.content || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    onSave({ title: title.trim(), content: content.trim() })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="ecm-body">
        <div className="ecm-field">
          <label className="ecm-label">Title *</label>
          <input
            className="ecm-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Announcement title"
            required
          />
        </div>
        <div className="ecm-field">
          <label className="ecm-label">Content *</label>
          <textarea
            className="ecm-input ecm-textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
            placeholder="Write your announcement…"
            required
          />
        </div>
      </div>
      <div className="ecm-footer">
        <button type="button" className="ecm-btn ecm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="ecm-btn ecm-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

/* ── Assignment Edit ── */
function EditAssignmentForm({ data, onSave, onClose, saving }) {
  const toDateStr = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-CA')
  }
  const toTimeStr = (ts) => {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toTimeString().slice(0, 5)
  }

  const [title,        setTitle]        = useState(data.title        || '')
  const [description,  setDescription]  = useState(data.description  || '')
  const [type,         setType]         = useState(data.type         || 'Written Works')
  const [quarter,      setQuarter]      = useState(data.quarter      || 'Q1')
  const [possibleScore,setPossibleScore]= useState(data.possibleScore || 100)
  const [deadlineDate, setDeadlineDate] = useState(toDateStr(data.deadline))
  const [deadlineTime, setDeadlineTime] = useState(toTimeStr(data.deadline))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    const deadline = `${deadlineDate}T${deadlineTime}`
    onSave({
      title: title.trim(),
      description: description.trim(),
      type,
      quarter,
      possibleScore: parseFloat(possibleScore) || 100,
      deadline,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="ecm-body">
        <div className="ecm-field">
          <label className="ecm-label">Title *</label>
          <input className="ecm-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Assignment title" required />
        </div>
        <div className="ecm-field">
          <label className="ecm-label">Description *</label>
          <textarea className="ecm-input ecm-textarea" value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Instructions…" required />
        </div>
        <div className="ecm-field">
          <label className="ecm-label">Type *</label>
          <select className="ecm-input" value={type} onChange={e => setType(e.target.value)} required>
            <option>Written Works</option>
            <option>Performance Task</option>
            <option>Quarterly Assessment</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="ecm-field">
            <label className="ecm-label">Quarter *</label>
            <select className="ecm-input" value={quarter} onChange={e => setQuarter(e.target.value)} required>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
          <div className="ecm-field">
            <label className="ecm-label">Possible Score *</label>
            <input className="ecm-input" type="number" min="1" value={possibleScore} onChange={e => setPossibleScore(e.target.value)} required />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="ecm-field">
            <label className="ecm-label">Deadline Date *</label>
            <input className="ecm-input" type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} required />
          </div>
          <div className="ecm-field">
            <label className="ecm-label">Deadline Time *</label>
            <input className="ecm-input" type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} required />
          </div>
        </div>
      </div>
      <div className="ecm-footer">
        <button type="button" className="ecm-btn ecm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="ecm-btn ecm-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

/* ── Material Edit ── */
function EditMaterialForm({ data, onSave, onClose, saving }) {
  const [description, setDescription] = useState(data.description || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!description.trim()) return
    onSave({ description: description.trim() })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="ecm-body">
        <div className="ecm-field">
          <label className="ecm-label">Description *</label>
          <textarea
            className="ecm-input ecm-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={6}
            placeholder="Describe this material or paste a link…"
            required
          />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
          Note: Existing files are kept. To replace files, delete this material and create a new one.
        </p>
      </div>
      <div className="ecm-footer">
        <button type="button" className="ecm-btn ecm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="ecm-btn ecm-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

/* ── Main Modal Shell ── */
export default function EditContentModal({ type, data, onSave, onClose, saving }) {
  const titles = {
    announcement: 'Edit Announcement',
    assignment:   'Edit Assignment',
    material:     'Edit Material',
  }

  return (
    <>
      {/* Inject scoped styles once */}
      <style>{`
        .ecm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 20px;
          box-sizing: border-box;
          backdrop-filter: blur(3px);
          animation: ecm-fade 0.15s ease;
        }
        @keyframes ecm-fade { from { opacity: 0 } to { opacity: 1 } }

        .ecm-modal {
          background: #fff;
          border-radius: 18px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0,0,0,0.22);
          animation: ecm-pop 0.22s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes ecm-pop {
          from { opacity: 0; transform: scale(0.93) translateY(6px) }
          to   { opacity: 1; transform: scale(1) translateY(0) }
        }

        .ecm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .ecm-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
          font-family: 'Montserrat', -apple-system, sans-serif;
        }

        .ecm-close {
          width: 32px; height: 32px;
          border-radius: 8px;
          border: none;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .ecm-close:hover { background: #f1f5f9; color: #0f172a; }

        .ecm-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ecm-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ecm-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #374151;
          font-family: 'Montserrat', -apple-system, sans-serif;
        }

        .ecm-input {
          width: 100%;
          padding: 10px 13px;
          border: 1.5px solid #e2e8f0;
          border-radius: 9px;
          font-size: 0.9rem;
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #0f172a;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
          background: #fff;
          resize: vertical;
        }
        .ecm-input:focus {
          border-color: #0038A8;
          box-shadow: 0 0 0 3px rgba(0,56,168,0.1);
        }
        .ecm-input::placeholder { color: #cbd5e1; }

        .ecm-textarea { min-height: 100px; }

        .ecm-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 24px 20px;
          border-top: 1px solid #e2e8f0;
        }

        .ecm-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          border-radius: 9px;
          padding: 10px 20px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Montserrat', -apple-system, sans-serif;
          transition: background 0.15s, opacity 0.15s;
        }
        .ecm-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .ecm-btn--primary {
          background: #0038A8;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,56,168,0.25);
        }
        .ecm-btn--primary:hover:not(:disabled) { background: #002d8a; }

        .ecm-btn--ghost {
          background: #f1f5f9;
          color: #475569;
        }
        .ecm-btn--ghost:hover:not(:disabled) { background: #e2e8f0; }

        @media (max-width: 480px) {
          .ecm-modal { border-radius: 16px; max-height: 92vh; }
          .ecm-body, .ecm-header, .ecm-footer { padding: 16px 18px; }
        }
      `}</style>

      <div className="ecm-overlay" onClick={onClose}>
        <div className="ecm-modal" onClick={e => e.stopPropagation()}>
          <div className="ecm-header">
            <h2 className="ecm-title">{titles[type] || 'Edit'}</h2>
            <button className="ecm-close" onClick={onClose} aria-label="Close">
              {CLOSE_ICON}
            </button>
          </div>

          {type === 'announcement' && (
            <EditAnnouncementForm data={data} onSave={onSave} onClose={onClose} saving={saving} />
          )}
          {type === 'assignment' && (
            <EditAssignmentForm data={data} onSave={onSave} onClose={onClose} saving={saving} />
          )}
          {type === 'material' && (
            <EditMaterialForm data={data} onSave={onSave} onClose={onClose} saving={saving} />
          )}
        </div>
      </div>
    </>
  )
}