import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import {
  Stethoscope, Users, ClipboardList, ShieldAlert, Ban, CreditCard, Hourglass,
  BarChart3, TrendingUp, Monitor, Star, Tags, Wallet,
} from 'lucide-react'
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

// Cuántas consultas tiene cada doctor, qué modalidad se usa más, qué especialidades se piden más y
// cuánto se ha ingresado por cada una (lo que pide HU-36: "especialidades más solicitadas" e
// "ingresos registrados"). Son pocas filas para una app de curso, se agrupa todo en el navegador.
function useGraficasConsultas() {
  const { filas: consultas, cargando } = useColeccion('consultas')
  const { filas: profesionales } = useColeccion('profesionales')
  const { filas: usuarios } = useColeccion('usuarios')

  const especialidadPorDoctor = useMemo(() => {
    const mapa = new Map()
    profesionales.forEach((p) => mapa.set(p.id, p.especialidad || 'Sin especialidad'))
    return mapa
  }, [profesionales])

  const nombrePorDoctor = useMemo(() => {
    const mapa = new Map()
    usuarios.forEach((u) => mapa.set(u.id, u.nombre || 'Profesional'))
    return mapa
  }, [usuarios])

  // Promedio de estrellas por doctor (ya calculado en profesionales.calificacionPromedio al guardar
  // cada calificación), con el nombre del doctor como etiqueta — para saber a quién corresponde cada nota.
  const porDoctorCalificacion = useMemo(() => {
    return profesionales
      .filter((p) => (p.totalCalificaciones ?? 0) > 0)
      .map((p) => ({
        etiqueta: nombrePorDoctor.get(p.id) ?? 'Profesional',
        valor: Number(p.calificacionPromedio) || 0,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, TOP_DOCTORES_POR_CONSULTAS)
  }, [profesionales, nombrePorDoctor])

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

  const porEspecialidad = useMemo(() => {
    const conteo = new Map()
    consultas.forEach((c) => {
      const esp = especialidadPorDoctor.get(c.doctorId) ?? 'Sin especialidad'
      conteo.set(esp, (conteo.get(esp) ?? 0) + 1)
    })
    return [...conteo.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor)
  }, [consultas, especialidadPorDoctor])

  // "Ingresos" = lo que ya se pagó y quedó aprobado (habilitada o finalizada), por especialidad.
  const pagadas = useMemo(() => consultas.filter((c) => c.estado === 'habilitada' || c.estado === 'finalizada'), [consultas])
  const ingresoTotal = useMemo(() => pagadas.reduce((suma, c) => suma + (Number(c.costoConsulta) || 0), 0), [pagadas])
  const ingresosPorEspecialidad = useMemo(() => {
    const conteo = new Map()
    pagadas.forEach((c) => {
      const esp = especialidadPorDoctor.get(c.doctorId) ?? 'Sin especialidad'
      conteo.set(esp, (conteo.get(esp) ?? 0) + (Number(c.costoConsulta) || 0))
    })
    return [...conteo.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor)
  }, [pagadas, especialidadPorDoctor])

  const pagosPendientes = useMemo(() => consultas.filter((c) => c.estado === 'pago_en_revision').length, [consultas])

  return { porDoctor, porModalidad, porEspecialidad, ingresoTotal, ingresosPorEspecialidad, pagosPendientes, porDoctorCalificacion, cargando }
}

// Cuántas calificaciones de cada cantidad de estrellas (1 a 5) se dieron en total, y de qué
// doctor es cada una (para no dejar el gráfico sin saber a quién corresponde).
function useGraficaCalificaciones() {
  const { filas: calificaciones, cargando } = useColeccion('calificaciones')
  const { filas: usuarios } = useColeccion('usuarios')

  const nombrePorId = useMemo(() => {
    const mapa = new Map()
    usuarios.forEach((u) => mapa.set(u.id, u.nombre || 'Doctor'))
    return mapa
  }, [usuarios])

  const porEstrellas = useMemo(() => {
    const conteo = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const doctoresPorNivel = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    calificaciones.forEach((c) => {
      if (!(c.estrellas in conteo)) return
      conteo[c.estrellas] += 1
      const nombre = nombrePorId.get(c.doctorId)
      if (nombre) doctoresPorNivel[c.estrellas].push(nombre)
    })
    return [5, 4, 3, 2, 1].map((n) => {
      const nombres = [...new Set(doctoresPorNivel[n])]
      const sufijoNombre = nombres.length === 0 ? '' : nombres.length <= 2 ? ` · ${nombres.join(', ')}` : ` · ${nombres[0]} y ${nombres.length - 1} más`
      return { etiqueta: `${'★'.repeat(n)}${'☆'.repeat(5 - n)}${sufijoNombre}`, valor: conteo[n] }
    })
  }, [calificaciones, nombrePorId])

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
  const { porDoctor, porModalidad, porEspecialidad, ingresoTotal, ingresosPorEspecialidad, pagosPendientes, porDoctorCalificacion, cargando: cargandoConsultas } = useGraficasConsultas()
  const { porEstrellas, cargando: cargandoCalificaciones } = useGraficaCalificaciones()

  function exportarReporte() {
    descargarReportePdf({
      metricas: [
        { etiqueta: 'Doctores activos', valor: doctoresActivos },
        { etiqueta: 'Pacientes registrados', valor: pacientes },
        { etiqueta: 'Solicitudes pendientes', valor: solicitudesPendientes },
        { etiqueta: 'Denuncias pendientes', valor: denunciasPendientes },
        { etiqueta: 'Doctores bloqueados', valor: temporales.bloqueados.length + permanentes.bloqueados.length },
        { etiqueta: 'Ingresos registrados (Bs)', valor: ingresoTotal },
        { etiqueta: 'Pagos pendientes de validar', valor: pagosPendientes },
      ],
      ranking: agruparPorEspecialidad(doctores),
    })
  }

  return (
    <div>
      <div className="admin-eyebrow">
        PLATAFORMA DOCTOP
        <span className="vivo"><span className="punto" /> Sincronización en vivo</span>
      </div>
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Inicio y estadísticas</span>
        <button type="button" className="btn btn-outline btn-auto" onClick={exportarReporte}>📄 Descargar reporte PDF</button>
      </h1>
      <p className="web-sub">Vista general de la actividad de DocTop.</p>

      <div className="admin-subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'resumen'} className={`admin-subtab${pestana === 'resumen' ? ' on' : ''}`} onClick={() => setPestana('resumen')}>
          🏠 Resumen general
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'graficas'} className={`admin-subtab${pestana === 'graficas' ? ' on' : ''}`} onClick={() => setPestana('graficas')}>
          📊 Gráficas y métricas
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'bloqueados'} className={`admin-subtab${pestana === 'bloqueados' ? ' on' : ''}`} onClick={() => setPestana('bloqueados')}>
          ⏱️ Doctores bloqueados temporalmente <span className="admin-subtab-count">{temporales.bloqueados.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'permanentes'} className={`admin-subtab${pestana === 'permanentes' ? ' on' : ''}`} onClick={() => setPestana('permanentes')}>
          🛡️ Doctores bloqueados permanentemente <span className="admin-subtab-count">{permanentes.bloqueados.length}</span>
        </button>
      </div>

      {pestana === 'resumen' && (
        <>
          <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
            <div className="admin-metric-card">
              <div className="icono"><Stethoscope size={16} strokeWidth={2} /></div>
              <div className="overline">Doctores activos</div>
              <div className="numero">{doctoresActivos}</div>
              <div className="caption">Disponibles para teleconsulta</div>
            </div>
            <div className="admin-metric-card c-azul">
              <div className="icono"><Users size={16} strokeWidth={2} /></div>
              <div className="overline">Pacientes registrados</div>
              <div className="numero">{pacientes}</div>
              <div className="caption">Cuentas activas</div>
            </div>
            <div className="admin-metric-card c-rojo">
              <div className="icono"><ClipboardList size={16} strokeWidth={2} /></div>
              <div className="overline">Solicitudes pendientes</div>
              <div className="numero">{solicitudesPendientes}</div>
              <div className="caption">Validación de título y matrícula</div>
            </div>
            <div className="admin-metric-card c-ambar">
              <div className="icono"><ShieldAlert size={16} strokeWidth={2} /></div>
              <div className="overline">Denuncias pendientes</div>
              <div className="numero">{denunciasPendientes}</div>
              <div className="caption">Por revisar</div>
            </div>
            <div className="admin-metric-card c-onyx">
              <div className="icono"><Ban size={16} strokeWidth={2} /></div>
              <div className="overline">Doctores bloqueados</div>
              <div className="numero">{temporales.bloqueados.length + permanentes.bloqueados.length}</div>
              <div className="caption">Temporal + permanente</div>
            </div>
          </div>
          <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 16 }}>
            <div className="admin-feature-card">
              <div className="icono"><CreditCard size={18} strokeWidth={2} /></div>
              <div className="overline">Pagos de consultas</div>
              <div className="titulo">Ingresos registrados en plataforma</div>
              <div className="sub">Consultas completadas y liquidadas entre doctor y paciente.</div>
              <div className="numero">Bs {ingresoTotal}</div>
            </div>
            <div className="admin-feature-card c-ambar">
              <div className="icono"><Hourglass size={18} strokeWidth={2} /></div>
              <div className="overline">Validación de pagos</div>
              <div className="titulo">Pagos pendientes de validar</div>
              <div className="sub">Comprobantes subidos por pacientes, a la espera del doctor.</div>
              <div className="numero">{pagosPendientes}</div>
            </div>
          </div>
          <GraficaBarras
            titulo="Resumen en gráfica"
            Icono={BarChart3}
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
            Icono={TrendingUp}
            datos={porDoctor}
            cargando={cargandoConsultas}
          />
          <GraficaBarras
            titulo="Modalidad más usada"
            subtitulo="Cómo prefieren atenderse los pacientes."
            Icono={Monitor}
            datos={porModalidad}
            cargando={cargandoConsultas}
          />
          <GraficaBarras
            titulo="Calificaciones de los pacientes"
            subtitulo={
              porDoctorCalificacion.length > 0
                ? `Mejor calificado: ${porDoctorCalificacion[0].etiqueta} (${porDoctorCalificacion[0].valor} ★). Cuántas veces se dio cada cantidad de estrellas.`
                : 'Cuántas veces se dio cada cantidad de estrellas.'
            }
            Icono={Star}
            datos={porEstrellas}
            cargando={cargandoCalificaciones}
          />
          <GraficaBarras
            titulo="Calificación promedio por doctor"
            subtitulo="A quién corresponde cada nota — promedio de estrellas, por doctor."
            Icono={Star}
            datos={porDoctorCalificacion}
            sufijo=" ★"
            cargando={cargandoConsultas}
          />
          <GraficaBarras
            titulo="Especialidades más solicitadas"
            subtitulo="Consultas pedidas, agrupadas por especialidad del doctor."
            Icono={Tags}
            datos={porEspecialidad}
            cargando={cargandoConsultas}
          />
          <GraficaBarras
            titulo="Ingresos por especialidad"
            subtitulo="Solo consultas ya pagadas y aprobadas (habilitadas o finalizadas)."
            Icono={Wallet}
            datos={ingresosPorEspecialidad}
            sufijo=" Bs"
            cargando={cargandoConsultas}
          />
        </div>
      )}

      {pestana === 'bloqueados' && <DoctoresBloqueados temporal {...temporales} />}
      {pestana === 'permanentes' && <DoctoresBloqueados temporal={false} {...permanentes} />}
    </div>
  )
}
