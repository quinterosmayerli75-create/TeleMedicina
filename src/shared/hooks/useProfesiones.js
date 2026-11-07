import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { PROFESIONES_BASE } from '@/shared/utils/profesiones'

// Lista de carreras para los selects de registro y categorías: las 4 de siempre + las que el
// admin fue agregando en "Carreras" (colección "carreras" en Firestore, solo nombre libre).
export function useProfesiones() {
  const [extra, setExtra] = useState([])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'carreras'), (snap) => {
      setExtra(snap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre })))
    })
    return unsubscribe
  }, [])

  const nombres = [...PROFESIONES_BASE, ...extra.map((c) => c.nombre).filter((n) => n && !PROFESIONES_BASE.includes(n))]
  return { profesiones: nombres, extra }
}
