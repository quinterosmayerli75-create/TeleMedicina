import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { aFecha } from '../utils/fechas'

// Informes médicos del doctor, en tiempo real, del más reciente al más antiguo.
export function useInformes(doctorId) {
  const [informes, setInformes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!doctorId) return undefined
    return onSnapshot(
      query(collection(db, 'informes'), where('doctorId', '==', doctorId)),
      (snap) => {
        const filas = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (aFecha(b.fecha)?.getTime() ?? 0) - (aFecha(a.fecha)?.getTime() ?? 0))
        setInformes(filas)
        setError(false)
        setCargando(false)
      },
      () => {
        setError(true)
        setCargando(false)
      }
    )
  }, [doctorId])

  return { informes, cargando, error }
}

// Un informe por su id (para verlo o editarlo). Solo devuelve informes del doctor que lo pide.
export function useInforme(id, doctorId) {
  const [informe, setInforme] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    if (!id || !doctorId) return undefined
    getDoc(doc(db, 'informes', id))
      .then((snap) => {
        if (!vigente) return
        const datos = snap.exists() ? { id: snap.id, ...snap.data() } : null
        setInforme(datos && datos.doctorId === doctorId ? datos : null)
      })
      .catch(() => vigente && setInforme(null))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [id, doctorId])

  return { informe, cargando }
}
