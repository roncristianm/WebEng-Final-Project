// functions/src/firestoreHelpers.js
// Utilities for fetching data from Firestore inside Cloud Functions.
// Uses the admin SDK (already initialised in index.js).

const { getFirestore } = require('firebase-admin/firestore')

/**
 * Get all students enrolled in a class.
 * Returns an array of { id, name, email, ... }
 *
 * @param {string} classId
 * @returns {Promise<Array<{ id: string, name: string, email: string }>>}
 */
async function getClassStudents(classId) {
  const db       = getFirestore()
  const snapshot = await db.collection('classes').doc(classId).collection('students').get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

/**
 * Get basic class info (name, teacherName, etc.)
 *
 * @param {string} classId
 * @returns {Promise<{ id: string, name: string, teacherName: string, ... } | null>}
 */
async function getClassData(classId) {
  const db  = getFirestore()
  const doc = await db.collection('classes').doc(classId).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() }
}

/**
 * Get a user document from the `users` collection.
 *
 * @param {string} uid
 * @returns {Promise<{ name: string, email: string, role: string, ... } | null>}
 */
async function getUserData(uid) {
  const db  = getFirestore()
  const doc = await db.collection('users').doc(uid).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() }
}

/**
 * Get all NOT_SUBMITTED assignment submissions for a given assignment,
 * where the assignment deadline is within the next `withinHours` hours.
 * Used by the deadline reminder scheduler.
 *
 * @param {number} withinHours  - window in hours (e.g. 24 means "due in next 24h")
 * @returns {Promise<Array<{ assignmentId, title, className, deadline, type, studentEmail, studentName }>>}
 */
async function getPendingDeadlines(withinHours = 24) {
  const db  = getFirestore()
  const now = new Date()
  const windowEnd = new Date(now.getTime() + withinHours * 60 * 60 * 1000)

  // Query assignments whose deadline falls within the window
  const assignmentsSnap = await db
    .collection('assignments')
    .where('deadline', '>=', now.toISOString())
    .where('deadline', '<=', windowEnd.toISOString())
    .get()

  const results = []

  for (const assignDoc of assignmentsSnap.docs) {
    const assignment = { id: assignDoc.id, ...assignDoc.data() }
    const submissionsSnap = await assignDoc.ref.collection('submissions').get()

    for (const subDoc of submissionsSnap.docs) {
      const sub = subDoc.data()
      // Only remind students who haven't submitted yet
      if (sub.status === 'not_submitted' && sub.studentEmail) {
        const deadline    = new Date(assignment.deadline)
        const hoursLeft   = Math.round((deadline - now) / 36e5)
        results.push({
          assignmentId: assignment.id,
          title:        assignment.title,
          className:    assignment.className,
          deadline:     assignment.deadline,
          type:         assignment.type,
          hoursLeft,
          studentEmail: sub.studentEmail,
          studentName:  sub.studentName || 'Student',
        })
      }
    }
  }

  return results
}

module.exports = { getClassStudents, getClassData, getUserData, getPendingDeadlines }
