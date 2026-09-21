import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { reactivarBloqueoVencido } from '../firebase/bloqueos'
import { bloqueoVencido, estadoEfectivo } from '../utils/bloqueos'
import { aFecha } from '../utils/fechas'

const AuthContext = createContext(null)

// setTimeout no admite plazos mayores a ~24 días.
const MAX_ESPERA_MS = 2 ** 31 - 1

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [reloj, setReloj] = useState(0)
  const reactivando = useRef(false)

  // Lectura puntual del perfil; la usan los registros justo después de crear el documento.
  const refrescarRol = useCallback(async (uid) => {
    const idUsuario = uid ?? auth.currentUser?.uid
    if (!idUsuario) return null

    const snap = await getDoc(doc(db, 'usuarios', idUsuario))
    const datos = snap.exists() ? snap.data() : null
    setPerfil(datos)
    return datos?.rol ?? null
  }, [])

  // El perfil se escucha en vivo: si un admin bloquea o reactiva la cuenta mientras la persona está
  // dentro, el panel cambia al instante en vez de esperar al próximo inicio de sesión.
  useEffect(() => {
    let cancelarPerfil = () => {}
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      cancelarPerfil()
      if (!firebaseUser) {
        setUsuario(null)
        setPerfil(null)
        setCargando(false)
        return
      }

      setUsuario(firebaseUser)
      cancelarPerfil = onSnapshot(
        doc(db, 'usuarios', firebaseUser.uid),
        (snap) => {
          setPerfil(snap.exists() ? snap.data() : null)
          setCargando(false)
        },
        () => {
          setPerfil(null)
          setCargando(false)
        }
      )
    })

    return () => {
      cancelarPerfil()
      unsubscribe()
    }
  }, [])

  // Bloqueo temporal: al cumplirse el plazo la cuenta se reactiva sola (y mientras la persona está
  // dentro, el reloj vuelve a evaluar el estado justo cuando vence).
  useEffect(() => {
    if (!usuario || perfil?.estado !== 'bloqueado_temporal') return undefined

    if (bloqueoVencido(perfil)) {
      if (!reactivando.current) {
        reactivando.current = true
        // Si falla (por ejemplo, reglas sin publicar) igual se trata como activa en pantalla.
        reactivarBloqueoVencido(usuario.uid, perfil)
          .catch(() => {})
          .finally(() => { reactivando.current = false })
      }
      return undefined
    }

    const hasta = aFecha(perfil.bloqueadoHasta)
    if (!hasta) return undefined
    const espera = Math.min(Math.max(hasta.getTime() - Date.now(), 0) + 500, MAX_ESPERA_MS)
    const temporizador = setTimeout(() => setReloj((n) => n + 1), espera)
    return () => clearTimeout(temporizador)
  }, [usuario, perfil, reloj])

  const rol = perfil?.rol ?? null
  const estado = perfil ? estadoEfectivo(perfil) : null
  // El super admin es un administrador con `superadmin: true` en su documento de "usuarios".
  const esSuperAdmin = rol === 'administrador' && perfil?.superadmin === true

  return (
    <AuthContext.Provider value={{ usuario, perfil, rol, estado, esSuperAdmin, cargando, refrescarRol }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
