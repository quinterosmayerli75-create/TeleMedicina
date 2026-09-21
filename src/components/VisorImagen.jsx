import { useEffect } from 'react'

// Visor a pantalla completa para ver bien una foto (por ejemplo un título). Con varias fotos,
// permite pasar a la anterior / siguiente. Se cierra con Esc o tocando fuera de la imagen.
export default function VisorImagen({ imagenes, indice, onCerrar, onCambiar }) {
  const actual = imagenes[indice]

  useEffect(() => {
    function alPresionar(e) {
      if (e.key === 'Escape') onCerrar()
      if (e.key === 'ArrowRight' && indice < imagenes.length - 1) onCambiar(indice + 1)
      if (e.key === 'ArrowLeft' && indice > 0) onCambiar(indice - 1)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [indice, imagenes.length, onCerrar, onCambiar])

  if (!actual) return null

  return (
    <div className="visor-fondo" onClick={onCerrar} role="dialog" aria-label={actual.etiqueta}>
      <button type="button" className="visor-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      {indice > 0 && (
        <button type="button" className="visor-flecha izq" onClick={(e) => { e.stopPropagation(); onCambiar(indice - 1) }} aria-label="Anterior">‹</button>
      )}
      <figure className="visor-figura" onClick={(e) => e.stopPropagation()}>
        <img src={actual.url} alt={actual.etiqueta} />
        <figcaption>
          {actual.etiqueta}
          {imagenes.length > 1 && <span> · {indice + 1} de {imagenes.length}</span>}
        </figcaption>
      </figure>
      {indice < imagenes.length - 1 && (
        <button type="button" className="visor-flecha der" onClick={(e) => { e.stopPropagation(); onCambiar(indice + 1) }} aria-label="Siguiente">›</button>
      )}
    </div>
  )
}
