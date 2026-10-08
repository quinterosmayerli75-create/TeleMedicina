import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { useBloqueados } from '@/features/bloqueos/hooks/useBloqueados'
import ListaBloqueos from '@/features/bloqueos/components/ListaBloqueos'
import GraficaBarras from '@/shared/components/GraficaBarras'
import { MODALIDADES } from '@/features/consultas/services/consultas'
import { descargarReportePdf } from '../utils/reportePdf'

const TOP_DOCTORES_POR_CONSULTAS = 8

// Trae toda la colección de una vez (son pocas filas para una app de curso) y la agrupa en el
// navegador — más simple que mantener contadores aparte en Firestore.
function useColeccion(nombre) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, nombre),
      (snap) => {
        setFilas(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setCargando(false)
      },
      () => setCargando(false)
    )
    return unsubscribe
  }, [nombre])

  return { filas, cargando }
}

// Cuántas consultas tiene cada doctor (las "más consultas" que pidió el ingeniero) y qué modalidad
// se usa más entre todas las consultas solicitadas.
function useGraficasConsultas() {
  const { filas: consultas, cargando } = useColeccion('consultas')

  const porDoctor = useMemo(() => {
    const conteo = new Map()
    consultas.forEach((c) => {
      const nombre = c.doctorNombre ?? 'Sin nombre'
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1)
    })
    return [...conteo.entries()]
      .map(([etiqueta, valor]) => ({ etiqueta, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, TOP_DOCTORES_POR_CONSULTAS)
  }, [consultas])

  const porModalidad = useMemo(() => {
    const conteo = { chat: 0, llamada: 0, video: 0 }
    consultas.forEach((c) => { if (c.modalidad in conteo) conteo[c.modalidad] += 1 })
    return Object.entries(conteo).map(([clave, valor]) => ({
      etiqueta: `${MODALIDADES[clave]?.icono ?? ''} ${MODALIDADES[clave]?.etiqueta ?? clave}`,
      valor,
    }))
  }, [consultas])

  return { porDoctor, porModalidad, cargando }
}

// Cuántas calificaciones de cada cantidad de estrellas (1 a 5) se dieron en total.
function useGraficaCalificaciones() {
  const { filas: calificaciones, cargando } = useColeccion('calificaciones')

  const porEstrellas = useMemo(() => {
    const conteo = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    calificaciones.forEach((c) => { if (c.estrellas in conteo) conteo[c.estrellas] += 1 })
    return [5, 4, 3, 2, 1].map((n) => ({ etiqueta: `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`, valor: conteo[n] }))
  }, [calificaciones])

  return { porEstrellas, cargando }
}

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

// Ranking = calificación promedio que los pacientes le dan al doctor. Los que aún no tienen
// calificaciones (promedio 0) no entran al ranking: no hay con qué compararlos.
function agruparPorEspecialidad(doctores) {
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
}

function MejoresPorEspecialidad({ doctores, cargando }) {
  const grupos = useMemo(() => agruparPorEspecialidad(doctores), [doctores])

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
  const { porDoctor, porModalidad, cargando: cargandoConsultas } = useGraficasConsultas()
  const { porEstrellas, cargando: cargandoCalificaciones } = useGraficaCalificaciones()

  function exportarReporte() {
    descargarReportePdf({
      metricas: [
        { etiqueta: 'Doctores activos', valor: doctoresActivos },
        { etiqueta: 'Pacientes registrados', valor: pacientes },
        { etiqueta: 'Solicitudes pendientes', valor: solicitudesPendientes },
        { etiqueta: 'Denuncias pendientes', valor: denunciasPendientes },
        { etiqueta: 'Doctores bloqueados', valor: temporales.bloqueados.length + permanentes.bloqueados.length },
      ],
      ranking: agruparPorEspecialidad(doctores),
    })
  }

  return (
    <div>
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Inicio y estadísticas</span>
        <button type="button" className="btn btn-outline btn-auto" onClick={exportarReporte}>📄 Descargar reporte PDF</button>
      </h1>
      <p className="web-sub">Vista general de la actividad de DocTop.</p>

      <div className="subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'resumen'} className={`subtab${pestana === 'resumen' ? ' on' : ''}`} onClick={() => setPestana('resumen')}>
          Resumen
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'graficas'} className={`subtab${pestana === 'graficas' ? ' on' : ''}`} onClick={() => setPestana('graficas')}>
          Gráficas
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
          <GraficaBarras
            titulo="Resumen en gráfica"
            datos={[
              { etiqueta: 'Doctores activos', valor: doctoresActivos },
              { etiqueta: 'Pacientes registrados', valor: pacientes },
              { etiqueta: 'Solicitudes pendientes', valor: solicitudesPendientes },
              { etiqueta: 'Denuncias pendientes', valor: denunciasPendientes },
              { etiqueta: 'Doctores bloqueados', valor: temporales.bloqueados.length + permanentes.bloqueados.length },
            ]}
          />
          <MejoresPorEspecialidad doctores={doctores} cargando={cargando} />
        </>
      )}

      {pestana === 'graficas' && (
        <div className="web-2col">
          <GraficaBarras
            titulo="Doctores con más consultas"
            subtitulo="Cantidad total de consultas solicitadas, por doctor."
            datos={porDoctor}
            color="var(--oro)"
            cargando={cargandoConsultas}
          />
          <GraficaBarras
            titulo="Modalidad más usada"
            subtitulo="Cómo prefieren atenderse los pacientes."
            datos={porModalidad}
            color="var(--esmeralda)"
            cargando={cargandoConsultas}
          />
          <GraficaBarras
            titulo="Calificaciones de los pacientes"
            subtitulo="Cuántas veces se dio cada cantidad de estrellas."
            datos={porEstrellas}
            color="var(--ambar)"
            cargando={cargandoCalificaciones}
          />
        </div>
      )}

      {pestana === 'bloqueados' && <DoctoresBloqueados temporal {...temporales} />}
      {pestana === 'permanentes' && <DoctoresBloqueados temporal={false} {...permanentes} />}
    </div>
  )
}
