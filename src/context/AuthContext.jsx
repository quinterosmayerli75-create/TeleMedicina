import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [rol, setRol] = useState(null)
  const [estado, setEstado] = useState(null)
  const [cargando, setCargando] = useState(true)

  const refrescarRol = useCallback(async (uid) => {
    const idUsuario = uid ?? auth.currentUser?.uid
    if (!idUsuario) return null

    const snap = await getDoc(doc(db, 'usuarios', idUsuario))
    const datos = snap.exists() ? snap.data() : null
    setRol(datos?.rol ?? null)
    setEstado(datos?.estado ?? null)
    return datos?.rol ?? null
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUsuario(null)
        setRol(null)
        setEstado(null)
        setCargando(false)
        return
      }

      setUsuario(firebaseUser)
      await refrescarRol(firebaseUser.uid)
      setCargando(false)
    })

    return unsubscribe
  }, [refrescarRol])

  return (
    <AuthContext.Provider value={{ usuario, rol, estado, cargando, refrescarRol }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
