// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD-xy2-hiZpu8byq_7TB-E0T2haf1X2s88",
  authDomain: "webeng-final-project-a2e02.firebaseapp.com",
  projectId: "webeng-final-project-a2e02",
  storageBucket: "webeng-final-project-a2e02.firebasestorage.app",
  messagingSenderId: "365714681774",
  appId: "1:365714681774:web:f2ac0f45f33303a433e23f",
  measurementId: "G-4LRXF77X73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const analytics = getAnalytics(app)

export default app
