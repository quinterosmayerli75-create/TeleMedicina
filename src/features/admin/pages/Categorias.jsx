import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDoc, deleteDoc, doc, onSnapshot, updateDoc, collection } from 'firebase/firestore'
import { Tags, Stethoscope, Star, Smile, Heart, Apple, Sparkles, Baby, HeartHandshake, Brain } from '@/shared/components/Icons'
import { db } from '@/services/firebase/config'
import { useProfesiones } from '@/shared/hooks/useProfesiones'
import { PROFESIONES_BASE } from '@/shared/utils/profesiones'
import { coincideTexto } from '@/shared/utils/texto'

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
  const { profesiones, extra: carrerasExtra } = useProfesiones()
  const [categorias, setCategorias] = useState([])
  const [profesionales, setProfesionales] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [nombreEdicion, setNombreEdicion] = useState('')
  const [profesionEdicion, setProfesionEdicion] = useState(profesiones[0])
  const [aEliminar, setAEliminar] = useState(null)
  const [nuevaCarrera, setNuevaCarrera] = useState('')
  const [guardandoCarrera, setGuardandoCarrera] = useState(false)
  const navigate = useNavigate()

  async function agregarCarrera(e) {
    e.preventDefault()
    const nombre = nuevaCarrera.trim()
    if (!nombre || profesiones.some((p) => p.toLowerCase() === nombre.toLowerCase())) return
    setGuardandoCarrera(true)
    try {
      await addDoc(collection(db, 'carreras'), { nombre })
      setNuevaCarrera('')
    } finally {
      setGuardandoCarrera(false)
    }
  }

  function quitarCarrera(carrera) {
    deleteDoc(doc(db, 'carreras', carrera.id))
  }

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
    return categorias.filter((c) => coincideTexto(c.nombre, busqueda))
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

      <div className="card-plain" style={{ maxWidth: 760, marginBottom: 20 }}>
        <h2 className="section-title" style={{ marginTop: 0 }}>Carreras</h2>
        <p className="web-sub" style={{ marginTop: 0 }}>De aquí sale la lista de "Profesión" al registrar un doctor y al crear categorías. Las 4 de siempre no se pueden quitar.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {profesiones.map((nombre) => {
            const esBase = PROFESIONES_BASE.includes(nombre)
            const carrera = carrerasExtra.find((c) => c.nombre === nombre)
            return (
              <span key={nombre} className="status-pill status-active" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {nombre}
                {!esBase && carrera && (
                  <button
                    type="button"
                    onClick={() => quitarCarrera(carrera)}
                    aria-label={`Quitar ${nombre}`}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, padding: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                )}
              </span>
            )
          })}
        </div>
        <form onSubmit={agregarCarrera} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Ej. Farmacéutico"
            value={nuevaCarrera}
            onChange={(e) => setNuevaCarrera(e.target.value)}
            style={{ maxWidth: 260 }}
          />
          <button type="submit" className="btn btn-outline btn-auto" disabled={guardandoCarrera || !nuevaCarrera.trim()}>
            + Agregar carrera
          </button>
        </form>
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
                <button type="button" className="mini-btn" onClick={() => { setEditando(c); setNombreEdicion(c.nombre); setProfesionEdicion(c.profesion ?? profesiones[0]) }}>Editar</button>
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
              {profesiones.map((p) => <option key={p}>{p}</option>)}
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
