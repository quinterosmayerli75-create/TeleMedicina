import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { aFecha } from '../utils/fechas'
import { promedioDe } from '../firebase/calificaciones'

// "Ana Paredes Rojas" -> "Ana P." (en las reseñas públicas no se muestra el nombre completo).
function nombreCorto(usuario) {
  const nombre = (usuario?.nombre ?? '').trim().split(/\s+/)[0]
  const inicial = (usuario?.apellido ?? '').trim()[0]
  if (!nombre) return 'Paciente'
  return inicial ? `${nombre} ${inicial.toUpperCase()}.` : nombre
}

// Calificaciones de un doctor en tiempo real, de la más reciente a la más antigua, con el nombre corto
// de quien calificó y el promedio calculado.
export function useCalificaciones(doctorId) {
  const [calificaciones, setCalificaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!doctorId) return undefined
    return onSnapshot(
      query(collection(db, 'calificaciones'), where('doctorId', '==', doctorId)),
      async (snap) => {
        try {
          const filas = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (aFecha(b.fecha)?.getTime() ?? Date.now()) - (aFecha(a.fecha)?.getTime() ?? Date.now()))
          const conNombre = await Promise.all(
            filas.map(async (fila, i) => {
              if (i >= 30) return { ...fila, nombre: 'Paciente' }
              const usuario = await getDoc(doc(db, 'usuarios', fila.pacienteId)).catch(() => null)
              return { ...fila, nombre: nombreCorto(usuario?.exists() ? usuario.data() : null) }
            })
          )
          setCalificaciones(conNombre)
          setError(false)
        } catch {
          setError(true)
        } finally {
          setCargando(false)
        }
      },
      () => {
        setError(true)
        setCargando(false)
      }
    )
  }, [doctorId])

  return { calificaciones, cargando, error, ...promedioDe(calificaciones) }
}
