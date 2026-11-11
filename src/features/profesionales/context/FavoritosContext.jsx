import { createContext, useContext, useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { useAuth } from '@/features/auth/context/AuthContext'

const FavoritosContext = createContext(null)

// Favoritos guardados en Firestore, uno por cuenta: antes vivían en localStorage (compartido por
// todo el navegador), así que una cuenta nueva heredaba los favoritos de la cuenta anterior que
// usó el mismo navegador. El id del documento es "{usuarioId}_{doctorId}" para poder togglear con
// un simple setDoc/deleteDoc, sin tener que leer antes.
export function FavoritosProvider({ children }) {
  const { usuario } = useAuth()
  const [favoritos, setFavoritos] = useState([])

  useEffect(() => {
    if (!usuario) {
      setFavoritos([])
      return undefined
    }
    return onSnapshot(
      query(collection(db, 'favoritos'), where('usuarioId', '==', usuario.uid)),
      (snap) => setFavoritos(snap.docs.map((d) => d.data().doctorId)),
      () => setFavoritos([])
    )
  }, [usuario])

  function esFavorito(id) {
    return favoritos.includes(id)
  }

  function alternar(id) {
    if (!usuario) return
    const ref = doc(db, 'favoritos', `${usuario.uid}_${id}`)
    if (favoritos.includes(id)) {
      deleteDoc(ref).catch(() => {})
    } else {
      setDoc(ref, { usuarioId: usuario.uid, doctorId: id, fecha: serverTimestamp() }).catch(() => {})
    }
  }

  return (
    <FavoritosContext.Provider value={{ favoritos, esFavorito, alternar }}>
      {children}
    </FavoritosContext.Provider>
  )
}

export function useFavoritos() {
  return useContext(FavoritosContext)
}
