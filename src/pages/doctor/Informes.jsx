import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useInformes } from '../../hooks/useInformes'
import { formatearFecha } from '../../utils/fechas'
import { filtrarInformes } from '../../utils/informes'
import { descargarInformePdf, descargarInformesPdf } from '../../utils/informesPdf'

export default function Informes() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const { informes, cargando, error } = useInformes(usuario?.uid)

  const [nombre, setNombre] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [descargando, setDescargando] = useState('')
  const [errorPdf, setErrorPdf] = useState('')

  const rangoInvalido = Boolean(desde && hasta && desde > hasta)
  const visibles = useMemo(() => filtrarInformes(informes, { nombre, desde, hasta: rangoInvalido ? '' : hasta }), [informes, nombre, desde, hasta, rangoInvalido])
  const hayFiltros = Boolean(nombre || desde || hasta)

  function limpiar() {
    setNombre('')
    setDesde('')
    setHasta('')
  }

  async function descargarUno(informe) {
    setDescargando(informe.id)
    setErrorPdf('')
    try {
      await descargarInformePdf(informe)
    } catch {
      setErrorPdf('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setDescargando('')
    }
  }

  async function descargarTodos() {
    setDescargando('todos')
    setErrorPdf('')
    try {
      const partes = []
      if (nombre) partes.push(`paciente "${nombre}"`)
      if (desde) partes.push(`desde ${formatearFecha(`${desde}T12:00:00`)}`)
      if (hasta && !rangoInvalido) partes.push(`hasta ${formatearFecha(`${hasta}T12:00:00`)}`)
      await descargarInformesPdf(visibles, { doctorNombre: informes[0]?.doctorNombre, filtros: partes.join(', ') })
    } catch {
      setErrorPdf('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setDescargando('')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div className="web-h1">Informes médicos</div>
          <div className="web-sub">Tus informes por paciente. Busca por nombre o por fechas y descárgalos en PDF.</div>
        </div>
        <button type="button" className="btn btn-primary btn-auto" onClick={() => navigate('/doctor/informes/nuevo')}>+ Nuevo informe</button>
      </div>

      <div className="card-plain">
        <div className="informes-filtros">
          <div>
            <label className="campo-label" htmlFor="filtro-nombre">Paciente</label>
            <input id="filtro-nombre" type="text" placeholder="Buscar por nombre…" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label className="campo-label" htmlFor="filtro-desde">Desde</label>
            <input id="filtro-desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="campo-label" htmlFor="filtro-hasta">Hasta</label>
            <input id="filtro-hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <button type="button" className="btn btn-outline btn-auto" onClick={limpiar} disabled={!hayFiltros}>Limpiar</button>
        </div>
        {rangoInvalido && <div style={{ fontSize: 12, color: 'var(--alerta)', marginTop: 8 }}>La fecha "Desde" no puede ser posterior a "Hasta".</div>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '4px 0 10px' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {cargando ? 'Cargando…' : `${visibles.length} ${visibles.length === 1 ? 'informe' : 'informes'}${hayFiltros ? ` de ${informes.length}` : ''}`}
        </div>
        {visibles.length > 0 && (
          <button type="button" className="btn btn-outline btn-auto" onClick={descargarTodos} disabled={Boolean(descargando)}>
            {descargando === 'todos' ? 'Generando PDF…' : `Descargar ${hayFiltros ? 'los filtrados' : 'todos'} en PDF (${visibles.length})`}
          </button>
        )}
      </div>
      {errorPdf && <div className="registro-error">{errorPdf}</div>}
      {error && <div className="registro-error">No se pudieron cargar los informes. Si es la primera vez, publica las reglas de firestore.rules (ver README).</div>}

      {!cargando && !error && informes.length === 0 && (
        <div className="card-plain" style={{ textAlign: 'center', color: 'var(--gris)', fontSize: 13 }}>
          Todavía no hiciste ningún informe. Toca <b>+ Nuevo informe</b> para crear el primero.
        </div>
      )}
      {!cargando && informes.length > 0 && visibles.length === 0 && (
        <div className="card-plain" style={{ textAlign: 'center', color: 'var(--gris)', fontSize: 13 }}>Ningún informe coincide con esos filtros.</div>
      )}

      {visibles.map((informe) => (
        <div className="informe-fila" key={informe.id}>
          <div className="informe-fecha">{formatearFecha(informe.fecha)}</div>
          <div className="informe-cuerpo" onClick={() => navigate(`/doctor/informes/${informe.id}`)}>
            <div className="informe-paciente">{informe.pacienteNombre}</div>
            <div className="informe-resumen"><b>Motivo:</b> {informe.motivo}</div>
            <div className="informe-resumen"><b>Diagnóstico:</b> {informe.diagnostico}</div>
          </div>
          <div className="informe-acciones">
            <button type="button" className="btn btn-outline btn-auto" onClick={() => navigate(`/doctor/informes/${informe.id}`)}>Ver</button>
            <button type="button" className="btn btn-primary btn-auto" onClick={() => descargarUno(informe)} disabled={Boolean(descargando)}>
              {descargando === informe.id ? 'Generando…' : 'PDF'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
