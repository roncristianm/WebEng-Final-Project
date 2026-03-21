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
  deleteDoc,
  updateDoc,
  increment
} from 'firebase/firestore'
import { db } from '../config/firebase'

const SHEETS_API = '/sheets-api'

const generateClassCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

const classCodeExists = async (code) => {
  const q = query(collection(db, 'classes'), where('classCode', '==', code))
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

export const createClass = async (className, grade, section, teacherId, teacherName, sheetId = '') => {
  try {
    let classCode = generateClassCode()
    while (await classCodeExists(classCode)) {
      classCode = generateClassCode()
    }

    const classRef = doc(collection(db, 'classes'))
    await setDoc(classRef, {
      name: className,
      grade,
      section,
      teacherId,
      teacherName,
      classCode,
      sheetId,
      createdAt: serverTimestamp(),
      studentCount: 0
    })

    return { success: true, classId: classRef.id, classCode }
  } catch (error) {
    console.error('Error creating class:', error)
    return { success: false, error: error.message }
  }
}

export const getTeacherClasses = async (teacherId) => {
  try {
    const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId))
    const snapshot = await getDocs(q)
    const classes = []
    snapshot.forEach((doc) => {
      classes.push({ id: doc.id, ...doc.data() })
    })
    return classes.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error fetching teacher classes:', error)
    return []
  }
}

export const joinClass = async (classCode, studentId, studentName, studentEmail, gender = 'Male') => {
  try {
    console.log('Attempting to join class with code:', classCode)

    const q = query(collection(db, 'classes'), where('classCode', '==', classCode.toUpperCase()))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return { success: false, error: 'Invalid class code' }

    const classDoc = snapshot.docs[0]
    const classId = classDoc.id
    const classData = classDoc.data()

    // Check if already enrolled
    const studentRef = doc(db, 'classes', classId, 'students', studentId)
    const studentDoc = await getDoc(studentRef)
    if (studentDoc.exists()) return { success: false, error: 'You are already enrolled in this class' }

    // Add student to Firestore
    await setDoc(studentRef, {
      studentId,
      name: studentName,
      email: studentEmail,
      gender,
      joinedAt: serverTimestamp()
    })

    // Add student to Google Sheet INPUT_DATA if sheetId exists
    if (classData.sheetId) {
      try {
        const resp = await fetch(`${SHEETS_API}/add-student-to-sheet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetId: classData.sheetId,
            studentName,
            gender
          })
        })
        const result = await resp.json()
        console.log('Sheet add-student result:', result)
      } catch (sheetError) {
        console.error('Failed to add student to sheet (non-critical):', sheetError)
      }
    }

    // Update student count
    try {
      await updateDoc(classDoc.ref, { studentCount: increment(1) })
    } catch (countError) {
      console.error('Error updating count (non-critical):', countError)
    }

    return { success: true, classId, className: classData.name }
  } catch (error) {
    console.error('Error joining class:', error)
    return { success: false, error: error.message }
  }
}

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

export const getClassById = async (classId) => {
  try {
    const classRef = doc(db, 'classes', classId)
    const classDoc = await getDoc(classRef)
    if (classDoc.exists()) return { id: classDoc.id, ...classDoc.data() }
    return null
  } catch (error) {
    console.error('Error fetching class:', error)
    return null
  }
}

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

export const leaveClass = async (classId, studentId) => {
  try {
    const studentRef = doc(db, 'classes', classId, 'students', studentId)
    await deleteDoc(studentRef)
    const classRef = doc(db, 'classes', classId)
    await updateDoc(classRef, { studentCount: increment(-1) })
    return { success: true }
  } catch (error) {
    console.error('Error leaving class:', error)
    return { success: false, error: error.message }
  }
}

export const deleteClass = async (classId) => {
  try {
    const studentsRef = collection(db, 'classes', classId, 'students')
    const studentsSnapshot = await getDocs(studentsRef)
    const deletePromises = studentsSnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    const classRef = doc(db, 'classes', classId)
    await deleteDoc(classRef)
    return { success: true }
  } catch (error) {
    console.error('Error deleting class:', error)
    return { success: false, error: error.message }
  }
}

export const updateClassSheetId = async (classId, sheetId) => {
  try {
    const classRef = doc(db, 'classes', classId)
    await updateDoc(classRef, { sheetId })
    return { success: true }
  } catch (error) {
    console.error('Error updating class sheetId:', error)
    return { success: false, error: error.message }
  }
}
