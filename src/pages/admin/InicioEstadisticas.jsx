import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useBloqueados } from '../../hooks/useBloqueados'
import ListaBloqueos from '../../components/admin/ListaBloqueos'

const CONSULTAS = {
  doctoresActivos: query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('estado', '==', 'activo')),
  pacientes: query(collection(db, 'usuarios'), where('rol', '==', 'paciente')),
  solicitudesPendientes: query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('estado', '==', 'pendiente')),
  denunciasPendientes: query(collection(db, 'reportes'), where('estado', '==', 'pendiente')),
}

// Cuántos doctores se muestran por especialidad en el ranking.
const TOP_POR_ESPECIALIDAD = 3

function useConteo(consulta) {
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const unsubscribe = onSnapshot(consulta, (snap) => setTotal(snap.size))
    return unsubscribe
  }, [consulta])

  return total
}

// Doctores activos con su perfil profesional (especialidad y calificación promedio).
function useDoctoresActivos() {
  const [doctores, setDoctores] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    const unsubscribe = onSnapshot(
      CONSULTAS.doctoresActivos,
      async (snap) => {
        try {
          const filas = await Promise.all(
            snap.docs.map(async (docSnap) => {
              const profSnap = await getDoc(doc(db, 'profesionales', docSnap.id)).catch(() => null)
              return { id: docSnap.id, ...docSnap.data(), profesional: profSnap?.exists() ? profSnap.data() : null }
            })
          )
          if (vigente) setDoctores(filas)
        } finally {
          if (vigente) setCargando(false)
        }
      },
      () => vigente && setCargando(false)
    )
    return () => {
      vigente = false
      unsubscribe()
    }
  }, [])

  return { doctores, cargando }
}

function MejoresPorEspecialidad({ doctores, cargando }) {
  // Ranking = calificación promedio que los pacientes le dan al doctor. Los que aún no tienen
  // calificaciones (promedio 0) no entran al ranking: no hay con qué compararlos.
  const grupos = useMemo(() => {
    const porEspecialidad = new Map()
    doctores.forEach((d) => {
      const especialidad = d.profesional?.especialidad ?? 'Sin especialidad'
      if (!porEspecialidad.has(especialidad)) porEspecialidad.set(especialidad, [])
      const nota = Number(d.profesional?.calificacionPromedio) || 0
      if (nota > 0) porEspecialidad.get(especialidad).push({ id: d.id, nombre: d.nombre, nota, experiencia: d.profesional?.experiencia })
    })
    return [...porEspecialidad.entries()]
      .map(([especialidad, lista]) => ({
        especialidad,
        top: lista.sort((a, b) => b.nota - a.nota || a.nombre.localeCompare(b.nombre, 'es')).slice(0, TOP_POR_ESPECIALIDAD),
      }))
      .sort((a, b) => a.especialidad.localeCompare(b.especialidad, 'es'))
  }, [doctores])

  return (
    <>
      <h2 className="section-title">Mejores doctores por especialidad</h2>
      <p className="web-sub" style={{ marginTop: -6 }}>Ranking según las calificaciones que los pacientes dan a cada doctor.</p>

      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && grupos.length === 0 && <p className="web-sub">Aún no hay doctores activos.</p>}

      <div className="rank-grid">
        {grupos.map(({ especialidad, top }) => (
          <div className="rank-card" key={especialidad}>
            <div className="rank-spec">{especialidad}</div>
            {top.length === 0 && <div className="rank-meta" style={{ padding: '10px 0 0' }}>Aún sin calificaciones de pacientes.</div>}
            {top.map((d, i) => (
              <div className="rank-row" key={d.id}>
                <div className={`rank-pos${i === 0 ? ' top' : ''}`}>{i + 1}</div>
                <div className="rank-info">
                  <div className="rank-nombre">{d.nombre}</div>
                  {d.experiencia && <div className="rank-meta">{d.experiencia}</div>}
                </div>
                <div className="rank-nota">{d.nota.toFixed(1)} <small>/ 5</small></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

// Doctores con bloqueo temporal o permanente: son los mismos datos que se ven en Denuncias y en Doctores.
function DoctoresBloqueados({ temporal, bloqueados, cargando }) {
  return (
    <>
      <h2 className="section-title">{temporal ? 'Doctores bloqueados temporalmente' : 'Doctores bloqueados permanentemente'}</h2>
      <ListaBloqueos bloqueados={bloqueados} cargando={cargando} temporal={temporal} soloDoctores />
    </>
  )
}

export default function InicioEstadisticas() {
  const [pestana, setPestana] = useState('resumen')
  const doctoresActivos = useConteo(CONSULTAS.doctoresActivos)
  const pacientes = useConteo(CONSULTAS.pacientes)
  const solicitudesPendientes = useConteo(CONSULTAS.solicitudesPendientes)
  const denunciasPendientes = useConteo(CONSULTAS.denunciasPendientes)
  const { doctores, cargando } = useDoctoresActivos()
  const temporales = useBloqueados('bloqueado_temporal', { soloDoctores: true })
  const permanentes = useBloqueados('bloqueado', { soloDoctores: true })

  return (
    <div>
      <h1 className="web-h1">Inicio y estadísticas</h1>
      <p className="web-sub">Vista general de la actividad de DocTop.</p>

      <div className="subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'resumen'} className={`subtab${pestana === 'resumen' ? ' on' : ''}`} onClick={() => setPestana('resumen')}>
          Resumen
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'bloqueados'} className={`subtab${pestana === 'bloqueados' ? ' on' : ''}`} onClick={() => setPestana('bloqueados')}>
          Doctores bloqueados temporalmente <span className="subtab-count">{temporales.bloqueados.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'permanentes'} className={`subtab${pestana === 'permanentes' ? ' on' : ''}`} onClick={() => setPestana('permanentes')}>
          Doctores bloqueados permanentemente <span className="subtab-count">{permanentes.bloqueados.length}</span>
        </button>
      </div>

      {pestana === 'resumen' && (
        <>
          <div className="web-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 12 }}>
            <div className="metric-card"><div className="metric-num">{doctoresActivos}</div><div className="metric-label">Doctores activos</div></div>
            <div className="metric-card"><div className="metric-num">{pacientes}</div><div className="metric-label">Pacientes registrados</div></div>
            <div className="metric-card"><div className="metric-num">{solicitudesPendientes}</div><div className="metric-label">Solicitudes pendientes</div></div>
            <div className="metric-card"><div className="metric-num">{denunciasPendientes}</div><div className="metric-label">Denuncias pendientes</div></div>
            <div className="metric-card"><div className="metric-num">{temporales.bloqueados.length + permanentes.bloqueados.length}</div><div className="metric-label">Doctores bloqueados</div></div>
          </div>
          <MejoresPorEspecialidad doctores={doctores} cargando={cargando} />
        </>
      )}

      {pestana === 'bloqueados' && <DoctoresBloqueados temporal {...temporales} />}
      {pestana === 'permanentes' && <DoctoresBloqueados temporal={false} {...permanentes} />}
    </div>
  )
}
