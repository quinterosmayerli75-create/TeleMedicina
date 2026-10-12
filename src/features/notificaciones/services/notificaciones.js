import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'

// Notificación dentro de la app para una persona concreta (campanita). `enlace` es la ruta interna
// a la que se navega al tocarla (ej. "/paciente/consultas/abc123").
export function crearNotificacion({ paraUid, tipo, texto, enlace = '' }) {
  return addDoc(collection(db, 'notificaciones'), { paraUid, tipo, texto, enlace, leida: false, fecha: serverTimestamp() })
}

// Avisa a todas las cuentas de administrador (ej. nueva solicitud de registro profesional).
export async function notificarAdmins({ tipo, texto, enlace = '' }) {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'administrador')))
  await Promise.all(
    snap.docs.map((d) => crearNotificacion({ paraUid: d.id, tipo, texto, enlace }).catch(() => {}))
  )
}

export function marcarNotificacionLeida(id) {
  return updateDoc(doc(db, 'notificaciones', id), { leida: true })
}
