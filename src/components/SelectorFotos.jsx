import { useEffect, useMemo, useRef, useState } from 'react'
import { LIMITE_FOTO_MB, validarArchivo } from '../utils/archivos'

// Botón "Subir foto" que abre la galería (o el explorador de archivos en el computador) y muestra
// una miniatura de cada foto elegida, con opción de quitarla. Las fotos se suben cuando el formulario
// que lo usa se envía; este componente solo las elige.
//
// `obligatoria`: muestra bajo el botón el aviso "La foto es obligatoria" (o "Las fotos son obligatorias")
// que pasa a "✓ Foto cargada" cuando ya hay al menos una. `resaltar` lo pinta en rojo (se activa cuando
// el usuario intentó enviar el formulario sin la foto). `nombre` personaliza el sujeto del aviso
// (por ejemplo "La foto del carnet profesional").
export default function SelectorFotos({
  archivos,
  onChange,
  maximo = 5,
  textoBoton = 'Subir foto',
  ayuda,
  limiteMB = LIMITE_FOTO_MB,
  deshabilitado = false,
  id,
  obligatoria = false,
  resaltar = false,
  nombre,
}) {
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const multiple = maximo > 1
  const cargada = archivos.length > 0

  const miniaturas = useMemo(() => archivos.map((a) => URL.createObjectURL(a)), [archivos])
  useEffect(() => () => miniaturas.forEach((url) => URL.revokeObjectURL(url)), [miniaturas])

  function alElegir(e) {
    const elegidos = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (elegidos.length === 0) return

    const errores = []
    const validos = elegidos.filter((archivo) => {
      const problema = validarArchivo(archivo, { solo: 'imagen', maxMB: limiteMB })
      if (problema) errores.push(problema)
      return !problema
    })

    let nuevos = archivos
    if (validos.length > 0) {
      nuevos = multiple ? [...archivos, ...validos] : [validos[0]]
      if (nuevos.length > maximo) {
        errores.push(`Puedes subir como máximo ${maximo} fotos.`)
        nuevos = nuevos.slice(0, maximo)
      }
    }
    setError(errores.join(' '))
    onChange(nuevos)
  }

  return (
    <div className="selector-fotos">
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={alElegir}
        disabled={deshabilitado}
      />
      <button
        type="button"
        className="btn btn-outline btn-auto"
        onClick={() => inputRef.current?.click()}
        disabled={deshabilitado || (multiple && archivos.length >= maximo)}
      >
        📷 {archivos.length > 0 && !multiple ? 'Cambiar foto' : textoBoton}
      </button>
      {obligatoria && (
        <div
          className={`selector-obligatoria${cargada ? ' ok' : resaltar ? ' error' : ''}`}
          role={resaltar && !cargada ? 'alert' : undefined}
          data-testid="foto-obligatoria"
        >
          {cargada
            ? `✓ ${multiple && archivos.length > 1 ? `${archivos.length} fotos cargadas` : 'Foto cargada'}`
            : multiple
              ? `⚠ ${nombre ?? 'Las fotos'} son obligatorias. Suba al menos una.`
              : `⚠ ${nombre ?? 'La foto'} es obligatoria.`}
        </div>
      )}
      {ayuda && <div className="selector-ayuda">{ayuda}</div>}
      {error && <div className="registro-error" style={{ marginTop: 8 }}>{error}</div>}

      {archivos.length > 0 && (
        <div className="miniaturas">
          {archivos.map((archivo, i) => (
            <div className="miniatura" key={`${archivo.name}-${archivo.size}-${i}`}>
              <img src={miniaturas[i]} alt={archivo.name} />
              <button
                type="button"
                className="miniatura-quitar"
                aria-label={`Quitar ${archivo.name}`}
                onClick={() => onChange(archivos.filter((_, j) => j !== i))}
                disabled={deshabilitado}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
