import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { enviarMensaje, idConversacion, mensajeErrorEnvio } from '../../firebase/chat'
import { useMensajes } from '../../hooks/useChat'
import { useGrabadora } from '../../hooks/useGrabadora'
import { LIMITE_ADJUNTO_MB, MB, formatearTamano, mensajeErrorSubida, nombreSeguro, subirArchivo, tipoDeArchivo } from '../../utils/archivos'
import VisorImagen from '../VisorImagen'
import Burbuja, { formatearSegundos } from './Burbuja'

// Conversación abierta con una persona: cabecera (foto y nombre llevan a su perfil), mensajes en
// tiempo real y barra para escribir y enviar archivos, documentos, fotos, videos y audios.
export default function ChatVentana({ miUid, miRol, otro, rutaPerfil, rutaDenuncia, subtitulo }) {
  const navigate = useNavigate()
  const pacienteId = miRol === 'paciente' ? miUid : otro.id
  const doctorId = miRol === 'paciente' ? otro.id : miUid
  const convId = idConversacion(pacienteId, doctorId)

  const { mensajes, cargando, error: errorLectura } = useMensajes(convId)
  const grabadora = useGrabadora()

  const [texto, setTexto] = useState('')
  const [subidas, setSubidas] = useState([])
  const [aviso, setAviso] = useState('')
  const [visor, setVisor] = useState(null)
  const finRef = useRef(null)
  const archivosRef = useRef(null)
  const galeriaRef = useRef(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' })
  }, [mensajes.length, subidas.length])

  const actualizarSubida = (id, cambios) => setSubidas((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)))
  const quitarSubida = (id) => setSubidas((prev) => prev.filter((s) => s.id !== id))

  async function enviarTexto(e) {
    e?.preventDefault()
    const limpio = texto.trim()
    if (!limpio) return
    setTexto('')
    setAviso('')
    try {
      await enviarMensaje({ pacienteId, doctorId, de: miUid, tipo: 'texto', texto: limpio })
    } catch (err) {
      setTexto(limpio)
      setAviso(mensajeErrorEnvio(err))
    }
  }

  // Sube cada archivo a Storage (con barra de progreso) y luego lo manda como mensaje.
  async function enviarArchivos(lista) {
    const errores = []
    const validos = lista.filter((archivo) => {
      if (archivo.size === 0) {
        errores.push(`"${archivo.name}" está vacío.`)
        return false
      }
      if (archivo.size > LIMITE_ADJUNTO_MB * MB) {
        errores.push(`"${archivo.name}" pesa ${formatearTamano(archivo.size)}; el máximo es ${LIMITE_ADJUNTO_MB} MB.`)
        return false
      }
      return true
    })
    setAviso(errores.join(' '))

    await Promise.all(
      validos.map(async (archivo) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        setSubidas((prev) => [...prev, { id, nombre: archivo.name, progreso: 0, error: '' }])
        try {
          const subida = await subirArchivo(
            `chats/${convId}/${miUid}/${Date.now()}-${nombreSeguro(archivo.name)}`,
            archivo,
            (progreso) => actualizarSubida(id, { progreso })
          )
          await enviarMensaje({
            pacienteId,
            doctorId,
            de: miUid,
            tipo: tipoDeArchivo(archivo),
            archivo: { url: subida.url, nombre: subida.nombre, tamano: subida.tamano, mime: subida.mime, duracion: archivo.duracion ?? null },
          })
          quitarSubida(id)
        } catch (err) {
          actualizarSubida(id, { error: err?.code?.startsWith('storage/') ? mensajeErrorSubida(err) : mensajeErrorEnvio(err) })
        }
      })
    )
  }

  function alElegirArchivos(e) {
    const lista = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (lista.length > 0) enviarArchivos(lista)
  }

  async function empezarGrabacion() {
    setAviso('')
    try {
      await grabadora.iniciar()
    } catch (err) {
      setAviso(err.message)
    }
  }

  async function enviarGrabacion() {
    const audio = await grabadora.detener()
    if (audio) enviarArchivos([audio])
    else setAviso('No se grabó nada de audio.')
  }

  return (
    <div className="web-pane-chat">
      <div className="chat-header">
        {otro.fotoUrl ? (
          <img src={otro.fotoUrl} alt={otro.nombre} onClick={() => navigate(rutaPerfil)} />
        ) : (
          <div className="avatar-vacio chico" onClick={() => navigate(rutaPerfil)} aria-hidden="true">{otro.nombre[0]}</div>
        )}
        <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => navigate(rutaPerfil)}>
          <div className="name">{otro.nombre}</div>
          <div className="status">{subtitulo}</div>
        </div>
        <div className="icn" style={{ color: 'var(--alerta)' }} title="Denunciar" onClick={() => navigate(rutaDenuncia)}>⚑</div>
      </div>

      <div className="chat-body" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="chat-system">Conversación verificada por DocTop</div>
        {errorLectura === 'permission-denied' && (
          <div className="registro-error">Firestore no permite leer los mensajes: hay que publicar las reglas de firestore.rules (ver README).</div>
        )}
        {!cargando && !errorLectura && mensajes.length === 0 && (
          <div className="chat-system" style={{ background: 'transparent', color: 'var(--gris)' }}>Aún no hay mensajes. Escriba el primero.</div>
        )}
        {mensajes.map((m) => (
          <Burbuja
            key={m.id}
            mensaje={m}
            propio={m.de === miUid}
            onVerImagen={(archivo) => setVisor({ url: archivo.url, etiqueta: archivo.nombre ?? 'Foto' })}
          />
        ))}
        <div ref={finRef} />
      </div>

      {(subidas.length > 0 || aviso) && (
        <div className="chat-avisos">
          {subidas.map((s) => (
            <div className={`subida${s.error ? ' con-error' : ''}`} key={s.id}>
              <span className="subida-nombre">{s.nombre}</span>
              {s.error ? (
                <>
                  <span className="subida-error">{s.error}</span>
                  <button type="button" className="subida-cerrar" onClick={() => quitarSubida(s.id)} aria-label="Descartar">×</button>
                </>
              ) : (
                <>
                  <span className="subida-barra"><span style={{ width: `${Math.round(s.progreso * 100)}%` }} /></span>
                  <span className="subida-pct">{Math.round(s.progreso * 100)}%</span>
                </>
              )}
            </div>
          ))}
          {aviso && <div className="registro-error" style={{ margin: 0 }}>{aviso}</div>}
        </div>
      )}

      <form className="chat-composer" onSubmit={enviarTexto}>
        <input ref={archivosRef} type="file" multiple hidden onChange={alElegirArchivos} aria-label="Elegir documentos o archivos" />
        <input ref={galeriaRef} type="file" accept="image/*,video/*" multiple hidden onChange={alElegirArchivos} aria-label="Elegir fotos o videos" />

        {grabadora.grabando ? (
          <>
            <button type="button" className="attach-btn" title="Cancelar grabación" onClick={grabadora.cancelar}>🗑</button>
            <div className="grabando"><span className="grabando-punto" />Grabando {formatearSegundos(grabadora.segundos)}</div>
            <button type="button" className="btn btn-primary btn-auto" onClick={enviarGrabacion}>Enviar audio</button>
          </>
        ) : (
          <>
            <button type="button" className="attach-btn" title="Enviar documentos o archivos" aria-label="Adjuntar archivo" onClick={() => archivosRef.current?.click()}>📎</button>
            <button type="button" className="attach-btn" title="Enviar fotos o videos" aria-label="Adjuntar foto o video" onClick={() => galeriaRef.current?.click()}>📷</button>
            <button type="button" className="attach-btn" title="Grabar audio" aria-label="Grabar audio" onClick={empezarGrabacion}>🎤</button>
            <input type="text" placeholder="Escriba un mensaje…" style={{ flex: 1 }} value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-auto" disabled={!texto.trim()}>Enviar</button>
          </>
        )}
      </form>

      {visor && <VisorImagen imagenes={[visor]} indice={0} onCerrar={() => setVisor(null)} onCambiar={() => {}} />}
    </div>
  )
}
