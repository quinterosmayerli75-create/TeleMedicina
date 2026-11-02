import { useEffect, useRef } from 'react'
import { BarChart3 } from '@/shared/components/Icons'
import ValorAnimado from './ValorAnimado'
import '../styles/estadisticas.css'

const ALTURA_MAX = 150
const PALETA = ['#145c50', '#27846d', '#6fa17a', '#a5bc76', '#405d52']

export default function GraficaBarras({ titulo, subtitulo, datos, sufijo = '', cargando = false, Icono = BarChart3 }) {
  const ref = useRef(null)
  const version = JSON.stringify(datos.map(d => [d.etiqueta, d.valor]))
  const max = Math.max(1, ...datos.map(d => Number(d.valor) || 0))

  useEffect(() => {
    const node = ref.current
    if (!node || cargando) return undefined
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame
    let observer
    function mostrar() {
      observer?.disconnect()
      frame = requestAnimationFrame(() => node.setAttribute('data-chart-ready', 'true'))
    }
    function cambiar(event) { if (event.matches) node.setAttribute('data-chart-ready', 'true') }
    if (preference.matches || !('IntersectionObserver' in window)) node.setAttribute('data-chart-ready', 'true')
    else {
      node.setAttribute('data-chart-ready', 'false')
      observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) mostrar() }, { threshold: .15 })
      observer.observe(node)
    }
    preference.addEventListener('change', cambiar)
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); preference.removeEventListener('change', cambiar) }
  }, [cargando, version])

  return (
    <div className="admin-chart-card" ref={ref}>
      <div className="cabecera">
        <div className="icono"><Icono size={17} strokeWidth={2} /></div>
        <div><div className="titulo">{titulo}</div>{subtitulo && <div className="sub">{subtitulo}</div>}</div>
      </div>
      {cargando && <p className="web-sub" style={{ margin: 0 }}>Cargando…</p>}
      {!cargando && datos.length === 0 && <p className="web-sub" style={{ margin: 0 }}>Todavía no hay datos suficientes.</p>}
      {!cargando && datos.length > 0 && (
        <div className="grafica-columnas">
          {datos.map((d, i) => {
            const valor = Number(d.valor) || 0
            return <div className="grafica-columna" key={d.etiqueta}>
              <div className="grafica-valor"><ValorAnimado valor={valor} sufijo={sufijo} decimales={Number.isInteger(valor) ? 0 : 2} /></div>
              <div className="grafica-barra" aria-hidden="true" title={`${d.etiqueta}: ${valor}${sufijo}`} style={{ height: `${Math.max(0, (valor / max) * ALTURA_MAX)}px`, background: PALETA[i % PALETA.length], '--barra-delay': `${Math.min(i, 12) * 65}ms` }} />
              <div className="grafica-etiqueta">{d.etiqueta}</div>
            </div>
          })}
        </div>
      )}
    </div>
  )
}
