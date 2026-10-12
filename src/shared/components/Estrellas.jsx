// Calificación en estrellas (0 a 5). Sin calificaciones (0) se muestra vacía y con una leyenda.
export default function Estrellas({ valor = 0, total = 0, mostrarNumero = true }) {
  const nota = Number(valor) || 0
  const llenas = Math.min(5, Math.max(0, Math.round(nota)))

  return (
    <div className="stars" aria-label={nota > 0 ? `Calificación ${nota.toFixed(1)} de 5` : 'Sin calificaciones todavía'}>
      {'★'.repeat(llenas)}
      <span style={{ color: 'var(--marfil-osc)' }}>{'★'.repeat(5 - llenas)}</span>{' '}
      {mostrarNumero && (
        <span style={{ color: 'var(--gris)' }}>
          {nota > 0 ? nota.toFixed(1) : 'Sin calificaciones aún'}
          {total > 0 && ` · ${total} ${total === 1 ? 'calificación' : 'calificaciones'}`}
        </span>
      )}
    </div>
  )
}
