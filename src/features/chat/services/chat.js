import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { crearNotificacion } from '@/features/notificaciones/services/notificaciones'

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
// `archivo`: { url, nombre, tamano, mime, duracion? } cuando `tipo` no es 'texto'. `deNombre` es el
// nombre de quien envía, para el texto de la notificación que recibe la otra persona. `pacienteRol`
// es el rol real de quien ocupa el "lugar" de pacienteId en esta conversación puntual: normalmente
// 'paciente', pero puede ser 'profesional' si un doctor le escribe/consulta a otro doctor (ver "Mis
// citas") — sin esto, la notificación lo mandaría al panel de paciente, al que no tiene acceso.
export async function enviarMensaje({ pacienteId, doctorId, de, deNombre, tipo, texto = '', archivo = null, pacienteRol = 'paciente' }) {
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

  const paraUid = de === pacienteId ? doctorId : pacienteId
  let enlace
  if (paraUid === doctorId) {
    // El que ocupa doctorId siempre es un profesional de verdad.
    enlace = `/doctor/mensajes/${pacienteId}`
  } else if (pacienteRol === 'paciente') {
    enlace = `/paciente/mensajes/${doctorId}`
  } else {
    enlace = `/doctor/mensajes/${doctorId}`
  }
  crearNotificacion({
    paraUid,
    tipo: 'mensaje_chat',
    texto: `${deNombre || 'Tienes un mensaje nuevo'}: ${resumenDeMensaje({ tipo, texto, archivo })}`.slice(0, 120),
    enlace,
  }).catch(() => {})
}

export function mensajeErrorEnvio(err) {
  if (err?.code === 'permission-denied') {
    return 'Firestore rechazó el mensaje: hay que publicar las reglas de firestore.rules (ver README).'
  }
  return 'No se pudo enviar el mensaje. Revisa tu conexión e intenta de nuevo.'
}
