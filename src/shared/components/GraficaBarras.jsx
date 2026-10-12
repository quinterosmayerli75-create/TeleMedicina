import { useEffect, useState } from 'react'

const ALTURA_MAX = 150
const PALETA = ['var(--oro)', 'var(--esmeralda)', 'var(--alerta)', 'var(--ambar)', 'var(--oro-claro)']

// Gráfica de columnas de colores, animada al aparecer (crecen desde 0 hasta su altura final).
// Sin librerías externas: solo CSS + una transición disparada después del primer render.
export default function GraficaBarras({ titulo, subtitulo, datos, sufijo = '', cargando = false }) {
  const [animar, setAnimar] = useState(false)
  const max = Math.max(1, ...datos.map((d) => d.valor))

  useEffect(() => {
    if (cargando || datos.length === 0) return
    setAnimar(false)
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimar(true)))
    return () => cancelAnimationFrame(id)
  }, [cargando, datos])

  return (
    <div className="card-plain">
      <h2 className="section-title" style={{ marginTop: 0 }}>{titulo}</h2>
      {subtitulo && <p className="web-sub" style={{ marginTop: -6 }}>{subtitulo}</p>}

      {cargando && <p className="web-sub" style={{ margin: 0 }}>Cargando…</p>}
      {!cargando && datos.length === 0 && <p className="web-sub" style={{ margin: 0 }}>Todavía no hay datos suficientes.</p>}

      {!cargando && datos.length > 0 && (
        <div className="grafica-columnas">
          {datos.map((d, i) => (
            <div className="grafica-columna" key={d.etiqueta}>
              <div className="grafica-valor">{d.valor}{sufijo}</div>
              <div
                className="grafica-barra"
                style={{
                  height: animar ? `${Math.max(6, (d.valor / max) * ALTURA_MAX)}px` : '0px',
                  background: PALETA[i % PALETA.length],
                }}
              />
              <div className="grafica-etiqueta">{d.etiqueta}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
