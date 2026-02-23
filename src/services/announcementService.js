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
  orderBy
} from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Create a new announcement (Teacher)
 */
export const createAnnouncement = async (announcementData) => {
  try {
    const {
      title,
      content,
      classId,
      className,
      teacherId,
      teacherName
    } = announcementData

    const announcementRef = doc(collection(db, 'announcements'))
    await setDoc(announcementRef, {
      title,
      content,
      classId,
      className,
      teacherId,
      teacherName,
      createdAt: serverTimestamp()
    })

    return { success: true, announcementId: announcementRef.id }
  } catch (error) {
    console.error('Error creating announcement:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get announcements for a specific class
 */
export const getClassAnnouncements = async (classId) => {
  try {
    const q = query(
      collection(db, 'announcements'), 
      where('classId', '==', classId)
    )
    const snapshot = await getDocs(q)
    
    const announcements = []
    snapshot.forEach((doc) => {
      announcements.push({ id: doc.id, ...doc.data() })
    })
    
    // Sort client-side by createdAt (newest first)
    announcements.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
    
    return announcements
  } catch (error) {
    console.error('Error fetching class announcements:', error)
    return []
  }
}

/**
 * Get all announcements for a teacher
 */
export const getTeacherAnnouncements = async (teacherId) => {
  try {
    const q = query(
      collection(db, 'announcements'), 
      where('teacherId', '==', teacherId)
    )
    const snapshot = await getDocs(q)
    
    const announcements = []
    snapshot.forEach((doc) => {
      announcements.push({ id: doc.id, ...doc.data() })
    })
    
    // Sort client-side by createdAt (newest first)
    announcements.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
    
    return announcements
  } catch (error) {
    console.error('Error fetching teacher announcements:', error)
    return []
  }
}

/**
 * Get announcements for a student (all classes they're enrolled in)
 */
export const getStudentAnnouncements = async (studentId) => {
  try {
    // First, get all classes the student is enrolled in
    const classesRef = collection(db, 'classes')
    const allClassesSnapshot = await getDocs(classesRef)
    
    const enrolledClassIds = []
    
    for (const classDoc of allClassesSnapshot.docs) {
      const studentRef = doc(db, 'classes', classDoc.id, 'students', studentId)
      const studentDoc = await getDoc(studentRef)
      
      if (studentDoc.exists()) {
        enrolledClassIds.push(classDoc.id)
      }
    }
    
    if (enrolledClassIds.length === 0) {
      return []
    }
    
    // Get all announcements for those classes
    const announcementsRef = collection(db, 'announcements')
    const allAnnouncementsSnapshot = await getDocs(announcementsRef)
    
    const announcements = []
    allAnnouncementsSnapshot.forEach((doc) => {
      const data = doc.data()
      if (enrolledClassIds.includes(data.classId)) {
        announcements.push({ id: doc.id, ...data })
      }
    })
    
    // Sort by creation date (newest first)
    announcements.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0
      const bTime = b.createdAt?.toMillis?.() || 0
      return bTime - aTime
    })
    
    return announcements
  } catch (error) {
    console.error('Error fetching student announcements:', error)
    return []
  }
}

/**
 * Delete an announcement (Teacher)
 */
export const deleteAnnouncement = async (announcementId) => {
  try {
    const announcementRef = doc(db, 'announcements', announcementId)
    await deleteDoc(announcementRef)
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return { success: false, error: error.message }
  }
}
