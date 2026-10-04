import { useState } from 'react'

const TEXTOS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente']

// Cinco estrellas para tocar y elegir una calificación de 1 a 5. Al pasar el mouse muestra una vista
// previa; con teclado se llega a cada estrella con Tab y se elige con Enter o Espacio.
export default function SelectorEstrellas({ valor = 0, onChange, deshabilitado = false }) {
  const [sobre, setSobre] = useState(0)
  const mostrado = sobre || valor

  return (
    <div className="selector-estrellas" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas" onMouseLeave={() => setSobre(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
          className={`estrella-btn${n <= mostrado ? ' on' : ''}`}
          disabled={deshabilitado}
          onMouseEnter={() => setSobre(n)}
          onFocus={() => setSobre(n)}
          onBlur={() => setSobre(0)}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
      <span className="estrellas-texto">{TEXTOS[mostrado]}</span>
    </div>
  )
}
