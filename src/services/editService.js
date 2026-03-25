// src/services/editService.js
// Firestore update helpers for teacher-editable content

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Update an announcement document.
 * @param {string} id - Firestore doc ID
 * @param {{ title: string, content: string }} fields
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
 * Update an assignment document.
 * @param {string} id - Firestore doc ID
 * @param {{ title, description, type, quarter, possibleScore, deadline }} fields
 */
export async function updateAssignment(id, fields) {
  try {
    await updateDoc(doc(db, 'assignments', id), {
      title:         fields.title,
      description:   fields.description,
      type:          fields.type,
      quarter:       fields.quarter,
      possibleScore: fields.possibleScore,
      deadline:      fields.deadline,   // ISO string — your existing code already stores deadlines as strings
      updatedAt:     serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error('[editService] updateAssignment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a material document (description only — files stay as-is).
 * @param {string} id - Firestore doc ID
 * @param {{ description: string }} fields
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