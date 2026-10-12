import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { nombreSeguro, subirArchivo } from '@/services/archivos'
import { crearNotificacion, notificarAdmins } from '@/features/notificaciones/services/notificaciones'

// Días de anticipación para avisarle al doctor que su membresía está por vencer.
const DIAS_AVISO_VENCIMIENTO = 3

export const PLANES = {
  mensual: { etiqueta: 'Mensual', dias: 30 },
  anual: { etiqueta: 'Anual', dias: 365 },
}

export const ESTADOS_SUSCRIPCION = {
  pendiente_pago: { etiqueta: 'Pendiente de pago', clase: 'status-pending' },
  pago_en_revision: { etiqueta: 'Pago en revisión', clase: 'status-pending' },
  activa: { etiqueta: 'Activa', clase: 'status-active' },
  rechazada: { etiqueta: 'Pago rechazado', clase: 'status-blocked' },
}

// El doctor pide pagar su suscripción (mensual o anual); queda "pendiente_pago" hasta que suba su
// comprobante.
export async function solicitarSuscripcion({ doctorId, doctorNombre, plan, precio }) {
  const ref = await addDoc(collection(db, 'suscripciones'), {
    doctorId,
    doctorNombre,
    plan,
    precio,
    estado: 'pendiente_pago',
    comprobanteUrl: '',
    motivoRechazo: '',
    fechaSolicitud: serverTimestamp(),
  })
  return ref.id
}

export async function subirComprobanteSuscripcion(suscripcion, archivo, onProgreso) {
  const { url } = await subirArchivo(
    `suscripciones/${suscripcion.id}/comprobante-${Date.now()}-${nombreSeguro(archivo.name)}`,
    archivo,
    onProgreso
  )
  await updateDoc(doc(db, 'suscripciones', suscripcion.id), {
    comprobanteUrl: url,
    estado: 'pago_en_revision',
    motivoRechazo: '',
    fechaPago: serverTimestamp(),
  })
  notificarAdmins({
    tipo: 'suscripcion_pago',
    texto: `${suscripcion.doctorNombre || 'Un doctor'} subió el comprobante de su suscripción (${PLANES[suscripcion.plan]?.etiqueta ?? suscripcion.plan}).`,
    enlace: '/admin/suscripciones',
  }).catch(() => {})
  return url
}

// El admin aprueba o rechaza el comprobante de suscripción. Al aprobar, activa al doctor por el
// tiempo de su plan (profesionales/{doctorId}.suscripcionActiva + suscripcionVenceEl).
export async function validarSuscripcion(suscripcion, { aprobado, motivoRechazo = '' }) {
  await updateDoc(doc(db, 'suscripciones', suscripcion.id), {
    estado: aprobado ? 'activa' : 'rechazada',
    motivoRechazo: aprobado ? '' : motivoRechazo,
    fechaValidacion: serverTimestamp(),
  })
  if (aprobado) {
    const dias = PLANES[suscripcion.plan]?.dias ?? 30
    const vence = new Date(Date.now() + dias * 86400000)
    await updateDoc(doc(db, 'profesionales', suscripcion.doctorId), {
      suscripcionActiva: true,
      suscripcionVenceEl: vence.toISOString().slice(0, 10),
      suscripcionPlan: suscripcion.plan,
      // Se renovó: que el próximo ciclo de vencimiento pueda volver a avisar/suspender.
      avisoVencimientoEnviadoEl: '',
      avisoSuspensionEnviado: false,
    })
  }
}

// Revisa si la suscripción de un doctor está por vencer o ya venció, y actúa en consecuencia:
// avisa unos días antes, y si se pasó la fecha sin renovar, suspende la cuenta (la saca de las
// búsquedas y bloquea nuevas consultas) y avisa una sola vez. Sin backend/cron en este proyecto,
// se revisa "perezosamente" cada vez que el doctor entra a una pantalla (ver DoctorLayout.jsx).
export async function revisarVencimientoSuscripcion(doctorId, datos) {
  if (!datos?.suscripcionVenceEl) return

  const hoy = new Date().toISOString().slice(0, 10)
  const diasRestantes = Math.ceil((new Date(`${datos.suscripcionVenceEl}T00:00:00`) - new Date(`${hoy}T00:00:00`)) / 86400000)

  if (datos.suscripcionActiva && diasRestantes < 0) {
    await updateDoc(doc(db, 'profesionales', doctorId), { suscripcionActiva: false, avisoSuspensionEnviado: true })
    if (!datos.avisoSuspensionEnviado) {
      crearNotificacion({
        paraUid: doctorId,
        tipo: 'suscripcion_suspendida',
        texto: 'Tu membresía venció y tu cuenta fue suspendida: ya no apareces en las búsquedas ni puedes recibir nuevas consultas. Paga tu suscripción para reactivarla.',
        enlace: '/doctor/suscripcion',
      }).catch(() => {})
    }
    return
  }

  if (datos.suscripcionActiva && diasRestantes >= 0 && diasRestantes <= DIAS_AVISO_VENCIMIENTO && datos.avisoVencimientoEnviadoEl !== hoy) {
    await updateDoc(doc(db, 'profesionales', doctorId), { avisoVencimientoEnviadoEl: hoy })
    crearNotificacion({
      paraUid: doctorId,
      tipo: 'suscripcion_por_vencer',
      texto: diasRestantes === 0
        ? 'Tu membresía vence hoy. Renuévala para no perder visibilidad ante los pacientes.'
        : `Tu membresía vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} (${datos.suscripcionVenceEl}). Renuévala a tiempo para no quedar suspendido.`,
      enlace: '/doctor/suscripcion',
    }).catch(() => {})
  }
}
