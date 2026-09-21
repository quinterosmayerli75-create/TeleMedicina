import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'

// Cuentas hoy bloqueadas, con su perfil profesional (si es doctor) y la denuncia que originó el
// bloqueo (si la hubo).
//   estado 'bloqueado_temporal' -> bloqueo temporal aplicado desde una denuncia
//   estado 'bloqueado'          -> bloqueo definitivo desde una denuncia, o suspensión manual desde "Usuarios"
// `soloDoctores` limita el resultado a cuentas con rol 'profesional'.
export function useBloqueados(estado, { soloDoctores = false } = {}) {
  const [bloqueados, setBloqueados] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const restricciones = [where('estado', '==', estado)]
    if (soloDoctores) restricciones.push(where('rol', '==', 'profesional'))
    const accionEsperada = estado === 'bloqueado_temporal' ? 'bloqueo_temporal' : 'bloqueo_definitivo'

    let vigente = true
    const cancelar = onSnapshot(
      query(collection(db, 'usuarios'), ...restricciones),
      async (snap) => {
        try {
          const filas = await Promise.all(
            snap.docs.map(async (docSnap) => {
              const usuario = { id: docSnap.id, ...docSnap.data() }
              // Si falla alguna lectura de detalle, la cuenta igual aparece en la lista.
              const [profSnap, denunciasSnap] = await Promise.all([
                usuario.rol === 'profesional' ? getDoc(doc(db, 'profesionales', usuario.id)).catch(() => null) : null,
                getDocs(query(collection(db, 'reportes'), where('denunciadoId', '==', usuario.id))).catch(() => null),
              ])
              const denuncia = (denunciasSnap?.docs ?? [])
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((d) => d.estado === 'resuelta' && d.accion === accionEsperada)
                .pop() ?? null
              return { ...usuario, profesional: profSnap?.exists() ? profSnap.data() : null, denuncia }
            })
          )
          if (vigente) setBloqueados(filas)
        } finally {
          if (vigente) setCargando(false)
        }
      },
      () => vigente && setCargando(false)
    )
    return () => {
      vigente = false
      cancelar()
    }
  }, [estado, soloDoctores])

  return { bloqueados, cargando }
}
