import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from './config'

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
export async function guardarCalificacion({ doctorId, pacienteId, estrellas, comentario }) {
  await setDoc(doc(db, 'calificaciones', idCalificacion(doctorId, pacienteId)), {
    doctorId,
    pacienteId,
    estrellas,
    comentario: (comentario ?? '').trim(),
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
