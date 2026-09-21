import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useProfesional } from '../../hooks/useProfesionalesActivos'
import { useCalificaciones } from '../../hooks/useCalificaciones'
import { useRutas } from '../../hooks/useRutas'
import { useFavoritos } from '../../context/FavoritosContext'
import Estrellas from '../../components/Estrellas'
import ResenasDoctor from '../../components/ResenasDoctor'
import VisorImagen from '../../components/VisorImagen'
import { formatearFecha } from '../../utils/fechas'
import { DIAS, hayHorarios, normalizarDisponibilidad, resumenDia } from '../../utils/horarios'

const ETIQUETAS_MODALIDAD = ['Chat de texto', 'Llamada de voz', 'Videollamada']

export default function PerfilDoctor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { key } = useLocation()
  const rutas = useRutas()
  const { esFavorito, alternar } = useFavoritos()
  const [visor, setVisor] = useState(null)

  const { profesional: doctor, cargando } = useProfesional(id)
  const resenas = useCalificaciones(id)

  // Vuelve a donde estaba el paciente (inicio, favoritos, chat…); si abrió el perfil directo, a la búsqueda.
  function volver() {
    if (key !== 'default') navigate(-1)
    else navigate(rutas.buscar)
  }

  if (cargando) return <p className="web-sub">Cargando…</p>
  if (!doctor) {
    return (
      <div>
        <span className="back-link" onClick={volver}>← Volver</span>
        <p>No se encontró ese profesional.</p>
      </div>
    )
  }

  if (doctor.estadoCuenta !== 'activo') {
    return (
      <div>
        <span className="back-link" onClick={volver}>← Volver</span>
        <p>Este profesional no está disponible por ahora.</p>
      </div>
    )
  }

  const favorito = esFavorito(doctor.id)
  const modalidadesActivas = ETIQUETAS_MODALIDAD.filter((_, i) => doctor.modalidades?.[i])
  const horarios = normalizarDisponibilidad(doctor.disponibilidad)
  const imagenesTitulos = doctor.titulos.map((url, i) => ({
    url,
    etiqueta: doctor.titulos.length > 1 ? `Título profesional ${i + 1}` : 'Título profesional',
  }))

  return (
    <div>
      <span className="back-link" onClick={volver}>← Volver</span>

      <div className="web-2col">
        <div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {doctor.fotoUrl ? (
              <img
                src={doctor.fotoUrl}
                alt={doctor.nombre}
                title="Ver foto"
                style={{ width: 84, height: 84, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setVisor({ imagenes: [{ url: doctor.fotoUrl, etiqueta: doctor.nombre }], indice: 0 })}
              />
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

          <div style={{ margin: '14px 0' }}>
            <Estrellas
              valor={resenas.total > 0 ? resenas.promedio : doctor.calificacionPromedio}
              total={resenas.total}
            />
          </div>

          <div className="card-plain">
            <h2 className="section-title" style={{ marginTop: 0 }}>Sobre mí</h2>
            <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>{doctor.descripcion || 'Este profesional aún no agregó una descripción.'}</p>
          </div>

          <div className="card-plain">
            <h2 className="section-title" style={{ marginTop: 0 }}>Títulos y certificados</h2>
            {imagenesTitulos.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>Este profesional aún no subió fotos de sus títulos.</p>
            ) : (
              <>
                <p style={{ fontSize: 12, color: 'var(--gris)', marginTop: 0 }}>Toque una foto para verla en grande.</p>
                <div className="titulos-grid">
                  {imagenesTitulos.map((img, i) => (
                    <button type="button" className="titulo-thumb" key={img.url} onClick={() => setVisor({ imagenes: imagenesTitulos, indice: i })}>
                      <img src={img.url} alt={img.etiqueta} />
                      <span>{img.etiqueta}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <ResenasDoctor
            doctorId={doctor.id}
            puedeCalificar={!rutas.esDoctor}
            calificaciones={resenas.calificaciones}
            cargando={resenas.cargando}
            error={resenas.error}
          />
        </div>

        <div>
          <div className="icon-btn-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {modalidadesActivas.includes('Llamada de voz') && <div className="icon-btn">📞 Llamar</div>}
            {modalidadesActivas.includes('Videollamada') && <div className="icon-btn">🎥 Video</div>}
            {modalidadesActivas.includes('Chat de texto') && (
              <div className="icon-btn" onClick={() => navigate(rutas.mensajesDoctor(doctor.id))}>💬 Mensaje</div>
            )}
            <div className="icon-btn" style={{ color: 'var(--alerta)' }} onClick={() => navigate(rutas.denuncia(doctor.id))}>⚑ Denunciar</div>
          </div>

          <div className="card-plain">
            <h2 className="section-title" style={{ marginTop: 0 }}>Información profesional</h2>
            <div className="ficha">
              <div><span>Profesión</span>{doctor.profesion || '—'}</div>
              <div><span>Especialidad</span>{doctor.especialidad || '—'}</div>
              <div><span>Carnet profesional</span><b style={{ fontFamily: 'var(--mono)' }}>{doctor.carnet || '—'}</b></div>
              <div><span>Experiencia</span>{doctor.experiencia || '—'}</div>
              <div><span>Costo de la consulta</span>Bs {doctor.costoConsulta}</div>
              <div><span>Modalidades de atención</span>{modalidadesActivas.join(', ') || 'No configuradas'}</div>
              <div><span>Verificación</span>{doctor.verificado ? '✓ Verificado por DocTop' : 'En revisión'}</div>
              <div><span>En DocTop desde</span>{formatearFecha(doctor.fechaRegistro)}</div>
              {doctor.notaEstado && <div><span>Aviso del profesional</span>{doctor.notaEstado}</div>}
            </div>
          </div>

          <div className="card-plain">
            <h2 className="section-title" style={{ marginTop: 0 }}>Días y horarios de atención</h2>
            {hayHorarios(doctor.disponibilidad) ? (
              <div className="horarios-publicos">
                {DIAS.map(({ clave, etiqueta }) => {
                  const texto = resumenDia(horarios[clave])
                  return [
                    <b key={`${clave}-d`}>{etiqueta}</b>,
                    <span key={`${clave}-h`} className={texto ? undefined : 'libre'}>{texto ?? 'No atiende'}</span>,
                  ]
                })}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>Este profesional aún no publicó sus horarios.</p>
            )}
          </div>
        </div>
      </div>

      {visor && (
        <VisorImagen
          imagenes={visor.imagenes}
          indice={visor.indice}
          onCerrar={() => setVisor(null)}
          onCambiar={(indice) => setVisor({ ...visor, indice })}
        />
      )}
    </div>
  )
}
