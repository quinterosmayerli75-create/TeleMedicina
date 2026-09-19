import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'

// Profesionales verificados por el admin, con sus datos públicos de "usuarios" incluidos.
export function useProfesionalesActivos() {
  const [profesionales, setProfesionales] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'profesionales'), where('verificado', '==', true))
    const unsubscribe = onSnapshot(q, async (snap) => {
      const filas = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const datos = docSnap.data()
          const usuarioSnap = await getDoc(doc(db, 'usuarios', docSnap.id))
          const usuario = usuarioSnap.exists() ? usuarioSnap.data() : {}
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
      setProfesionales(filas)
      setCargando(false)
    })
    return unsubscribe
  }, [])

  return { profesionales, cargando }
}

export function useProfesional(id) {
  const [profesional, setProfesional] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return
    setCargando(true)
    Promise.all([getDoc(doc(db, 'profesionales', id)), getDoc(doc(db, 'usuarios', id))]).then(
      ([profSnap, usuarioSnap]) => {
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
            profesion: datos.profesion,
            especialidad: datos.especialidad,
            experiencia: datos.experiencia,
            descripcion: datos.descripcion,
            carnet: datos.carnet,
            costoConsulta: datos.costoConsulta ?? 0,
            calificacionPromedio: datos.calificacionPromedio ?? 0,
            disponibleAhora: datos.disponibleAhora ?? false,
            modalidades: datos.modalidades ?? [false, false, false],
          })
        }
        setCargando(false)
      }
    )
  }, [id])

  return { profesional, cargando }
}
