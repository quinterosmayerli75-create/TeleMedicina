import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { obtenerPaciente } from '../data/pacientesMock'

// Los pacientes de ejemplo del chat anterior (ids como "camila-rojas") no existen en Firestore:
// se muestran con sus datos de ejemplo para que el perfil abra igual que antes.
function pacienteDeEjemplo(id) {
  const ejemplo = obtenerPaciente(id)
  if (!ejemplo) return null
  const { foto, nombre, ...resto } = ejemplo
  return { ...resto, nombre, fotoUrl: foto, rol: 'paciente', esEjemplo: true }
}

// Datos de un paciente (documento de "usuarios"). Lo usa el doctor para ver el perfil de sus pacientes.
export function usePaciente(id) {
  const [paciente, setPaciente] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    if (!id) return undefined
    getDoc(doc(db, 'usuarios', id))
      .then((snap) => {
        if (!vigente) return
        setPaciente(snap.exists() ? { id, ...snap.data() } : pacienteDeEjemplo(id))
      })
      .catch(() => vigente && setPaciente(pacienteDeEjemplo(id)))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [id])

  return { paciente, cargando }
}

export function nombreCompleto(usuario) {
  return [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ')
}
