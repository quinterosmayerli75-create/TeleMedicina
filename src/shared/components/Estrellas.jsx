import Icono from './Icono'
// Calificación en estrellas (0 a 5). Sin calificaciones (0) se muestra vacía y con una leyenda.
export default function Estrellas({ valor = 0, total = 0, mostrarNumero = true }) {
  const nota = Number(valor) || 0
  const llenas = Math.min(5, Math.max(0, Math.round(nota)))

  return (
    <div className="stars" aria-label={nota > 0 ? `Calificación ${nota.toFixed(1)} de 5` : 'Sin calificaciones todavía'}>
      {[0, 1, 2, 3, 4].map(index => <Icono key={index} nombre="star" size={14} fill={index < llenas ? 'currentColor' : 'none'} style={{ color: index < llenas ? 'var(--admin-accent)' : '#c7d0be', marginRight: 2 }} />)}{' '}
      {mostrarNumero && (
        <span style={{ color: 'var(--gris)' }}>
          {nota > 0 ? nota.toFixed(1) : 'Sin calificaciones aún'}
          {total > 0 && ` · ${total} ${total === 1 ? 'calificación' : 'calificaciones'}`}
        </span>
      )}
    </div>
  )
}
