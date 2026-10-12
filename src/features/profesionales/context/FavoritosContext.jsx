import { createContext, useContext, useEffect, useState } from 'react'

const CLAVE_STORAGE = 'doctop_favoritos'
const FavoritosContext = createContext(null)

// TODO(Sprint 1 - HU-26): reemplazar localStorage por la colección "favoritos" de Firestore.
export function FavoritosProvider({ children }) {
  const [favoritos, setFavoritos] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_STORAGE)) ?? []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(favoritos))
  }, [favoritos])

  function esFavorito(id) {
    return favoritos.includes(id)
  }

  function alternar(id) {
    setFavoritos((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
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
