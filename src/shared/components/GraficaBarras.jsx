// Gráfica de barras horizontales, simple y liviana (sin librerías externas). Cada fila es una
// categoría; el ancho de la barra es proporcional al valor más alto del conjunto.
export default function GraficaBarras({ titulo, subtitulo, datos, color = 'var(--oro)', sufijo = '', cargando = false }) {
  const max = Math.max(1, ...datos.map((d) => d.valor))

  return (
    <div className="card-plain">
      <h2 className="section-title" style={{ marginTop: 0 }}>{titulo}</h2>
      {subtitulo && <p className="web-sub" style={{ marginTop: -6 }}>{subtitulo}</p>}

      {cargando && <p className="web-sub" style={{ margin: 0 }}>Cargando…</p>}
      {!cargando && datos.length === 0 && <p className="web-sub" style={{ margin: 0 }}>Todavía no hay datos suficientes.</p>}

      {!cargando && datos.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {datos.map((d) => (
            <div key={d.etiqueta}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>{d.etiqueta}</span>
                <span style={{ fontWeight: 600 }}>{d.valor}{sufijo}</span>
              </div>
              <div style={{ height: 10, background: 'var(--marfil-osc)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(2, (d.valor / max) * 100)}%`, background: color, borderRadius: 5 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
