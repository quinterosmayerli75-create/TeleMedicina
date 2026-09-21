import { Link, useNavigate } from 'react-router-dom'
import { useFavoritos } from '../context/FavoritosContext'
import Estrellas from './Estrellas'
import { useRutas } from '../hooks/useRutas'

const ETIQUETAS_MODALIDAD = ['Chat', 'Llamada', 'Video']

// Tarjeta de un doctor. Tocar la tarjeta, su foto o su nombre abre su perfil completo.
export default function TarjetaDoctor({ doctor, columna = false }) {
  const navigate = useNavigate()
  const rutas = useRutas()
  const { esFavorito, alternar } = useFavoritos()
  const favorito = esFavorito(doctor.id)
  const modalidadesActivas = ETIQUETAS_MODALIDAD.filter((_, i) => doctor.modalidades?.[i])
  const rutaPerfil = rutas.perfilDoctor(doctor.id)
  const noPropagar = (e) => e.stopPropagation()

  return (
    <div
      className="doc-card"
      style={columna ? { flexDirection: 'column' } : undefined}
      onClick={() => navigate(rutaPerfil)}
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
      <Link to={rutaPerfil} onClick={noPropagar} className="doc-link" aria-label={`Ver perfil de ${doctor.nombre}`} style={{ display: 'contents' }}>
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
      </Link>
      <div style={columna ? undefined : { marginTop: 4 }}>
        <div className="doc-name">
          <Link to={rutaPerfil} onClick={noPropagar} className="doc-link">{doctor.nombre}</Link> <span className="seal">✓</span>
        </div>
        <div className="doc-spec">{doctor.especialidad}</div>
        <Estrellas valor={doctor.calificacionPromedio} />
        <div className="doc-meta">Bs {doctor.costoConsulta} · {modalidadesActivas.join(' · ') || 'Sin modalidades activas'}</div>
        <div className={`doc-status ${doctor.disponibleAhora ? 'is-on' : 'is-off'}`}>
          ● {doctor.disponibleAhora ? 'En línea' : 'Desconectado'}
        </div>
      </div>
    </div>
  )
}
