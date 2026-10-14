import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteDoc, doc, onSnapshot, updateDoc, collection } from 'firebase/firestore'
import { Tags, Stethoscope, Star, Smile, Heart, Apple, Sparkles, Baby, HeartHandshake, Brain } from 'lucide-react'
import { db } from '@/services/firebase/config'
import { PROFESIONES } from '@/shared/utils/profesiones'

// Solo decorativo: un ícono aproximado según palabras clave del nombre de la categoría.
const ICONOS_POR_PALABRA = [
  [/odont|dent/i, Smile],
  [/cardio/i, Heart],
  [/nutri/i, Apple],
  [/dermat/i, Sparkles],
  [/pediatr/i, Baby],
  [/gineco|obstetr/i, HeartHandshake],
  [/psico|mental/i, Brain],
  [/general|medicina/i, Stethoscope],
]
function iconoCategoria(nombre = '') {
  return ICONOS_POR_PALABRA.find(([regex]) => regex.test(nombre))?.[1] ?? Tags
}

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [nombreEdicion, setNombreEdicion] = useState('')
  const [profesionEdicion, setProfesionEdicion] = useState(PROFESIONES[0])
  const [aEliminar, setAEliminar] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tiposProfesion'), (snap) => {
      setCategorias(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'profesionales'), (snap) => {
      setProfesionales(snap.docs.map((d) => d.data()))
    })
    return unsubscribe
  }, [])

  // Cuántos doctores tiene cada especialidad ahora mismo (dato real, no estimado).
  const medicosPorCategoria = useMemo(() => {
    const conteo = new Map()
    profesionales.forEach((p) => {
      if (!p.especialidad) return
      conteo.set(p.especialidad, (conteo.get(p.especialidad) ?? 0) + 1)
    })
    return conteo
  }, [profesionales])

  const masSolicitada = useMemo(() => {
    let top = null
    medicosPorCategoria.forEach((total, nombre) => {
      if (!top || total > top.total) top = { nombre, total }
    })
    return top
  }, [medicosPorCategoria])

  const filtradas = useMemo(() => {
    if (!busqueda) return categorias
    return categorias.filter((c) => c.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
  }, [categorias, busqueda])

  async function guardarEdicion() {
    await updateDoc(doc(db, 'tiposProfesion', editando.id), { nombre: nombreEdicion.trim(), profesion: profesionEdicion })
    setEditando(null)
  }

  async function confirmarEliminar() {
    await deleteDoc(doc(db, 'tiposProfesion', aEliminar.id))
    setAEliminar(null)
  }

  return (
    <div>
      <div className="admin-eyebrow">
        CATÁLOGO CLÍNICO
        <span className="vivo"><span className="punto" /> Sincronización en vivo</span>
      </div>
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Categorías de especialidad</span>
        <button type="button" className="btn btn-primary btn-auto" onClick={() => navigate('/admin/categorias/nueva')}>
          + Nueva categoría
        </button>
      </h1>
      <p className="web-sub">Especialidades disponibles para búsqueda de pacientes y registro de doctores.</p>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
        <div className="admin-metric-card">
          <div className="icono"><Tags size={16} strokeWidth={2} /></div>
          <div className="overline">Total categorías</div>
          <div className="numero">{categorias.length}</div>
          <div className="caption">Registradas en el catálogo</div>
        </div>
        <div className="admin-metric-card c-azul">
          <div className="icono"><Stethoscope size={16} strokeWidth={2} /></div>
          <div className="overline">Con médicos activos</div>
          <div className="numero">{categorias.filter((c) => (medicosPorCategoria.get(c.nombre) ?? 0) > 0).length}</div>
          <div className="caption">De {categorias.length} categorías</div>
        </div>
        <div className="admin-metric-card c-ambar">
          <div className="icono"><Star size={16} strokeWidth={2} /></div>
          <div className="overline">Especialidad más solicitada</div>
          <div className="numero" style={{ fontSize: 20 }}>{masSolicitada?.nombre ?? '—'}</div>
          <div className="caption">{masSolicitada ? `${masSolicitada.total} médico${masSolicitada.total === 1 ? '' : 's'}` : 'Sin datos todavía'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar categoría…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 420 }}
        />
      </div>

      {filtradas.length === 0 && <p className="web-sub">No se encontraron categorías.</p>}
      {filtradas.map((c) => {
        const Icono = iconoCategoria(c.nombre)
        const total = medicosPorCategoria.get(c.nombre) ?? 0
        return (
          <div className="card-plain admin-list-card" key={c.id} style={{ maxWidth: 760, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="admin-cat-icon"><Icono size={18} strokeWidth={2} /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.nombre}</div>
                <div className="rank-meta">{c.profesion ?? 'Sin profesión asignada'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className={`status-pill ${total > 0 ? 'status-active' : 'status-pending'}`}>
                {total} médico{total === 1 ? '' : 's'} activo{total === 1 ? '' : 's'}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="mini-btn" onClick={() => { setEditando(c); setNombreEdicion(c.nombre); setProfesionEdicion(c.profesion ?? PROFESIONES[0]) }}>Editar</button>
                <button type="button" className="mini-btn danger" onClick={() => setAEliminar(c)}>Eliminar</button>
              </div>
            </div>
          </div>
        )
      })}

      {editando && (
        <div className="modal-fondo" onClick={() => setEditando(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">Editar categoría</div>
            <div className="modal-sub">Los doctores ya registrados en esta categoría conservan su especialidad.</div>
            <label className="campo-label">Profesión</label>
            <select value={profesionEdicion} onChange={(e) => setProfesionEdicion(e.target.value)}>
              {PROFESIONES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <label className="campo-label">Nombre de la categoría (especialidad)</label>
            <input type="text" value={nombreEdicion} onChange={(e) => setNombreEdicion(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={guardarEdicion}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {aEliminar && (
        <div className="modal-fondo" onClick={() => setAEliminar(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>¿Eliminar esta categoría?</div>
            <div className="modal-sub">Está por eliminar "{aEliminar.nombre}".</div>
            <div style={{ background: '#F7ECEB', borderLeft: '2px solid var(--alerta)', padding: 12, fontSize: 11.5, lineHeight: 1.6, color: '#5c3330' }}>
              Esta acción no se puede deshacer. Los doctores en esta categoría quedarán sin especialidad asignada
              hasta que se les asigne otra.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setAEliminar(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={confirmarEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
