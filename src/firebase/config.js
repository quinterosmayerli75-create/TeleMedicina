import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// NUNCA pegar aquí credenciales del Admin SDK / cuenta de servicio.
const firebaseConfig = {
  apiKey: 'AIzaSyC5222npHB86VJlgXrIrH78Dp8mIztmwSM',
  authDomain: 'telemedicina-81c89.firebaseapp.com',
  projectId: 'telemedicina-81c89',
  storageBucket: 'telemedicina-81c89.firebasestorage.app',
  messagingSenderId: '165801739226',
  appId: '1:165801739226:web:c4cffab63a39b4d03236e3',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export { firebaseConfig }
export default app
