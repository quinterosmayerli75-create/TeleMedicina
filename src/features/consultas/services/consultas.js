import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { nombreSeguro, subirArchivo } from '@/services/archivos'
import { crearNotificacion } from '@/features/notificaciones/services/notificaciones'

export const MODALIDADES = {
  chat: { etiqueta: 'Chat de texto', icono: '💬' },
  llamada: { etiqueta: 'Llamada de voz', icono: '📞' },
  video: { etiqueta: 'Videollamada', icono: '🎥' },
}

// Etiqueta y color de cada estado, para que se vean claros y distintos entre sí en toda la app
// (tarjetas de "Mis consultas", validación de pagos, detalle de la consulta, etc.).
export const ESTADOS_CONSULTA = {
  pendiente_pago: { etiqueta: 'Pago pendiente', clase: 'status-pending' },
  pago_en_revision: { etiqueta: 'En espera de confirmación', clase: 'status-warn' },
  habilitada: { etiqueta: 'Habilitada para consulta', clase: 'status-active' },
  rechazada: { etiqueta: 'Pago rechazado', clase: 'status-blocked' },
  finalizada: { etiqueta: 'Consulta finalizada', clase: 'status-active' },
  cancelada: { etiqueta: 'Cancelada', clase: 'status-blocked' },
}

// Crea la solicitud de consulta para una fecha y hora concretas; queda "pendiente_pago" hasta que el
// paciente suba su comprobante. `pacienteEsDoctor`: true cuando quien pide la consulta es en
// realidad otro doctor (ver "Mis citas" en useRutas.js) — así el recordatorio de pago lo manda a
// su panel de doctor, no al de paciente (al que no tiene acceso).
export async function crearConsulta({ pacienteId, pacienteNombre, doctorId, doctorNombre, modalidad, costoConsulta, fecha, hora, pacienteEsDoctor = false }) {
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
  // Recordatorio para el propio paciente: sin esto paga en el momento o se olvida y la solicitud
  // queda "pago pendiente" sin que nada se lo recuerde después.
  crearNotificacion({
    paraUid: pacienteId,
    tipo: 'recordatorio_pago_consulta',
    texto: `Recuerda pagar tu consulta con ${doctorNombre} (Bs ${costoConsulta}) para que se habilite.`,
    enlace: `${pacienteEsDoctor ? '/doctor/mis-citas' : '/paciente/consultas'}/${ref.id}`,
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
  crearNotificacion({
    paraUid: consulta.doctorId,
    tipo: 'pago_subido',
    texto: `${consulta.pacienteNombre || 'Un paciente'} subió su comprobante de pago. Revísalo para habilitar la consulta.`,
    enlace: `/doctor/validacion-pagos`,
  }).catch(() => {})
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

async function recordarConsultasDe(uid, campoUid, campoRecordado, enlaceBase) {
  const hoy = new Date().toISOString().slice(0, 10)
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  // Solo un "where" (filtra por uid) y el resto (estado, fecha) se revisa en el código: así no
  // hace falta crear un índice compuesto en Firestore, igual que el resto de consultas en el proyecto.
  const snap = await getDocs(query(collection(db, 'consultas'), where(campoUid, '==', uid)))
  for (const d of snap.docs) {
    const c = d.data()
    if (c.estado !== 'habilitada' || (c.fecha !== hoy && c.fecha !== manana)) continue
    if (c[campoRecordado]) continue
    await updateDoc(d.ref, { [campoRecordado]: true })
    const otro = campoUid === 'pacienteId' ? c.doctorNombre : c.pacienteNombre
    crearNotificacion({
      paraUid: uid,
      tipo: 'recordatorio_consulta',
      texto: `Tienes una consulta ${c.fecha === hoy ? 'hoy' : 'mañana'} a las ${c.hora} con ${otro || 'tu contacto'}.`,
      enlace: `${enlaceBase}/${d.id}`,
    }).catch(() => {})
  }
}

// Revisión "perezosa" (sin backend/cron): cada vez que la persona entra a su panel, se fija si
// tiene una consulta habilitada para hoy o mañana (como paciente o como doctor) y, si todavía no
// le avisó, le manda un recordatorio una sola vez por consulta (campoRecordado lo marca).
export async function revisarRecordatorioConsulta(uid) {
  if (!uid) return
  const usuarioSnap = await getDoc(doc(db, 'usuarios', uid))
  const esDoctorReal = usuarioSnap.exists() && usuarioSnap.data().rol === 'profesional'
  await recordarConsultasDe(uid, 'pacienteId', 'recordatorioPacienteEnviado', esDoctorReal ? '/doctor/mis-citas' : '/paciente/consultas')
  if (esDoctorReal) {
    await recordarConsultasDe(uid, 'doctorId', 'recordatorioDoctorEnviado', '/doctor/consultas')
  }
}

// Plazo que tiene el paciente para subir el comprobante antes de que la solicitud se cancele sola.
export const HORAS_LIMITE_PAGO = 24

async function cancelarPagosVencidosDe(uid, campoUid) {
  // Mismo truco de un solo "where": filtra por uid y revisa estado/fecha en el código.
  const snap = await getDocs(query(collection(db, 'consultas'), where(campoUid, '==', uid)))
  const ahora = Date.now()
  for (const d of snap.docs) {
    const c = d.data()
    if (c.estado !== 'pendiente_pago') continue
    const solicitada = c.fechaSolicitud?.toDate?.()
    if (!solicitada || ahora - solicitada.getTime() < HORAS_LIMITE_PAGO * 3600000) continue
    await updateDoc(d.ref, { estado: 'cancelada', motivoRechazo: 'No se subió el comprobante de pago dentro de las 24 horas.' })
    crearNotificacion({
      paraUid: c.pacienteId,
      tipo: 'consulta_vencida',
      texto: `Tu solicitud de consulta con ${c.doctorNombre || 'el doctor'} se canceló: pasaron 24 horas sin subir el comprobante de pago.`,
      enlace: `/paciente/consultas/${d.id}`,
    }).catch(() => {})
    crearNotificacion({
      paraUid: c.doctorId,
      tipo: 'consulta_vencida',
      texto: `La solicitud de ${c.pacienteNombre || 'un paciente'} se canceló sola: no subió el comprobante de pago a tiempo.`,
      enlace: `/doctor/consultas/${d.id}`,
    }).catch(() => {})
  }
}

// Revisión perezosa, igual que revisarRecordatorioConsulta: cancela solicitudes "pago pendiente"
// con más de 24 horas sin comprobante, para liberar el horario y no dejar al doctor esperando.
export async function revisarVencimientoPago(uid) {
  if (!uid) return
  await cancelarPagosVencidosDe(uid, 'pacienteId')
  const usuarioSnap = await getDoc(doc(db, 'usuarios', uid))
  if (usuarioSnap.exists() && usuarioSnap.data().rol === 'profesional') {
    await cancelarPagosVencidosDe(uid, 'doctorId')
  }
}

async function finalizarVencidasDe(uid, campoUid) {
  const hoy = new Date().toISOString().slice(0, 10)
  const snap = await getDocs(query(collection(db, 'consultas'), where(campoUid, '==', uid)))
  for (const d of snap.docs) {
    const c = d.data()
    if (c.estado !== 'habilitada' || !c.fecha || c.fecha >= hoy) continue
    await updateDoc(d.ref, { estado: 'finalizada', fechaFinalizacion: serverTimestamp() })
  }
}

// Revisión perezosa: una consulta "habilitada" cuya fecha ya pasó se marca sola como finalizada,
// para que no se quede colgada en "pendientes" si nadie apretó el botón "Marcar como finalizada".
export async function revisarFinalizacionAutomatica(uid) {
  if (!uid) return
  await finalizarVencidasDe(uid, 'pacienteId')
  const usuarioSnap = await getDoc(doc(db, 'usuarios', uid))
  if (usuarioSnap.exists() && usuarioSnap.data().rol === 'profesional') {
    await finalizarVencidasDe(uid, 'doctorId')
  }
}
