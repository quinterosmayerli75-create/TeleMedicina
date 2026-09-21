import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './config'

// Una conversación por pareja paciente–doctor. El id lleva ambos uid (nunca contienen "_"),
// así las reglas de Firestore pueden saber quiénes participan sin leer otro documento.
export const idConversacion = (pacienteId, doctorId) => `${pacienteId}_${doctorId}`

const RESUMEN_POR_TIPO = {
  imagen: '📷 Foto',
  video: '🎥 Video',
  audio: '🎤 Audio',
}

export function resumenDeMensaje({ tipo, texto, archivo }) {
  if (tipo === 'texto') return texto
  if (tipo === 'documento') return `📎 ${archivo?.nombre ?? 'Documento'}`
  return RESUMEN_POR_TIPO[tipo] ?? 'Mensaje'
}

// Guarda un mensaje (texto o adjunto ya subido a Storage) y actualiza el resumen de la conversación.
// `archivo`: { url, nombre, tamano, mime, duracion? } cuando `tipo` no es 'texto'.
export async function enviarMensaje({ pacienteId, doctorId, de, tipo, texto = '', archivo = null }) {
  const convId = idConversacion(pacienteId, doctorId)
  await setDoc(
    doc(db, 'conversaciones', convId),
    {
      pacienteId,
      doctorId,
      participantes: [pacienteId, doctorId],
      ultimoMensaje: resumenDeMensaje({ tipo, texto, archivo }).slice(0, 120),
      ultimoDe: de,
      ultimaFecha: serverTimestamp(),
    },
    { merge: true }
  )
  await addDoc(collection(db, 'conversaciones', convId, 'mensajes'), {
    de,
    tipo,
    texto,
    archivo,
    fecha: serverTimestamp(),
  })
}

export function mensajeErrorEnvio(err) {
  if (err?.code === 'permission-denied') {
    return 'Firestore rechazó el mensaje: hay que publicar las reglas de firestore.rules (ver README).'
  }
  return 'No se pudo enviar el mensaje. Revisa tu conexión e intenta de nuevo.'
}
