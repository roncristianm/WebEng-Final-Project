import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query, 
  where,
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'

const SHEETS_API = '/sheets-api'

export const createAssignmentSingle = async (assignmentData) => {
  try {
    const {
      title, description, classId, className,
      teacherId, teacherName, type, deadline,
      possibleScore, quarter = 'Q1'
    } = assignmentData

    // Find the next itemNumber for this type and quarter in this class
    const q = query(
      collection(db, 'assignments'),
      where('classId', '==', classId),
      where('type', '==', type),
      where('quarter', '==', quarter)
    )
    const snapshot = await getDocs(q)
    const itemNumber = snapshot.size + 1

    const assignmentRef = doc(collection(db, 'assignments'))
    await setDoc(assignmentRef, {
      title, description, classId, className,
      teacherId, teacherName, type, deadline,
      possibleScore, quarter, itemNumber,
      createdAt: serverTimestamp()
    })

    // ── Notify the sheets backend so the HPS row is filled immediately ──────
    // This writes `possibleScore` to the correct column in row 10 as soon as
    // the teacher creates the assignment — before any student submits.
    try {
      const classDoc = await getDoc(doc(db, 'classes', classId))
      if (classDoc.exists()) {
        const sheetId = classDoc.data().sheetId
        if (sheetId) {
          const hpsResp = await fetch(`${SHEETS_API}/set-highest-possible-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheetId,
              assignmentType: type,
              itemNumber,
              possibleScore,
              quarter: quarter || 'Q1'
            })
          })
          const hpsResult = await hpsResp.json()
          console.log('set-highest-possible-score result:', hpsResult)
        }
      }
    } catch (hpsErr) {
      // Non-critical: the score submission path has a safety-fill fallback
      console.error('Failed to set HPS in sheet (non-critical):', hpsErr)
    }

    // Create submission records for all students
    const studentsRef = collection(db, 'classes', classId, 'students')
    const studentsSnapshot = await getDocs(studentsRef)
    const submissionPromises = studentsSnapshot.docs.map(async (studentDoc) => {
      const studentData = studentDoc.data()
      const submissionRef = doc(db, 'assignments', assignmentRef.id, 'submissions', studentDoc.id)
      await setDoc(submissionRef, {
        studentId: studentDoc.id,
        studentName: studentData.name,
        studentEmail: studentData.email,
        status: 'not_submitted',
        submittedAt: null,
        score: null
      })
    })
    await Promise.all(submissionPromises)

    return { success: true, assignmentId: assignmentRef.id }
  } catch (error) {
    console.error('Error creating assignment:', error)
    return { success: false, error: error.message }
  }
}

export const createAssignmentMulti = async (classIds, commonData) => {
  try {
    const results = []
    for (const classId of classIds) {
      const classDoc = await getDoc(doc(db, 'classes', classId))
      if (!classDoc.exists()) {
        results.push({ success: false, classId, error: 'Class not found' })
        continue
      }
      const result = await createAssignmentSingle({
        ...commonData,
        classId,
        className: classDoc.data().name
      })
      results.push(result)
    }
    return { success: results.every(r => r.success), results }
  } catch (error) {
    console.error('Error creating multi-class assignment:', error)
    return { success: false, error: error.message }
  }
}

export const getTeacherAssignments = async (teacherId) => {
  try {
    const q = query(collection(db, 'assignments'), where('teacherId', '==', teacherId))
    const snapshot = await getDocs(q)
    const assignments = []
    for (const assignmentDoc of snapshot.docs) {
      const assignmentData = { id: assignmentDoc.id, ...assignmentDoc.data() }
      const submissionsRef = collection(db, 'assignments', assignmentDoc.id, 'submissions')
      const submissionsSnapshot = await getDocs(submissionsRef)
      const submissions = []
      submissionsSnapshot.forEach((subDoc) => {
        submissions.push({ id: subDoc.id, ...subDoc.data() })
      })
      assignmentData.submissions = submissions
      assignments.push(assignmentData)
    }
    assignments.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
    return assignments
  } catch (error) {
    console.error('Error fetching teacher assignments:', error)
    return []
  }
}

export const getClassAssignments = async (classId) => {
  try {
    const q = query(collection(db, 'assignments'), where('classId', '==', classId))
    const snapshot = await getDocs(q)
    const assignments = []
    for (const assignmentDoc of snapshot.docs) {
      const assignmentData = { id: assignmentDoc.id, ...assignmentDoc.data() }
      // Fetch submissions for this assignment
      const submissionsRef = collection(db, 'assignments', assignmentDoc.id, 'submissions')
      const submissionsSnapshot = await getDocs(submissionsRef)
      const submissions = []
      submissionsSnapshot.forEach((subDoc) => {
        submissions.push({ id: subDoc.id, ...subDoc.data() })
      })
      assignmentData.submissions = submissions
      assignments.push(assignmentData)
    }
    assignments.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
    return assignments
  } catch (error) {
    console.error('Error fetching class assignments:', error)
    return []
  }
}

export const getAssignmentById = async (assignmentId) => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId)
    const assignmentDoc = await getDoc(assignmentRef)
    if (!assignmentDoc.exists()) return null
    const submissionsRef = collection(db, 'assignments', assignmentId, 'submissions')
    const submissionsSnapshot = await getDocs(submissionsRef)
    const submissions = []
    submissionsSnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() })
    })
    return { id: assignmentDoc.id, ...assignmentDoc.data(), submissions }
  } catch (error) {
    console.error('Error fetching assignment:', error)
    return null
  }
}

export const deleteAssignment = async (assignmentId) => {
  try {
    const submissionsRef = collection(db, 'assignments', assignmentId, 'submissions')
    const submissionsSnapshot = await getDocs(submissionsRef)
    const deletePromises = submissionsSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    await deleteDoc(doc(db, 'assignments', assignmentId))
    return { success: true }
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Submit assignment + record score to Google Sheet
 */
export const submitAssignment = async (assignmentId, studentId, deadline, score = null) => {
  try {
    const submissionRef = doc(db, 'assignments', assignmentId, 'submissions', studentId)
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const status = now > deadlineDate ? 'late' : 'done'

    await updateDoc(submissionRef, {
      status,
      submittedAt: serverTimestamp(),
      score
    })

    // Now record the score to Google Sheet if possible
    if (score !== null) {
      try {
        // Get the assignment details to find sheetId, type, itemNumber, quarter
        const assignmentDoc = await getDoc(doc(db, 'assignments', assignmentId))
        if (assignmentDoc.exists()) {
          const assignment = assignmentDoc.data()

          // Get the class sheetId
          const classDoc = await getDoc(doc(db, 'classes', assignment.classId))
          if (classDoc.exists()) {
            const sheetId = classDoc.data().sheetId

            if (sheetId) {
              // Get student name from submission
              const subSnap = await getDoc(submissionRef)
              const studentName = subSnap.data()?.studentName

              if (studentName) {
                const resp = await fetch(`${SHEETS_API}/record-score`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sheetId,
                    studentName,
                    assignmentType: assignment.type,
                    assignmentId,
                    itemNumber: assignment.itemNumber,   // ← added: lets backend place score in exact column
                    score,
                    possibleScore: assignment.possibleScore,
                    quarter: assignment.quarter || 'Q1'
                  })
                })
                const result = await resp.json()
                console.log('record-score result:', result)
              }
            }
          }
        }
      } catch (sheetError) {
        console.error('Failed to record score to sheet (non-critical):', sheetError)
      }
    }

    return { success: true, status }
  } catch (error) {
    console.error('Error submitting assignment:', error)
    return { success: false, error: error.message }
  }
}

export const getStudentAssignments = async (studentId, classIds) => {
  try {
    if (!classIds || classIds.length === 0) return []
    const q = query(collection(db, 'assignments'), where('classId', 'in', classIds))
    const snapshot = await getDocs(q)
    const assignments = []
    for (const assignmentDoc of snapshot.docs) {
      const assignmentData = assignmentDoc.data()
      const submissionRef = doc(db, 'assignments', assignmentDoc.id, 'submissions', studentId)
      const submissionDoc = await getDoc(submissionRef)
      assignments.push({
        id: assignmentDoc.id,
        ...assignmentData,
        submission: submissionDoc.exists() ? submissionDoc.data() : null
      })
    }
    assignments.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    return assignments
  } catch (error) {
    console.error('Error fetching student assignments:', error)
    return []
  }
}

/**
 * Repair the HPS row for a class+quarter by re-writing every assignment's
 * possibleScore to the column that matches its itemNumber.
 * Call this once from the teacher's Grade page to fix any misplaced scores
 * that were written by the old empty-slot logic.
 *
 * Usage:
 *   import { repairHPS } from '../services/assignmentService'
 *   await repairHPS(classId, sheetId, 'Q1')
 */
export const repairHPS = async (classId, sheetId, quarter = 'Q1') => {
  try {
    if (!sheetId) return { success: false, error: 'No sheetId for this class' }

    // Fetch all assignments for this class+quarter from Firestore
    const q = query(
      collection(db, 'assignments'),
      where('classId', '==', classId),
      where('quarter', '==', quarter)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return { success: true, message: 'No assignments found', results: [] }

    const assignments = snapshot.docs.map(d => ({
      assignmentType: d.data().type,
      itemNumber:     d.data().itemNumber,
      possibleScore:  d.data().possibleScore
    })).filter(a => a.itemNumber !== undefined && a.possibleScore !== undefined)

    const resp = await fetch(`${SHEETS_API}/repair-hps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId, quarter, assignments })
    })
    const result = await resp.json()
    console.log('repair-hps result:', result)
    return result
  } catch (err) {
    console.error('repairHPS error:', err)
    return { success: false, error: err.message }
  }
}