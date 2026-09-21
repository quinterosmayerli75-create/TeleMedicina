import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase/config'
import { nombreCompleto } from '../hooks/usePaciente'
import { normalizarTexto } from '../utils/informes'

// Datos del paciente que se guardan dentro del informe (así el informe conserva el nombre aunque después cambie).
export function resumenPaciente(usuario) {
  return {
    id: usuario.id,
    nombre: nombreCompleto(usuario) || 'Paciente',
    edad: usuario.edad ?? null,
    sexo: usuario.sexo ?? '',
  }
}

// Busca entre los pacientes registrados en DocTop escribiendo su nombre.
export default function SelectorPaciente({ valor, onChange, deshabilitado = false }) {
  const [pacientes, setPacientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [texto, setTexto] = useState('')

  useEffect(() => {
    let vigente = true
    getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'paciente')))
      .then((snap) => {
        if (!vigente) return
        const filas = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => !u.estado || u.estado === 'activo')
          .map(resumenPaciente)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        setPacientes(filas)
      })
      .catch(() => vigente && setError(true))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [])

  const coincidencias = useMemo(() => {
    const buscado = normalizarTexto(texto)
    if (!buscado) return []
    return pacientes.filter((p) => normalizarTexto(p.nombre).includes(buscado)).slice(0, 8)
  }, [pacientes, texto])

  if (valor) {
    return (
      <div className="paciente-elegido">
        <div>
          <b>{valor.nombre}</b>
          <span>{[valor.edad ? `${valor.edad} años` : null, valor.sexo || null].filter(Boolean).join(' · ') || 'Paciente registrado'}</span>
        </div>
        {!deshabilitado && (
          <button type="button" className="btn btn-outline btn-auto" onClick={() => onChange(null)}>Cambiar</button>
        )}
      </div>
    )
  }

  return (
    <div className="selector-paciente">
      <input
        type="text"
        placeholder={cargando ? 'Cargando pacientes…' : 'Escribe el nombre del paciente…'}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={cargando}
        autoComplete="off"
      />
      {error && <div style={{ fontSize: 12, color: 'var(--alerta)', marginTop: 6 }}>No se pudo cargar la lista de pacientes.</div>}
      {texto && coincidencias.length === 0 && !cargando && !error && (
        <div style={{ fontSize: 12, color: 'var(--gris)', marginTop: 6 }}>No hay pacientes registrados con ese nombre.</div>
      )}
      {coincidencias.length > 0 && (
        <ul className="selector-paciente-lista">
          {coincidencias.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onChange(p)}>
                <b>{p.nombre}</b>
                <span>{[p.edad ? `${p.edad} años` : null, p.sexo || null].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
