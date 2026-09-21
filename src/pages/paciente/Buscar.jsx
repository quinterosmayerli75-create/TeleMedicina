import { useMemo, useState } from 'react'
import { useProfesionalesActivos } from '../../hooks/useProfesionalesActivos'
import { useTiposProfesion } from '../../hooks/useTiposProfesion'
import TarjetaDoctor from '../../components/TarjetaDoctor'

const MODALIDADES = [
  { clave: 'Todas', indice: null },
  { clave: 'Chat', indice: 0 },
  { clave: 'Llamada', indice: 1 },
  { clave: 'Video', indice: 2 },
]

// Calificación mínima (estrellas) que se puede exigir; 0 = sin filtro.
const CALIFICACIONES = [
  { etiqueta: 'Todas', minimo: 0 },
  { etiqueta: '★ 3+', minimo: 3 },
  { etiqueta: '★ 4+', minimo: 4 },
  { etiqueta: '★ 4.5+', minimo: 4.5 },
]

const ORDENES = [
  { clave: 'recomendados', etiqueta: 'Recomendados' },
  { clave: 'calificacion', etiqueta: 'Mejor calificación' },
  { clave: 'precio', etiqueta: 'Menor precio' },
]

export default function Buscar() {
  const { profesionales, cargando } = useProfesionalesActivos()
  const tipos = useTiposProfesion()

  const [texto, setTexto] = useState('')
  const [especialidad, setEspecialidad] = useState('Todas')
  const [precioMax, setPrecioMax] = useState(500)
  const [soloEnLinea, setSoloEnLinea] = useState(false)
  const [modalidad, setModalidad] = useState('Todas')
  const [calificacionMinima, setCalificacionMinima] = useState(0)
  const [orden, setOrden] = useState('recomendados')

  const resultados = useMemo(() => {
    const indiceModalidad = MODALIDADES.find((m) => m.clave === modalidad)?.indice
    const filtrados = profesionales.filter((p) => {
      const coincideTexto =
        !texto ||
        p.nombre.toLowerCase().includes(texto.toLowerCase()) ||
        p.especialidad?.toLowerCase().includes(texto.toLowerCase()) ||
        p.profesion?.toLowerCase().includes(texto.toLowerCase())
      const coincideEspecialidad = especialidad === 'Todas' || p.especialidad === especialidad
      const coincidePrecio = p.costoConsulta <= precioMax
      const coincideDisponibilidad = !soloEnLinea || p.disponibleAhora
      const coincideModalidad = indiceModalidad === null || indiceModalidad === undefined || p.modalidades?.[indiceModalidad]
      const coincideCalificacion = (Number(p.calificacionPromedio) || 0) >= calificacionMinima
      return coincideTexto && coincideEspecialidad && coincidePrecio && coincideDisponibilidad && coincideModalidad && coincideCalificacion
    })
    if (orden === 'calificacion') {
      return [...filtrados].sort((a, b) => (b.calificacionPromedio || 0) - (a.calificacionPromedio || 0) || a.nombre.localeCompare(b.nombre, 'es'))
    }
    if (orden === 'precio') return [...filtrados].sort((a, b) => a.costoConsulta - b.costoConsulta)
    return filtrados
  }, [profesionales, texto, especialidad, precioMax, soloEnLinea, modalidad, calificacionMinima, orden])

  return (
    <div>
      <h1 className="web-h1">Buscar especialista</h1>
      <div className="web-2col">
        <div>
          <h2 className="section-title">{cargando ? 'Cargando…' : `${resultados.length} resultados`}</h2>
          <div className="web-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {resultados.map((doctor) => (
              <TarjetaDoctor key={doctor.id} doctor={doctor} />
            ))}
            {!cargando && resultados.length === 0 && (
              <p style={{ color: 'var(--gris)', fontSize: 13 }}>No hay profesionales que coincidan con esos filtros.</p>
            )}
          </div>
        </div>

        <div className="card-plain">
          <h2 className="section-title">Filtros</h2>
          <label className="campo-label" htmlFor="texto">Nombre, profesión o especialidad</label>
          <input id="texto" type="text" placeholder="Cardiólogo, Médico…" value={texto} onChange={(e) => setTexto(e.target.value)} />

          <label className="campo-label" htmlFor="especialidad">Especialidad</label>
          <select id="especialidad" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)}>
            <option>Todas</option>
            {tipos.map((t) => <option key={t.id}>{t.nombre}</option>)}
          </select>

          <label className="campo-label">Tipo de consulta</label>
          <div className="chip-row">
            {MODALIDADES.map((m) => (
              <div key={m.clave} className={`chip${modalidad === m.clave ? ' on' : ''}`} onClick={() => setModalidad(m.clave)}>
                {m.clave}
              </div>
            ))}
          </div>

          <label className="campo-label">Calificación (estrellas)</label>
          <div className="chip-row">
            {CALIFICACIONES.map((c) => (
              <button
                type="button"
                key={c.minimo}
                className={`chip${calificacionMinima === c.minimo ? ' on' : ''}`}
                onClick={() => setCalificacionMinima(c.minimo)}
              >
                {c.etiqueta}
              </button>
            ))}
          </div>

          <label className="campo-label" htmlFor="orden">Ordenar por</label>
          <select id="orden" value={orden} onChange={(e) => setOrden(e.target.value)}>
            {ORDENES.map((o) => <option key={o.clave} value={o.clave}>{o.etiqueta}</option>)}
          </select>

          <label className="campo-label" htmlFor="precio">Precio máximo por consulta</label>
          <input id="precio" type="range" min="50" max="500" value={precioMax} onChange={(e) => setPrecioMax(Number(e.target.value))} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gris)' }}>
            <span>Bs 50</span><span>Bs {precioMax}</span>
          </div>

          <label className="campo-label">Disponibilidad</label>
          <div className="chip-row">
            <div className={`chip${soloEnLinea ? ' on' : ''}`} onClick={() => setSoloEnLinea(true)}>En línea ahora</div>
            <div className={`chip${!soloEnLinea ? ' on' : ''}`} onClick={() => setSoloEnLinea(false)}>Todos</div>
          </div>
        </div>
      </div>
    </div>
  )
}
