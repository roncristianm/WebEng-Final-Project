import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "REDACTED",
  authDomain: "nexxus-65975.firebaseapp.com",
  projectId: "nexxus-65975",
  storageBucket: "nexxus-65975.firebasestorage.app",
  messagingSenderId: "421245750303",
  appId: "1:421245750303:web:4b99e5f9877880112cd92a",
  measurementId: "G-H60CE88R72"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const analytics = getAnalytics(app)

export default app
