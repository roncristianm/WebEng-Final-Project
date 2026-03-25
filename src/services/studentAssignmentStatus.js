import { getClassAssignments } from './assignmentService'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Get completed and overdue counts for a student in a class
 */
export const getStudentAssignmentStatus = async (classId, studentId) => {
  const assignments = await getClassAssignments(classId)
  let completed = 0
  let overdue = 0

  const toDate = (d) => {
    if (!d) return null
    if (typeof d?.toDate === 'function') return d.toDate()
    const asDate = new Date(d)
    return Number.isNaN(asDate.getTime()) ? null : asDate
  }

  for (const assignment of assignments) {
    const submissionRef = collection(db, 'assignments', assignment.id, 'submissions')
    const submissionsSnapshot = await getDocs(submissionRef)
    const submissionDoc = submissionsSnapshot.docs.find(doc => doc.id === studentId)
    if (submissionDoc) {
      const data = submissionDoc.data()

      // Align with submission statuses used in `submitAssignment`.
      // Backward-compatible with any older 'submitted' status.
      if (data.status === 'done' || data.status === 'late' || data.status === 'submitted') {
        completed++
      } else if (data.status === 'not_submitted') {
        const deadline = toDate(assignment.deadline)
        if (deadline && deadline < new Date()) overdue++
      }
    }
  }

  return { completed, overdue }
}
