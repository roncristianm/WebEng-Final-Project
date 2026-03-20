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

  for (const assignment of assignments) {
    const submissionRef = collection(db, 'assignments', assignment.id, 'submissions')
    const submissionsSnapshot = await getDocs(submissionRef)
    const submissionDoc = submissionsSnapshot.docs.find(doc => doc.id === studentId)
    if (submissionDoc) {
      const data = submissionDoc.data()
      if (data.status === 'submitted') completed++
      else if (data.status === 'not_submitted') overdue++
    }
  }

  return { completed, overdue }
}
