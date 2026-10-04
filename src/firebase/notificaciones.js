import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './config'

// Notificación dentro de la app para una persona concreta (campanita). `enlace` es la ruta interna
// a la que se navega al tocarla (ej. "/paciente/consultas/abc123").
export function crearNotificacion({ paraUid, tipo, texto, enlace = '' }) {
  return addDoc(collection(db, 'notificaciones'), { paraUid, tipo, texto, enlace, leida: false, fecha: serverTimestamp() })
}

export function marcarNotificacionLeida(id) {
  return updateDoc(doc(db, 'notificaciones', id), { leida: true })
}
