import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProfesional } from '../../hooks/useProfesionalesActivos'
import { useFavoritos } from '../../context/FavoritosContext'

const ETIQUETAS_MODALIDAD = ['Chat de texto', 'Llamada de voz', 'Videollamada']

export default function PerfilDoctor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { esFavorito, alternar } = useFavoritos()
  const [reseña, setReseña] = useState('')

  const { profesional: doctor, cargando } = useProfesional(id)

  if (cargando) return <p className="web-sub">Cargando…</p>
  if (!doctor) return <p>No se encontró ese profesional.</p>

  const favorito = esFavorito(doctor.id)
  const modalidadesActivas = ETIQUETAS_MODALIDAD.filter((_, i) => doctor.modalidades?.[i])

  return (
    <div>
      <span className="back-link" onClick={() => navigate('/paciente/buscar')}>← Volver a resultados</span>

      <div className="web-2col">
        <div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {doctor.fotoUrl ? (
              <img src={doctor.fotoUrl} alt={doctor.nombre} style={{ width: 84, height: 84, borderRadius: 6, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: 6, background: 'var(--marfil-osc)' }} />
            )}
            <div>
              <div className="web-h1" style={{ marginBottom: 0 }}>{doctor.nombre} <span className="seal">✓</span></div>
              <div className="doc-spec">{doctor.profesion} · {doctor.especialidad}</div>
              <div className={`doc-status ${doctor.disponibleAhora ? 'is-on' : 'is-off'}`}>● {doctor.disponibleAhora ? 'En línea ahora' : 'Desconectado'}</div>
            </div>
            <div
              className={`fav-heart${favorito ? ' on' : ''}`}
              style={{ position: 'static', marginLeft: 'auto', fontSize: 24 }}
              onClick={() => alternar(doctor.id)}
            >
              ♥
            </div>
          </div>

          <div className="stars" style={{ margin: '14px 0' }}>
            ★★★★★ <span style={{ color: 'var(--gris)' }}>{doctor.calificacionPromedio}</span>
          </div>

          <div className="card-plain">
            <h2 className="section-title" style={{ marginTop: 0 }}>Sobre mí</h2>
            <p style={{ fontSize: 12.5, color: 'var(--gris)' }}>{doctor.descripcion || 'Este profesional aún no agregó una descripción.'}</p>
          </div>

          <div className="card-plain">
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Deje su calificación</div>
            <div className="stars" style={{ fontSize: 20 }}>☆☆☆☆☆</div>
            <textarea rows="2" placeholder="Cuéntenos cómo fue su consulta…" value={reseña} onChange={(e) => setReseña(e.target.value)} />
            <button type="button" className="btn btn-gold btn-auto" style={{ marginTop: 8 }}>Publicar reseña</button>
          </div>
        </div>

        <div>
          <div className="icon-btn-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {modalidadesActivas.includes('Llamada de voz') && <div className="icon-btn">📞 Llamar</div>}
            {modalidadesActivas.includes('Videollamada') && <div className="icon-btn">🎥 Video</div>}
            {modalidadesActivas.includes('Chat de texto') && (
              <div className="icon-btn" onClick={() => navigate(`/paciente/mensajes/${doctor.id}`)}>💬 Mensaje</div>
            )}
            <div className="icon-btn" style={{ color: 'var(--alerta)' }} onClick={() => navigate(`/paciente/denuncia/${doctor.id}`)}>⚑ Denunciar</div>
          </div>
          <div className="card-plain">
            <div style={{ fontSize: 12 }}><div style={{ color: 'var(--gris)' }}>Carnet profesional</div><div style={{ fontFamily: 'var(--mono)' }}>{doctor.carnet}</div></div>
            <div style={{ fontSize: 12, marginTop: 8 }}><div style={{ color: 'var(--gris)' }}>Consulta</div><div>Bs {doctor.costoConsulta}</div></div>
            <div style={{ fontSize: 12, marginTop: 8 }}><div style={{ color: 'var(--gris)' }}>Experiencia</div><div>{doctor.experiencia}</div></div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--marfil-osc)', fontSize: 12, color: 'var(--gris)' }}>
              Modalidades: {modalidadesActivas.join(', ') || 'No configuradas'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
