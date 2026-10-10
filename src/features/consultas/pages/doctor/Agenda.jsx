import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useConsultasDoctor } from '../../hooks/useConsultas'
import { MODALIDADES } from '../../services/consultas'

const HOY = new Date().toISOString().slice(0, 10)

function formatearFechaLarga(fechaStr) {
  const fecha = new Date(`${fechaStr}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) return fechaStr
  const texto = fecha.toLocaleDateString('es-BO', { weekday: 'long', day: '2-digit', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Agenda del doctor: solo las consultas ya habilitadas (pago aprobado), ordenadas por fecha y hora,
// agrupadas por día. Las que aún esperan pago se ven en "Mis consultas", no aquí.
export default function Agenda() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { consultas, cargando } = useConsultasDoctor(usuario?.uid)
  const [busqueda, setBusqueda] = useState('')
  const [modalidadSel, setModalidadSel] = useState('')

  const grupos = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    const proximas = consultas
      .filter((c) => c.estado === 'habilitada' && c.fecha >= HOY)
      .filter((c) => !modalidadSel || c.modalidad === modalidadSel)
      .filter((c) => !termino || (c.paciente?.nombre ?? c.pacienteNombre ?? '').toLowerCase().includes(termino))
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    const porFecha = new Map()
    proximas.forEach((c) => {
      if (!porFecha.has(c.fecha)) porFecha.set(c.fecha, [])
      porFecha.get(c.fecha).push(c)
    })
    return [...porFecha.entries()]
  }, [consultas, busqueda, modalidadSel])

  return (
    <div>
      <h1 className="web-h1">Agenda</h1>
      <p className="web-sub">Tus próximas consultas ya habilitadas (pago aprobado), por fecha.</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por paciente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 320, margin: 0 }}
        />
        <div className="chip-row" role="group" aria-label="Filtrar por modalidad">
          <button type="button" className={`chip${modalidadSel === '' ? ' on' : ''}`} onClick={() => setModalidadSel('')}>Todas</button>
          {Object.entries(MODALIDADES).map(([clave, m]) => (
            <button
              type="button"
              key={clave}
              className={`chip${modalidadSel === clave ? ' on' : ''}`}
              onClick={() => setModalidadSel(modalidadSel === clave ? '' : clave)}
            >
              {m.icono} {m.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && grupos.length === 0 && <p className="web-sub">No tienes consultas agendadas por ahora.</p>}

      {grupos.map(([fecha, lista]) => (
        <div key={fecha} className="card-plain" style={{ maxWidth: 820 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>{formatearFechaLarga(fecha)}</h2>
          {lista.map((c) => (
            <div className="admin-row" key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/doctor/consultas/${c.id}`)}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.hora} · {c.paciente?.nombre ?? c.pacienteNombre}</div>
                <div className="rank-meta">{MODALIDADES[c.modalidad]?.icono} {MODALIDADES[c.modalidad]?.etiqueta}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
