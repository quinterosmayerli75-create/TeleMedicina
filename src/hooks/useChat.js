import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { aFecha } from '../utils/fechas'

// Conversaciones del usuario (más recientes primero). Se ordena aquí y no en la consulta para no
// necesitar un índice compuesto en Firestore.
export function useConversaciones(uid) {
  const [conversaciones, setConversaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) return undefined
    return onSnapshot(
      query(collection(db, 'conversaciones'), where('participantes', 'array-contains', uid)),
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        lista.sort((a, b) => (aFecha(b.ultimaFecha)?.getTime() ?? Date.now()) - (aFecha(a.ultimaFecha)?.getTime() ?? Date.now()))
        setConversaciones(lista)
        setError('')
        setCargando(false)
      },
      (err) => {
        setError(err?.code ?? 'error')
        setCargando(false)
      }
    )
  }, [uid])

  return { conversaciones, cargando, error }
}

// Mensajes de una conversación, en tiempo real.
export function useMensajes(convId) {
  const [estado, setEstado] = useState({ convId: null, mensajes: [], error: '' })

  useEffect(() => {
    if (!convId) return undefined
    return onSnapshot(
      query(collection(db, 'conversaciones', convId, 'mensajes'), orderBy('fecha', 'asc')),
      (snap) => setEstado({ convId, mensajes: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: '' }),
      (err) => setEstado({ convId, mensajes: [], error: err?.code ?? 'error' })
    )
  }, [convId])

  // Mientras llega la primera respuesta de una conversación nueva no se muestran mensajes de la anterior.
  const vigente = estado.convId === convId
  return { mensajes: vigente ? estado.mensajes : [], cargando: !vigente, error: vigente ? estado.error : '' }
}

// Nombre, foto y (si es doctor) disponibilidad de las personas con las que se conversa.
// `rolContacto`: 'profesional' si el que mira es un paciente; 'paciente' si el que mira es un doctor.
export function useContactos(ids, rolContacto) {
  const clave = useMemo(() => [...new Set(ids.filter(Boolean))].sort().join(','), [ids])
  const [contactos, setContactos] = useState({})

  useEffect(() => {
    let vigente = true
    const lista = clave ? clave.split(',') : []
    Promise.all(
      lista.map(async (id) => {
        try {
          const [usuarioSnap, profSnap] = await Promise.all([
            getDoc(doc(db, 'usuarios', id)),
            rolContacto === 'profesional' ? getDoc(doc(db, 'profesionales', id)) : null,
          ])
          if (!usuarioSnap.exists()) return [id, { existe: false }]
          const u = usuarioSnap.data()
          return [
            id,
            {
              existe: true,
              id,
              nombre: [u.nombre, u.apellido].filter(Boolean).join(' ') || 'Usuario',
              fotoUrl: u.fotoUrl ?? '',
              enLinea: profSnap?.exists() ? profSnap.data().disponibleAhora ?? false : null,
            },
          ]
        } catch {
          return [id, { existe: false }]
        }
      })
    ).then((pares) => vigente && setContactos(Object.fromEntries(pares)))
    return () => {
      vigente = false
    }
  }, [clave, rolContacto])

  return contactos
}
