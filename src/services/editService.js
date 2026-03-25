// src/services/editService.js
// Firestore update helpers for teacher-editable content

import { doc, updateDoc, getDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'

import { SHEETS_API_BASE as SHEETS_API } from '../config/sheetsBackend'

/**
 * Update an announcement document.
 */
export async function updateAnnouncement(id, fields) {
  try {
    await updateDoc(doc(db, 'announcements', id), {
      title:     fields.title,
      content:   fields.content,
      updatedAt: serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error('[editService] updateAnnouncement:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update an assignment document and sync changes to Google Sheets.
 *
 * @param {string} id          - Firestore assignment doc ID
 * @param {object} fields      - New values: { title, description, type, quarter, possibleScore, deadline }
 * @param {object} oldAssignment - The full assignment object BEFORE the edit
 *                                 (must include: type, quarter, itemNumber, possibleScore, classId)
 */
export async function updateAssignment(id, fields, oldAssignment = null) {
  try {
    // ── 1. Determine new itemNumber ───────────────────────────────────────────
    // If type OR quarter changed, itemNumber must be recalculated so the assignment
    // lands at the correct position in the new section.
    let newItemNumber = oldAssignment?.itemNumber

    const typeChanged    = oldAssignment && fields.type    !== oldAssignment.type
    const quarterChanged = oldAssignment && fields.quarter !== oldAssignment.quarter

    if ((typeChanged || quarterChanged) && oldAssignment?.classId) {
      // Count existing assignments of the NEW type+quarter in this class
      // (the current doc still has old values in Firestore at this point, so it won't appear)
      const q = query(
        collection(db, 'assignments'),
        where('classId', '==', oldAssignment.classId),
        where('type',    '==', fields.type),
        where('quarter', '==', fields.quarter)
      )
      const snap = await getDocs(q)
      newItemNumber = snap.size + 1
    }

    // ── 2. Update Firestore ───────────────────────────────────────────────────
    await updateDoc(doc(db, 'assignments', id), {
      title:         fields.title,
      description:   fields.description,
      type:          fields.type,
      quarter:       fields.quarter,
      possibleScore: fields.possibleScore,
      deadline:      fields.deadline,
      itemNumber:    newItemNumber,
      updatedAt:     serverTimestamp(),
    })

    // ── 3. Sync Google Sheets ─────────────────────────────────────────────────
    if (oldAssignment?.classId) {
      try {
        const classDoc = await getDoc(doc(db, 'classes', oldAssignment.classId))
        const sheetId  = classDoc.exists() ? classDoc.data().sheetId : null

        if (sheetId) {
          // Collect all graded submissions for this assignment (scores to move)
          const subsSnap = await getDocs(
            collection(db, 'assignments', id, 'submissions')
          )
          const studentScores = []
          subsSnap.forEach(s => {
            const d = s.data()
            if (d.score !== null && d.score !== undefined && d.studentName) {
              studentScores.push({ studentName: d.studentName, score: d.score })
            }
          })

          const resp = await fetch(`${SHEETS_API}/update-assignment-in-sheet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheetId,
              old: {
                type:          oldAssignment.type,
                quarter:       oldAssignment.quarter,
                itemNumber:    oldAssignment.itemNumber,
                possibleScore: oldAssignment.possibleScore,
              },
              new: {
                type:          fields.type,
                quarter:       fields.quarter,
                itemNumber:    newItemNumber,
                possibleScore: fields.possibleScore,
              },
              studentScores,
            })
          })
          const result = await resp.json()
          console.log('[editService] update-assignment-in-sheet:', result)
        }
      } catch (sheetErr) {
        // Non-critical — Firestore is already saved
        console.error('[editService] sheet sync failed (non-critical):', sheetErr)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[editService] updateAssignment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a material document (description only).
 */
export async function updateMaterial(id, fields) {
  try {
    await updateDoc(doc(db, 'materials', id), {
      description: fields.description,
      updatedAt:   serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error('[editService] updateMaterial:', error)
    return { success: false, error: error.message }
  }
}