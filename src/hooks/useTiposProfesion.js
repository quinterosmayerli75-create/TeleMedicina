import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export function useTiposProfesion() {
  const [tipos, setTipos] = useState([])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tiposProfesion'), (snap) => {
      setTipos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsubscribe
  }, [])

  return tipos
}
