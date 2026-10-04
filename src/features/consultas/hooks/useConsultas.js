import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { aFecha } from '@/shared/utils/fechas'

async function leerUsuario(id) {
  if (!id) return null
  try {
    const snap = await getDoc(doc(db, 'usuarios', id))
    return snap.exists() ? snap.data() : null
  } catch {
    return null
  }
}

function masRecientesPrimero(filas) {
  return filas.sort((a, b) => (aFecha(b.fechaSolicitud)?.getTime() ?? 0) - (aFecha(a.fechaSolicitud)?.getTime() ?? 0))
}

// Consultas de un paciente o de un doctor (según "campo"), con los datos de la otra persona incluidos.
function useConsultasDe(uid, campo) {
  const [consultas, setConsultas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!uid) return undefined
    let vigente = true
    const otroCampo = campo === 'pacienteId' ? 'doctorId' : 'pacienteId'
    const otraClave = campo === 'pacienteId' ? 'doctor' : 'paciente'
    const unsubscribe = onSnapshot(
      query(collection(db, 'consultas'), where(campo, '==', uid)),
      async (snap) => {
        try {
          const filas = await Promise.all(
            snap.docs.map(async (d) => {
              const consulta = { id: d.id, ...d.data() }
              const otro = await leerUsuario(consulta[otroCampo])
              return { ...consulta, [otraClave]: otro }
            })
          )
          if (vigente) setConsultas(masRecientesPrimero(filas))
        } finally {
          if (vigente) setCargando(false)
        }
      },
      () => vigente && setCargando(false)
    )
    return () => {
      vigente = false
      unsubscribe()
    }
  }, [uid, campo])

  return { consultas, cargando }
}

export function useConsultasPaciente(pacienteId) {
  return useConsultasDe(pacienteId, 'pacienteId')
}

export function useConsultasDoctor(doctorId) {
  return useConsultasDe(doctorId, 'doctorId')
}

// Una consulta puntual (para la pantalla de pago/estado), con los datos de paciente y doctor.
export function useConsulta(id) {
  const [consulta, setConsulta] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return undefined
    const unsubscribe = onSnapshot(
      doc(db, 'consultas', id),
      async (snap) => {
        if (!snap.exists()) {
          setConsulta(null)
          setCargando(false)
          return
        }
        const datos = { id: snap.id, ...snap.data() }
        const [paciente, doctor] = await Promise.all([leerUsuario(datos.pacienteId), leerUsuario(datos.doctorId)])
        setConsulta({ ...datos, paciente, doctor })
        setCargando(false)
      },
      () => setCargando(false)
    )
    return unsubscribe
  }, [id])

  return { consulta, cargando }
}

// El id de la consulta finalizada más reciente entre este paciente y este doctor (o null si no hay
// ninguna) — se usa para habilitar el formulario de calificación, que exige probar que hubo consulta.
export function useConsultaFinalizada(pacienteId, doctorId) {
  const [id, setId] = useState(null)

  useEffect(() => {
    if (!pacienteId || !doctorId) return undefined
    return onSnapshot(
      query(
        collection(db, 'consultas'),
        where('pacienteId', '==', pacienteId),
        where('doctorId', '==', doctorId),
        where('estado', '==', 'finalizada')
      ),
      (snap) => {
        const filas = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        filas.sort((a, b) => (aFecha(b.fechaFinalizacion)?.getTime() ?? 0) - (aFecha(a.fechaFinalizacion)?.getTime() ?? 0))
        setId(filas[0]?.id ?? null)
      },
      () => setId(null)
    )
  }, [pacienteId, doctorId])

  return id
}

// Para el admin: todas las consultas, con los datos de paciente y doctor (se filtran por pestaña en la pantalla).
export function useConsultasAdmin() {
  const [consultas, setConsultas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    const unsubscribe = onSnapshot(
      collection(db, 'consultas'),
      async (snap) => {
        try {
          const filas = await Promise.all(
            snap.docs.map(async (d) => {
              const consulta = { id: d.id, ...d.data() }
              const [paciente, doctor] = await Promise.all([leerUsuario(consulta.pacienteId), leerUsuario(consulta.doctorId)])
              return { ...consulta, paciente, doctor }
            })
          )
          if (vigente) setConsultas(masRecientesPrimero(filas))
        } finally {
          if (vigente) setCargando(false)
        }
      },
      () => vigente && setCargando(false)
    )
    return () => {
      vigente = false
      unsubscribe()
    }
  }, [])

  return { consultas, cargando }
}
