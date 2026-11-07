import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { notificarAdmins } from '@/features/notificaciones/services/notificaciones'

// Una calificación por paciente y doctor: el id del documento es "{doctorId}_{pacienteId}", así si el
// paciente vuelve a calificar se actualiza la suya en vez de sumar otra.
export const idCalificacion = (doctorId, pacienteId) => `${doctorId}_${pacienteId}`

export function promedioDe(calificaciones) {
  const notas = calificaciones.map((c) => Number(c.estrellas) || 0).filter((n) => n >= 1)
  if (notas.length === 0) return { promedio: 0, total: 0 }
  const suma = notas.reduce((a, b) => a + b, 0)
  return { promedio: Math.round((suma / notas.length) * 10) / 10, total: notas.length }
}

// Guarda la calificación del paciente y recalcula el promedio del doctor (`calificacionPromedio`), que es
// el que usan las tarjetas, el filtro por estrellas y el ranking del admin. Devuelve
// { promedioActualizado } para poder avisar si la calificación se guardó pero el promedio no.
export async function guardarCalificacion({ doctorId, pacienteId, estrellas, comentario, consultaId }) {
  await setDoc(doc(db, 'calificaciones', idCalificacion(doctorId, pacienteId)), {
    doctorId,
    pacienteId,
    estrellas,
    comentario: (comentario ?? '').trim(),
    consultaId,
    fecha: serverTimestamp(),
  })

  try {
    const snap = await getDocs(query(collection(db, 'calificaciones'), where('doctorId', '==', doctorId)))
    const { promedio, total } = promedioDe(snap.docs.map((d) => d.data()))
    await updateDoc(doc(db, 'profesionales', doctorId), { calificacionPromedio: promedio, totalCalificaciones: total })
    return { promedioActualizado: true }
  } catch {
    return { promedioActualizado: false }
  }
}

// El doctor no puede borrar un comentario, solo denunciarlo — el admin decide qué hacer (ver
// admin/ComentariosDenunciados.jsx). Reutiliza la colección "reportes" (igual que las denuncias
// entre personas), marcado con tipoDenuncia: 'comentario' para poder filtrarlo aparte.
export async function denunciarComentario({ doctorId, pacienteId, calificacionId, comentario, motivo }) {
  const ref = await addDoc(collection(db, 'reportes'), {
    denuncianteId: doctorId,
    denunciadoId: pacienteId,
    tipoDenuncia: 'comentario',
    calificacionId,
    comentarioTexto: comentario,
    motivo,
    estado: 'pendiente',
    fecha: serverTimestamp(),
  })
  notificarAdmins({
    tipo: 'denuncia_comentario',
    texto: 'Un doctor denunció un comentario de un paciente. Revísalo en Comentarios denunciados.',
    enlace: '/admin/comentarios-denunciados',
  }).catch(() => {})
  return ref
}

// El admin oculta un comentario denunciado: no se borra de la base de datos, solo deja de
// mostrarse en el perfil público del doctor.
export function ocultarComentario(calificacionId) {
  return updateDoc(doc(db, 'calificaciones', calificacionId), { oculto: true })
}

// Cierra una denuncia de comentario sin bloquear al paciente (ocultar el comentario o solo
// mandarle un aviso). Para suspender temporal o definitivamente se usa bloquearUsuario() con
// reporteId — esa función ya marca la denuncia como resuelta sola.
export function resolverDenunciaComentario(reporteId, { accion, notaAdmin = '' }) {
  return updateDoc(doc(db, 'reportes', reporteId), {
    estado: 'resuelta',
    accion,
    notaAdmin,
    resueltaEn: serverTimestamp(),
  })
}
