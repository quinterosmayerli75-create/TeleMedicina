import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useConsultasPaciente } from '../../hooks/useConsultas'
import { ESTADOS_CONSULTA, MODALIDADES } from '../../services/consultas'

const PESTANAS = [
  { clave: '', etiqueta: 'Todas' },
  { clave: 'pendiente_pago', etiqueta: 'Pendientes de pago' },
  { clave: 'pago_en_revision', etiqueta: 'En revisión' },
  { clave: 'habilitada', etiqueta: 'Habilitadas' },
  { clave: 'finalizada', etiqueta: 'Finalizadas' },
  { clave: 'rechazada', etiqueta: 'Rechazadas' },
  { clave: 'cancelada', etiqueta: 'Canceladas' },
]

export default function MisConsultas() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { consultas, cargando } = useConsultasPaciente(usuario?.uid)
  const [pestana, setPestana] = useState('')

  const conteos = useMemo(() => {
    const conteo = { '': consultas.length }
    consultas.forEach((c) => { conteo[c.estado] = (conteo[c.estado] ?? 0) + 1 })
    return conteo
  }, [consultas])

  const filtradas = pestana ? consultas.filter((c) => c.estado === pestana) : consultas

  return (
    <div>
      <h1 className="web-h1">Mis consultas</h1>
      <p className="web-sub">Solicitudes de consulta, su pago y su estado.</p>

      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && consultas.length === 0 && (
        <p className="web-sub">Todavía no solicitaste ninguna consulta. Busca un profesional y toca "Solicitar consulta" en su perfil.</p>
      )}

      {consultas.length > 0 && (
        <div className="subtabs" role="tablist" style={{ marginBottom: 20 }}>
          {PESTANAS.map((p) => (
            <button
              type="button"
              role="tab"
              key={p.clave || 'todas'}
              aria-selected={pestana === p.clave}
              className={`subtab${pestana === p.clave ? ' on' : ''}`}
              onClick={() => setPestana(p.clave)}
            >
              {p.etiqueta} <span className="subtab-count">{conteos[p.clave] ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      {consultas.length > 0 && filtradas.length === 0 && <p className="web-sub">No hay consultas en esta categoría.</p>}

      {filtradas.length > 0 && (
        <div className="card-plain" style={{ maxWidth: 820 }}>
          {filtradas.map((c) => {
            const estado = ESTADOS_CONSULTA[c.estado] ?? ESTADOS_CONSULTA.pendiente_pago
            return (
              <div className="admin-row" key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/paciente/consultas/${c.id}`)}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.doctor?.nombre ?? c.doctorNombre}</div>
                  <div className="rank-meta">
                    {MODALIDADES[c.modalidad]?.icono} {MODALIDADES[c.modalidad]?.etiqueta} · Bs {c.costoConsulta}
                    {c.fecha && ` · 📅 ${c.fecha} ${c.hora ?? ''}`}
                  </div>
                </div>
                <span className={`status-pill ${estado.clase}`}>{estado.etiqueta}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
