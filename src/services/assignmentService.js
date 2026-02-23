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
  updateDoc,
  orderBy
} from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Create a new assignment (Teacher)
 */
export const createAssignment = async (assignmentData) => {
  try {
    const {
      title,
      description,
      classId,
      className,
      teacherId,
      teacherName,
      type,
      deadline
    } = assignmentData

    const assignmentRef = doc(collection(db, 'assignments'))
    await setDoc(assignmentRef, {
      title,
      description,
      classId,
      className,
      teacherId,
      teacherName,
      type,
      deadline,
      createdAt: serverTimestamp()
    })

    // Get all students in the class and create submission records
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
        submittedAt: null
      })
    })

    await Promise.all(submissionPromises)

    return { success: true, assignmentId: assignmentRef.id }
  } catch (error) {
    console.error('Error creating assignment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all assignments for a teacher
 */
export const getTeacherAssignments = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'assignments'), 
      where('teacherId', '==', teacherId)
    )
    const snapshot = await getDocs(q)
    
    const assignments = []
    
    // Fetch each assignment with its submissions
    for (const assignmentDoc of snapshot.docs) {
      const assignmentData = { id: assignmentDoc.id, ...assignmentDoc.data() }
      
      // Get all submissions for this assignment
      const submissionsRef = collection(db, 'assignments', assignmentDoc.id, 'submissions')
      const submissionsSnapshot = await getDocs(submissionsRef)
      
      const submissions = []
      submissionsSnapshot.forEach((subDoc) => {
        submissions.push({ id: subDoc.id, ...subDoc.data() })
      })
      
      assignmentData.submissions = submissions
      assignments.push(assignmentData)
    }
    
    // Sort client-side by createdAt
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

/**
 * Get assignments for a specific class
 */
export const getClassAssignments = async (classId) => {
  try {
    const q = query(
      collection(db, 'assignments'), 
      where('classId', '==', classId)
    )
    const snapshot = await getDocs(q)
    
    const assignments = []
    snapshot.forEach((doc) => {
      assignments.push({ id: doc.id, ...doc.data() })
    })
    
    // Sort client-side by createdAt
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

/**
 * Get assignment by ID with submissions
 */
export const getAssignmentById = async (assignmentId) => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId)
    const assignmentDoc = await getDoc(assignmentRef)
    
    if (!assignmentDoc.exists()) {
      return null
    }

    // Get all submissions
    const submissionsRef = collection(db, 'assignments', assignmentId, 'submissions')
    const submissionsSnapshot = await getDocs(submissionsRef)
    
    const submissions = []
    submissionsSnapshot.forEach((doc) => {
      submissions.push({ id: doc.id, ...doc.data() })
    })

    return { 
      id: assignmentDoc.id, 
      ...assignmentDoc.data(),
      submissions 
    }
  } catch (error) {
    console.error('Error fetching assignment:', error)
    return null
  }
}

/**
 * Delete an assignment (Teacher)
 */
export const deleteAssignment = async (assignmentId) => {
  try {
    // Delete all submissions
    const submissionsRef = collection(db, 'assignments', assignmentId, 'submissions')
    const submissionsSnapshot = await getDocs(submissionsRef)
    
    const deletePromises = submissionsSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    
    // Delete the assignment
    const assignmentRef = doc(db, 'assignments', assignmentId)
    await deleteDoc(assignmentRef)
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting assignment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Submit an assignment (Student)
 */
export const submitAssignment = async (assignmentId, studentId, deadline) => {
  try {
    const submissionRef = doc(db, 'assignments', assignmentId, 'submissions', studentId)
    const now = new Date()
    const deadlineDate = new Date(deadline)
    
    const status = now > deadlineDate ? 'late' : 'done'
    
    await updateDoc(submissionRef, {
      status,
      submittedAt: serverTimestamp()
    })
    
    return { success: true, status }
  } catch (error) {
    console.error('Error submitting assignment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get student's assignments
 */
export const getStudentAssignments = async (studentId, classIds) => {
  try {
    if (!classIds || classIds.length === 0) {
      return []
    }

    const q = query(
      collection(db, 'assignments'),
      where('classId', 'in', classIds)
    )
    const snapshot = await getDocs(q)
    
    const assignments = []
    for (const assignmentDoc of snapshot.docs) {
      const assignmentData = assignmentDoc.data()
      
      // Get student's submission status
      const submissionRef = doc(db, 'assignments', assignmentDoc.id, 'submissions', studentId)
      const submissionDoc = await getDoc(submissionRef)
      
      assignments.push({
        id: assignmentDoc.id,
        ...assignmentData,
        submission: submissionDoc.exists() ? submissionDoc.data() : null
      })
    }
    
    // Sort client-side by deadline
    assignments.sort((a, b) => {
      const aTime = new Date(a.deadline).getTime()
      const bTime = new Date(b.deadline).getTime()
      return aTime - bTime
    })
    
    return assignments
  } catch (error) {
    console.error('Error fetching student assignments:', error)
    return []
  }
}
