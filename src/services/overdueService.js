import { getClassAssignments } from './assignmentService'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Get overdue count for a class (students who have not submitted latest assignment)
 */
export const getOverdueCount = async (classId) => {
  const assignments = await getClassAssignments(classId)
  if (!assignments.length) return 0

  // Find latest assignment
  const latestAssignment = assignments[0]
  if (!latestAssignment) return 0

  // Get submissions for latest assignment
  const submissionsRef = collection(db, 'assignments', latestAssignment.id, 'submissions')
  const submissionsSnapshot = await getDocs(submissionsRef)

  let overdueCount = 0
  submissionsSnapshot.forEach((doc) => {
    const data = doc.data()
    if (data.status === 'not_submitted') overdueCount++
  })

  return overdueCount
}
