import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'

// Avisa si alguien te está llamando ahora mismo, en cualquier conversación (no solo la que tienes
// abierta) — así se ve la llamada entrante aunque estés en otra pantalla de la app.
export function useLlamadaEntrante(miUid) {
  const [entrante, setEntrante] = useState(null)

  useEffect(() => {
    if (!miUid) return undefined
    return onSnapshot(query(collection(db, 'llamadas'), where('participantes', 'array-contains', miUid)), async (snap) => {
      const doc1 = snap.docs.find((d) => {
        const datos = d.data()
        return datos.estado === 'llamando' && datos.llamanteId !== miUid
      })
      if (!doc1) {
        setEntrante(null)
        return
      }
      const datos = { id: doc1.id, ...doc1.data() }
      const llamanteSnap = await getDoc(doc(db, 'usuarios', datos.llamanteId)).catch(() => null)
      setEntrante({ ...datos, nombre: llamanteSnap?.exists() ? llamanteSnap.data().nombre : 'Alguien' })
    })
  }, [miUid])

  return entrante
}
