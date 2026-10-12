import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { nombreSeguro, subirArchivo } from '@/services/archivos'
import { notificarAdmins } from '@/features/notificaciones/services/notificaciones'

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
    })
  }
}
