import React, { useState } from 'react';
import '../styles/Modal.css';

function CreateClassModal({ open, onClose, onCreate, creating }) {
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [sheetId, setSheetId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (className.trim() && grade.trim() && section.trim()) {
      await onCreate({ className, grade, section, sheetId });
      setClassName('');
      setGrade('');
      setSection('');
      setSheetId('');
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Class</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="className">Class Name</label>
              <input
                type="text"
                id="className"
                value={className}
                onChange={e => setClassName(e.target.value)}
                placeholder="Enter class name (e.g., ST. CELESTINE (STEM))"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="grade">Grade</label>
              <input
                type="text"
                id="grade"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                placeholder="Enter grade (e.g., 12)"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="section">Section</label>
              <input
                type="text"
                id="section"
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="Enter section"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="sheetId">Sheet ID (optional)</label>
              <input
                type="text"
                id="sheetId"
                value={sheetId}
                onChange={e => setSheetId(e.target.value)}
                placeholder="Google Sheet ID (optional)"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose} disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-post" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateClassModal;
