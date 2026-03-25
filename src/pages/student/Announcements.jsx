import { useState, useEffect } from 'react'
import { auth } from '../../config/firebase'
import { getStudentAnnouncements } from '../../services/announcementService'
import Notification from '../../components/Notification'
import '../../styles/Assignment.css'

/* ── helpers ── */
function formatDateTime(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function timeAgo(ts) {
  if (!ts) return ''
  const d   = ts.toDate ? ts.toDate() : new Date(ts)
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60)   return 'Just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return formatDateTime(ts)
}

/* deterministic accent per class name */
const ACCENTS = [
  '#0038A8', '#0284c7', '#059669', '#7c3aed',
 '#be123c', '#0e7490', '#374151',
]
function classAccent(name = '') {
  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % ACCENTS.length
  return ACCENTS[idx]
}
function classInitial(name = '') {
  return name.trim()[0]?.toUpperCase() || '?'
}

/* ── Detail Modal ── */
function AnnouncementModal({ ann, onClose }) {
  const accent = classAccent(ann.className)
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 2000, alignItems: 'center' }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: '92%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          overflow: 'hidden',
        }}
      >
        {/* colored top bar */}
        <div style={{ height: 5, background: accent, flexShrink: 0 }} />

        {/* header */}
        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {ann.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* class pill */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: `${accent}15`, color: accent,
                  borderRadius: 6, padding: '3px 10px',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {ann.className}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {formatDateTime(ann.createdAt)}
                </span>
              </div>
            </div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }}>
          {/* posted by */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, flexShrink: 0,
            }}>
              {(ann.teacherName || 'T')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{ann.teacherName || 'Teacher'}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Posted {timeAgo(ann.createdAt)}</p>
            </div>
          </div>

          {/* content */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: `3px solid ${accent}`,
            borderRadius: 10,
            padding: '16px 18px',
            fontSize: 14,
            color: '#374151',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}>
            {ann.content}
          </div>
        </div>

        {/* footer */}
        <div style={{ padding: '14px 28px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: '#0038A8', color: '#fff', border: 'none',
              padding: '11px 28px', borderRadius: 10, fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 12px rgba(0,56,168,0.3)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Announcement Card ── */
function AnnouncementCard({ ann, onClick }) {
  const accent = classAccent(ann.className)
  const initial = classInitial(ann.className)

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${accent}`,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s, transform 0.18s',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.09)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: 11,
        background: `${accent}15`,
        color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 16, flexShrink: 0,
        border: `1.5px solid ${accent}30`,
      }}>
        {initial}
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
          <h3 style={{
            margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {ann.title}
          </h3>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>
            {timeAgo(ann.createdAt)}
          </span>
        </div>

        {/* class tag + teacher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: `${accent}15`, color: accent,
            borderRadius: 5, padding: '2px 8px',
          }}>
            {ann.className}
          </span>
          {ann.teacherName && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>· {ann.teacherName}</span>
          )}
        </div>

        {/* preview */}
        <p style={{
          margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.55,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {ann.content}
        </p>
      </div>

      {/* chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 12 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

/* ── Main Page ── */
export default function Announcements() {
  const [announcements,        setAnnouncements]        = useState([])
  const [loading,              setLoading]              = useState(true)
  const [notification,         setNotification]         = useState(null)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [search,               setSearch]               = useState('')

  useEffect(() => { loadAnnouncements() }, [])

  const loadAnnouncements = async () => {
    if (auth.currentUser) {
      const data = await getStudentAnnouncements(auth.currentUser.uid)
      setAnnouncements(data)
      setLoading(false)
    }
  }

  const filtered = announcements.filter(a =>
    !search ||
    a.title?.toLowerCase().includes(search.toLowerCase()) ||
    a.className?.toLowerCase().includes(search.toLowerCase()) ||
    a.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-container">

      {/* ── Header ── */}
      <div className="section-header">
        <div>
          <h2>Announcements</h2>
          <p className="page-subtitle">Stay updated with your class announcements</p>
        </div>
        {/* count pill */}
        {!loading && announcements.length > 0 && (
          <span style={{
            background: '#053dad', color: '#fff',
            borderRadius: 20, padding: '6px 16px',
            fontSize: 13, fontWeight: 700,
          }}>
            {announcements.length} total
          </span>
        )}
      </div>

      {/* ── Search ── */}
      {!loading && announcements.length > 0 && (
        <div style={{ marginBottom: 24, position: 'relative' }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search announcements…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 16px 12px 40px',
              border: '1.5px solid #e2e8f0', borderRadius: 10,
              fontSize: 14, fontFamily: 'inherit', color: '#0f172a',
              outline: 'none', background: '#fff',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#0038A8'; e.target.style.boxShadow = '0 0 0 3px rgba(0,56,168,0.1)' }}
            onBlur={e  => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="loading-container"><p>Loading announcements…</p></div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(ann => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              onClick={() => setSelectedAnnouncement(ann)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state-container">
          <div className="empty-state-card">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ marginBottom: 12, color: '#2d66b6' }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <h3>{search ? 'No results found' : 'No Announcements'}</h3>
            <p>{search ? 'Try a different search term.' : 'Check back later for updates from your teachers.'}</p>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedAnnouncement && (
        <AnnouncementModal
          ann={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}