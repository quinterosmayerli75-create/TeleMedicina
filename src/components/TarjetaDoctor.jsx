import { useNavigate } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'

const ETIQUETAS_MODALIDAD = ['Chat', 'Llamada', 'Video']

export default function TarjetaDoctor({ doctor, columna = false }) {
  const navigate = useNavigate()
  const { esFavorito, alternar } = useFavoritos()
  const favorito = esFavorito(doctor.id)
  const modalidadesActivas = ETIQUETAS_MODALIDAD.filter((_, i) => doctor.modalidades?.[i])

  return (
    <div
      className="doc-card"
      style={columna ? { flexDirection: 'column' } : undefined}
      onClick={() => navigate(`/paciente/doctor/${doctor.id}`)}
    >
      {doctor.destacado && <div className="rank-badge">TOP {doctor.destacado}</div>}
      <div
        className={`fav-heart${favorito ? ' on' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          alternar(doctor.id)
        }}
      >
        ♥
      </div>
      {doctor.fotoUrl ? (
        <img
          className="avatar"
          src={doctor.fotoUrl}
          alt={doctor.nombre}
          style={columna ? { width: '100%', height: 130, marginTop: 20 } : undefined}
        />
      ) : (
        <div style={{ width: 56, height: 56, background: 'var(--marfil-osc)', flex: '0 0 auto' }} />
      )}
      <div style={columna ? undefined : { marginTop: 4 }}>
        <div className="doc-name">
          {doctor.nombre} <span className="seal">✓</span>
        </div>
        <div className="doc-spec">{doctor.especialidad}</div>
        <div className="stars">
          ★★★★★ <span style={{ color: 'var(--gris)' }}>{doctor.calificacionPromedio}</span>
        </div>
        <div className="doc-meta">Bs {doctor.costoConsulta} · {modalidadesActivas.join(' · ') || 'Sin modalidades activas'}</div>
        <div className={`doc-status ${doctor.disponibleAhora ? 'is-on' : 'is-off'}`}>
          ● {doctor.disponibleAhora ? 'En línea' : 'Desconectado'}
        </div>
      </div>
    </div>
  )
}
