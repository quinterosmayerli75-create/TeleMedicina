import { formatearTamano } from '../../utils/archivos'
import { aFecha } from '../../utils/fechas'

export function formatearHora(valor) {
  const fecha = aFecha(valor) ?? new Date()
  return fecha.toLocaleTimeString('es-BO', { hour: 'numeric', minute: '2-digit' })
}

export function formatearSegundos(total = 0) {
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function Adjunto({ mensaje, onVerImagen }) {
  const { tipo, archivo } = mensaje
  if (!archivo?.url) return null

  if (tipo === 'imagen') {
    return (
      <button type="button" className="adjunto-imagen" onClick={() => onVerImagen(archivo)} aria-label={`Ver foto ${archivo.nombre ?? ''}`}>
        <img className="attach" src={archivo.url} alt={archivo.nombre ?? 'Foto'} />
      </button>
    )
  }
  if (tipo === 'video') {
    return <video className="adjunto-video" src={archivo.url} controls preload="metadata" />
  }
  if (tipo === 'audio') {
    return (
      <div className="audio-bubble">
        <span aria-hidden="true">🎤</span>
        <audio className="adjunto-audio" src={archivo.url} controls preload="metadata" />
        {archivo.duracion ? <span className="adjunto-duracion">{formatearSegundos(archivo.duracion)}</span> : null}
      </div>
    )
  }
  return (
    <a className="adjunto-doc" href={archivo.url} target="_blank" rel="noreferrer" download={archivo.nombre}>
      <span className="adjunto-doc-icono" aria-hidden="true">📄</span>
      <span className="adjunto-doc-info">
        <span className="adjunto-doc-nombre">{archivo.nombre ?? 'Documento'}</span>
        <span className="adjunto-doc-tamano">{formatearTamano(archivo.tamano)} · Abrir / descargar</span>
      </span>
    </a>
  )
}

export default function Burbuja({ mensaje, propio, onVerImagen }) {
  return (
    <div className={`bubble ${propio ? 'out' : 'in'}`}>
      <Adjunto mensaje={mensaje} onVerImagen={onVerImagen} />
      {mensaje.texto}
      <span className="time">{mensaje.fecha ? formatearHora(mensaje.fecha) : 'Enviando…'}</span>
    </div>
  )
}
