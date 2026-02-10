import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * Fetch user data from Firestore
 * @param {string} userId - The user's UID from Firebase Auth
 * @returns {Promise<Object|null>} User data object or null if not found
 */
export const getUserData = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)
    
    if (userDoc.exists()) {
      return userDoc.data()
    }
    return null
  } catch (error) {
    console.error('Error fetching user data:', error)
    return null
  }
}

/**
 * Get the user's role (student or teacher)
 * @param {string} userId - The user's UID from Firebase Auth
 * @returns {Promise<string|null>} User role ('student' or 'teacher') or null
 */
export const getUserRole = async (userId) => {
  const userData = await getUserData(userId)
  return userData?.role || null
}

/**
 * Check if user is a student
 * @param {string} userId - The user's UID from Firebase Auth
 * @returns {Promise<boolean>}
 */
export const isStudent = async (userId) => {
  const role = await getUserRole(userId)
  return role === 'student'
}

/**
 * Check if user is a teacher
 * @param {string} userId - The user's UID from Firebase Auth
 * @returns {Promise<boolean>}
 */
export const isTeacher = async (userId) => {
  const role = await getUserRole(userId)
  return role === 'teacher'
}
