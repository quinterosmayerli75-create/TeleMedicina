import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { obtenerTitulos } from '../utils/documentosDoctor'
import { estadoEfectivo } from '../utils/bloqueos'

// Profesionales verificados por el admin, con sus datos públicos de "usuarios" incluidos.
// Si quien mira es un doctor (que consulta a otros doctores como un paciente), no se incluye a sí mismo.
export function useProfesionalesActivos() {
  const { usuario, rol } = useAuth()
  const [todos, setProfesionales] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'profesionales'), where('verificado', '==', true))
    const unsubscribe = onSnapshot(q, async (snap) => {
      const todas = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const datos = docSnap.data()
          const usuarioSnap = await getDoc(doc(db, 'usuarios', docSnap.id))
          const usuario = usuarioSnap.exists() ? usuarioSnap.data() : {}
          // Un doctor bloqueado (temporal o permanentemente) no aparece para los pacientes.
          const estado = estadoEfectivo(usuario)
          if (estado && estado !== 'activo') return null
          return {
            id: docSnap.id,
            nombre: usuario.nombre ?? 'Profesional',
            fotoUrl: usuario.fotoUrl ?? '',
            profesion: datos.profesion,
            especialidad: datos.especialidad,
            experiencia: datos.experiencia,
            descripcion: datos.descripcion,
            carnet: datos.carnet,
            costoConsulta: datos.costoConsulta ?? 0,
            calificacionPromedio: datos.calificacionPromedio ?? 0,
            disponibleAhora: datos.disponibleAhora ?? false,
            modalidades: datos.modalidades ?? [false, false, false],
          }
        })
      )
      setProfesionales(todas.filter(Boolean))
      setCargando(false)
    })
    return unsubscribe
  }, [])

  const profesionales = useMemo(
    () => (rol === 'profesional' ? todos.filter((p) => p.id !== usuario?.uid) : todos),
    [todos, rol, usuario]
  )

  return { profesionales, cargando }
}

export function useProfesional(id) {
  const [profesional, setProfesional] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return
    setCargando(true)
    Promise.all([getDoc(doc(db, 'profesionales', id)), getDoc(doc(db, 'usuarios', id))])
      .then(([profSnap, usuarioSnap]) => {
        if (!profSnap.exists()) {
          setProfesional(null)
        } else {
          const datos = profSnap.data()
          const usuario = usuarioSnap.exists() ? usuarioSnap.data() : {}
          setProfesional({
            id,
            nombre: usuario.nombre ?? 'Profesional',
            fotoUrl: usuario.fotoUrl ?? '',
            telefono: usuario.telefono ?? '',
            fechaRegistro: usuario.fechaRegistro ?? null,
            profesion: datos.profesion,
            especialidad: datos.especialidad,
            experiencia: datos.experiencia,
            descripcion: datos.descripcion,
            carnet: datos.carnet,
            costoConsulta: datos.costoConsulta ?? 0,
            calificacionPromedio: datos.calificacionPromedio ?? 0,
            disponibleAhora: datos.disponibleAhora ?? false,
            modalidades: datos.modalidades ?? [false, false, false],
            verificado: datos.verificado ?? false,
            estadoCuenta: estadoEfectivo(usuario) ?? 'activo',
            notaEstado: datos.notaEstado ?? '',
            disponibilidad: datos.disponibilidad ?? {},
            titulos: obtenerTitulos(datos),
          })
        }
      })
      .catch(() => setProfesional(null))
      .finally(() => setCargando(false))
  }, [id])

  return { profesional, cargando }
}
