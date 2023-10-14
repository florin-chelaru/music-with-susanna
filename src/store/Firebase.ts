import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyCkXG9QlcRtkNLAoGA7IWSyXIsMhUtjClc',
  authDomain: 'music-with-susanna.firebaseapp.com',
  databaseURL: 'https://music-with-susanna-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'music-with-susanna',
  storageBucket: 'music-with-susanna.appspot.com',
  messagingSenderId: '1018868926713',
  appId: '1:1018868926713:web:34ce74146fda3456a0ba28',
  measurementId: 'G-3L59K9MPM2'
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const analytics = getAnalytics(app)
export const auth = getAuth(app)
export const database = getDatabase(app)
