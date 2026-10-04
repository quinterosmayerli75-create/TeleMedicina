import { useMemo } from 'react'
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

  const grupos = useMemo(() => {
    const proximas = consultas
      .filter((c) => c.estado === 'habilitada' && c.fecha >= HOY)
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    const porFecha = new Map()
    proximas.forEach((c) => {
      if (!porFecha.has(c.fecha)) porFecha.set(c.fecha, [])
      porFecha.get(c.fecha).push(c)
    })
    return [...porFecha.entries()]
  }, [consultas])

  return (
    <div>
      <h1 className="web-h1">Agenda</h1>
      <p className="web-sub">Tus próximas consultas ya habilitadas (pago aprobado), por fecha.</p>

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
