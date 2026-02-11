import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyA_e_UWIhlezt3gIOyW_3M5cIrElWPZEqc",
  authDomain: "nexxus-d7a9f.firebaseapp.com",
  projectId: "nexxus-d7a9f",
  storageBucket: "nexxus-d7a9f.firebasestorage.app",
  messagingSenderId: "1099447410281",
  appId: "1:1099447410281:web:b07681c809e830d5dd0cf8",
  measurementId: "G-7CYD6E15RT"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const analytics = getAnalytics(app)

export default app
