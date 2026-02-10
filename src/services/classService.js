import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query, 
  where,
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Generate a random 6-character class code
 */
const generateClassCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

/**
 * Check if a class code already exists
 */
const classCodeExists = async (code) => {
  const q = query(collection(db, 'classes'), where('classCode', '==', code))
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

/**
 * Create a new class (Teacher)
 */
export const createClass = async (className, teacherId, teacherName) => {
  try {
    // Generate unique class code
    let classCode = generateClassCode()
    while (await classCodeExists(classCode)) {
      classCode = generateClassCode()
    }

    const classRef = doc(collection(db, 'classes'))
    await setDoc(classRef, {
      name: className,
      teacherId: teacherId,
      teacherName: teacherName,
      classCode: classCode,
      createdAt: serverTimestamp(),
      studentCount: 0
    })

    return { success: true, classId: classRef.id, classCode }
  } catch (error) {
    console.error('Error creating class:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all classes for a teacher
 */
export const getTeacherClasses = async (teacherId) => {
  try {
    const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId))
    const snapshot = await getDocs(q)
    
    const classes = []
    snapshot.forEach((doc) => {
      classes.push({ id: doc.id, ...doc.data() })
    })
    
    return classes
  } catch (error) {
    console.error('Error fetching teacher classes:', error)
    return []
  }
}

/**
 * Join a class (Student)
 */
export const joinClass = async (classCode, studentId, studentName, studentEmail) => {
  try {
    // Find the class by code
    const q = query(collection(db, 'classes'), where('classCode', '==', classCode.toUpperCase()))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return { success: false, error: 'Invalid class code' }
    }

    const classDoc = snapshot.docs[0]
    const classId = classDoc.id
    
    // Check if student is already enrolled
    const studentRef = doc(db, 'classes', classId, 'students', studentId)
    const studentDoc = await getDoc(studentRef)
    
    if (studentDoc.exists()) {
      return { success: false, error: 'You are already enrolled in this class' }
    }

    // Add student to the class
    await setDoc(studentRef, {
      studentId: studentId,
      name: studentName,
      email: studentEmail,
      joinedAt: serverTimestamp()
    })

    // Update student count
    const classData = classDoc.data()
    await setDoc(classDoc.ref, {
      ...classData,
      studentCount: (classData.studentCount || 0) + 1
    })

    return { success: true, classId, className: classData.name }
  } catch (error) {
    console.error('Error joining class:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all classes a student is enrolled in
 */
export const getStudentClasses = async (studentId) => {
  try {
    const classesRef = collection(db, 'classes')
    const allClassesSnapshot = await getDocs(classesRef)
    
    const enrolledClasses = []
    
    for (const classDoc of allClassesSnapshot.docs) {
      const studentRef = doc(db, 'classes', classDoc.id, 'students', studentId)
      const studentDoc = await getDoc(studentRef)
      
      if (studentDoc.exists()) {
        enrolledClasses.push({ id: classDoc.id, ...classDoc.data() })
      }
    }
    
    return enrolledClasses
  } catch (error) {
    console.error('Error fetching student classes:', error)
    return []
  }
}

/**
 * Get class details by ID
 */
export const getClassById = async (classId) => {
  try {
    const classRef = doc(db, 'classes', classId)
    const classDoc = await getDoc(classRef)
    
    if (classDoc.exists()) {
      return { id: classDoc.id, ...classDoc.data() }
    }
    return null
  } catch (error) {
    console.error('Error fetching class:', error)
    return null
  }
}

/**
 * Get students in a class
 */
export const getClassStudents = async (classId) => {
  try {
    const studentsRef = collection(db, 'classes', classId, 'students')
    const snapshot = await getDocs(studentsRef)
    
    const students = []
    snapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() })
    })
    
    return students
  } catch (error) {
    console.error('Error fetching class students:', error)
    return []
  }
}

/**
 * Leave a class (Student)
 */
export const leaveClass = async (classId, studentId) => {
  try {
    const studentRef = doc(db, 'classes', classId, 'students', studentId)
    await deleteDoc(studentRef)
    
    // Update student count
    const classRef = doc(db, 'classes', classId)
    const classDoc = await getDoc(classRef)
    if (classDoc.exists()) {
      const classData = classDoc.data()
      await setDoc(classRef, {
        ...classData,
        studentCount: Math.max((classData.studentCount || 1) - 1, 0)
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error leaving class:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a class (Teacher)
 */
export const deleteClass = async (classId) => {
  try {
    // Delete all students in the class
    const studentsRef = collection(db, 'classes', classId, 'students')
    const studentsSnapshot = await getDocs(studentsRef)
    
    const deletePromises = studentsSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    
    // Delete the class
    const classRef = doc(db, 'classes', classId)
    await deleteDoc(classRef)
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting class:', error)
    return { success: false, error: error.message }
  }
}
