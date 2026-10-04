import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConsultasPaciente } from '../../hooks/useConsultas'
import { ESTADOS_CONSULTA, MODALIDADES } from '../../firebase/consultas'

export default function MisConsultas() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { consultas, cargando } = useConsultasPaciente(usuario?.uid)

  return (
    <div>
      <h1 className="web-h1">Mis consultas</h1>
      <p className="web-sub">Solicitudes de consulta, su pago y su estado.</p>

      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && consultas.length === 0 && (
        <p className="web-sub">Todavía no solicitaste ninguna consulta. Busca un profesional y toca "Solicitar consulta" en su perfil.</p>
      )}

      {consultas.length > 0 && (
        <div className="card-plain" style={{ maxWidth: 820 }}>
          {consultas.map((c) => {
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
