import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { aFecha } from '../utils/fechas'

// Notificaciones de una persona, en tiempo real, más recientes primero.
export function useNotificaciones(uid) {
  const [notificaciones, setNotificaciones] = useState([])

  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(query(collection(db, 'notificaciones'), where('paraUid', '==', uid)), (snap) => {
      const filas = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      filas.sort((a, b) => (aFecha(b.fecha)?.getTime() ?? 0) - (aFecha(a.fecha)?.getTime() ?? 0))
      setNotificaciones(filas)
    })
  }, [uid])

  const noLeidas = notificaciones.filter((n) => !n.leida).length
  return { notificaciones, noLeidas }
}
