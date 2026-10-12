import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { aFecha } from '@/shared/utils/fechas'

function masRecientesPrimero(filas) {
  return filas.sort((a, b) => (aFecha(b.fechaSolicitud)?.getTime() ?? 0) - (aFecha(a.fechaSolicitud)?.getTime() ?? 0))
}

// Historial de suscripciones de un doctor (más reciente primero).
export function useSuscripcionesDoctor(doctorId) {
  const [suscripciones, setSuscripciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!doctorId) return undefined
    return onSnapshot(
      query(collection(db, 'suscripciones'), where('doctorId', '==', doctorId)),
      (snap) => {
        setSuscripciones(masRecientesPrimero(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
        setCargando(false)
      },
      () => setCargando(false)
    )
  }, [doctorId])

  return { suscripciones, cargando }
}

// Para el admin: todas las suscripciones de todos los doctores.
export function useSuscripcionesAdmin() {
  const [suscripciones, setSuscripciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    return onSnapshot(
      collection(db, 'suscripciones'),
      (snap) => {
        setSuscripciones(masRecientesPrimero(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
        setCargando(false)
      },
      () => setCargando(false)
    )
  }, [])

  return { suscripciones, cargando }
}
