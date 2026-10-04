import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './config'
import { nombreSeguro, subirArchivo } from '../utils/archivos'
import { crearNotificacion } from './notificaciones'

export const MODALIDADES = {
  chat: { etiqueta: 'Chat de texto', icono: '💬' },
  llamada: { etiqueta: 'Llamada de voz', icono: '📞' },
  video: { etiqueta: 'Videollamada', icono: '🎥' },
}

export const ESTADOS_CONSULTA = {
  pendiente_pago: { etiqueta: 'Pendiente de pago', clase: 'status-pending' },
  pago_en_revision: { etiqueta: 'Pago en revisión', clase: 'status-pending' },
  habilitada: { etiqueta: 'Habilitada', clase: 'status-active' },
  rechazada: { etiqueta: 'Pago rechazado', clase: 'status-blocked' },
  finalizada: { etiqueta: 'Finalizada', clase: 'status-active' },
  cancelada: { etiqueta: 'Cancelada', clase: 'status-blocked' },
}

// Crea la solicitud de consulta para una fecha y hora concretas; queda "pendiente_pago" hasta que el
// paciente suba su comprobante.
export async function crearConsulta({ pacienteId, pacienteNombre, doctorId, doctorNombre, modalidad, costoConsulta, fecha, hora }) {
  const ref = await addDoc(collection(db, 'consultas'), {
    pacienteId,
    pacienteNombre,
    doctorId,
    doctorNombre,
    modalidad,
    costoConsulta,
    fecha,
    hora,
    estado: 'pendiente_pago',
    comprobanteUrl: '',
    motivoRechazo: '',
    fechaSolicitud: serverTimestamp(),
  })
  crearNotificacion({
    paraUid: doctorId,
    tipo: 'consulta_solicitada',
    texto: `${pacienteNombre || 'Un paciente'} te solicitó una consulta para el ${fecha} a las ${hora}.`,
    enlace: `/doctor/consultas/${ref.id}`,
  }).catch(() => {})
  return ref.id
}

// Sube la foto del comprobante de pago y deja la consulta en revisión por el admin.
export async function subirComprobante(consulta, archivo, onProgreso) {
  const { url } = await subirArchivo(
    `consultas/${consulta.id}/comprobante-${Date.now()}-${nombreSeguro(archivo.name)}`,
    archivo,
    onProgreso
  )
  await updateDoc(doc(db, 'consultas', consulta.id), {
    comprobanteUrl: url,
    estado: 'pago_en_revision',
    motivoRechazo: '',
    fechaPago: serverTimestamp(),
  })
  return url
}

// El paciente cancela una solicitud antes de pagar.
export function cancelarConsulta(id) {
  return updateDoc(doc(db, 'consultas', id), { estado: 'cancelada' })
}

// El admin aprueba o rechaza el comprobante subido.
export function validarPago(id, { aprobado, motivoRechazo = '' }) {
  return updateDoc(doc(db, 'consultas', id), {
    estado: aprobado ? 'habilitada' : 'rechazada',
    motivoRechazo: aprobado ? '' : motivoRechazo,
    fechaValidacion: serverTimestamp(),
  })
}

// Paciente o doctor marcan la consulta como finalizada una vez atendida.
export function finalizarConsulta(id) {
  return updateDoc(doc(db, 'consultas', id), { estado: 'finalizada', fechaFinalizacion: serverTimestamp() })
}
