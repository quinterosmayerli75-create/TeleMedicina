import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, Image, Mic, MessageSquareText, Phone, Video, Flag, ArrowLeft, ArrowDown, Send, Trash2 } from '@/shared/components/Icons'
import { useAuth } from '@/features/auth/context/AuthContext'
import { enviarMensaje, idConversacion, mensajeErrorEnvio } from '../services/chat'
import { useMensajes } from '../hooks/useChat'
import { marcarNotificacionesDeChatLeidas } from '@/features/notificaciones/services/notificaciones'
import { useGrabadora } from '../hooks/useGrabadora'
import { useLlamada } from '../hooks/useLlamada'
import { LIMITE_ADJUNTO_MB, MB, formatearTamano, mensajeErrorSubida, nombreSeguro, subirArchivo, tipoDeArchivo } from '@/services/archivos'
import VisorImagen from '@/shared/components/VisorImagen'
import Burbuja, { formatearSegundos } from './Burbuja'
import LlamadaPanel from './LlamadaPanel'

// Conversación abierta con una persona: cabecera (foto y nombre llevan a su perfil), mensajes en
// tiempo real y barra para escribir y enviar archivos, documentos, fotos, videos y audios.
export default function ChatVentana({ miUid, miRol, otro, rutaPerfil, rutaDenuncia, subtitulo, onVolver }) {
  const navigate = useNavigate()
  const { perfil } = useAuth()
  // Quién es "pacienteId" vs "doctorId" en esta conversación: si alguno de los dos es
  // realmente paciente, ese va en pacienteId (como siempre). Si los dos son profesionales (un
  // doctor consultando a otro, ver "Mis citas"), no hay forma de saber quién iba primero, así
  // que se ordena por uid — así ambos lados calculan siempre la misma conversación, sin
  // importar quién la abre primero. Antes esto asumía "yo (doctor) siempre soy doctorId", lo
  // que hacía que dos doctores chateando calcularan conversaciones distintas entre sí.
  const yoSoyPaciente = miRol === 'paciente'
  const otroEsPaciente = otro.rol === 'paciente'
  let pacienteId
  let doctorId
  if (yoSoyPaciente) {
    pacienteId = miUid
    doctorId = otro.id
  } else if (otroEsPaciente) {
    pacienteId = otro.id
    doctorId = miUid
  } else if (miUid < otro.id) {
    pacienteId = miUid
    doctorId = otro.id
  } else {
    pacienteId = otro.id
    doctorId = miUid
  }
  const convId = idConversacion(pacienteId, doctorId)
  const pacienteRol = pacienteId === miUid ? miRol : otro.rol

  const { mensajes, cargando, error: errorLectura } = useMensajes(convId)
  const grabadora = useGrabadora()
  const llamada = useLlamada({ convId, pacienteId, doctorId, miUid })

  const [texto, setTexto] = useState('')
  const [subidas, setSubidas] = useState([])
  const [aviso, setAviso] = useState('')
  const [visor, setVisor] = useState(null)
  const cuerpoRef = useRef(null)
  const seguirFinRef = useRef(true)
  const [mostrarIrAlFinal, setMostrarIrAlFinal] = useState(false)
  const archivosRef = useRef(null)
  const galeriaRef = useRef(null)

  useEffect(() => {
    const cuerpo = cuerpoRef.current
    if (cuerpo && seguirFinRef.current) cuerpo.scrollTop = cuerpo.scrollHeight
  }, [mensajes.length, subidas.length])

  // Antes esto solo se revisaba al ENTRAR a la conversación (en PaginaMensajes.jsx): si un
  // mensaje nuevo llegaba mientras el chat ya estaba abierto en pantalla, su notificación se
  // creaba igual pero nunca se marcaba como leída — se quedaba sin leer para siempre a menos que
  // la persona la tocara a mano en la campanita. Al depender de "mensajes" en vez de solo del
  // montaje del componente, esto se vuelve a revisar cada vez que llega un mensaje nuevo mientras
  // la conversación sigue abierta.
  useEffect(() => {
    marcarNotificacionesDeChatLeidas(miUid, otro.id).catch(() => {})
  }, [mensajes.length, miUid, otro.id])

  const actualizarSubida = (id, cambios) => setSubidas((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)))
  const quitarSubida = (id) => setSubidas((prev) => prev.filter((s) => s.id !== id))

  async function enviarTexto(e) {
    e?.preventDefault()
    const limpio = texto.trim()
    if (!limpio) return
    seguirFinRef.current = true
    setTexto('')
    setAviso('')
    try {
      await enviarMensaje({ pacienteId, doctorId, pacienteRol, de: miUid, deNombre: perfil?.nombre, tipo: 'texto', texto: limpio })
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
        seguirFinRef.current = true
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
            pacienteRol,
            de: miUid,
            deNombre: perfil?.nombre,
            tipo: tipoDeArchivo(archivo),
            archivo: { url: subida.url, nombre: subida.nombre, tamano: subida.tamano, mime: subida.mime, duracion: archivo.duracion ?? null },
          })
          quitarSubida(id)
        } catch (err) {
          actualizarSubida(id, { error: err?.message?.startsWith('cloudinary/') ? mensajeErrorSubida(err) : mensajeErrorEnvio(err) })
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
        {onVolver && <button type="button" className="chat-back chat-action" onClick={onVolver} aria-label="Volver a conversaciones"><ArrowLeft size={19} /></button>}
        <button type="button" className="chat-person" onClick={() => navigate(rutaPerfil)} aria-label={`Ver perfil de ${otro.nombre}`}>
          {otro.fotoUrl ? <img src={otro.fotoUrl} alt="" /> : <span className="avatar-vacio chico" aria-hidden="true">{otro.nombre[0]}</span>}
          <span className="chat-person-copy"><span className="name">{otro.nombre}</span><span className="status">{subtitulo}</span></span>
        </button>
        <div className="chat-header-actions">
          <button type="button" className="chat-profile-link" onClick={() => navigate(rutaPerfil)}>Ver perfil</button>
          <button type="button" className="chat-action" title="Llamada de voz" aria-label="Iniciar llamada de voz" disabled={!!llamada.llamada} onClick={() => llamada.iniciar('audio')}><Phone size={18} /></button>
          <button type="button" className="chat-action chat-video-action" title="Iniciar videollamada" aria-label="Iniciar videollamada" disabled={!!llamada.llamada} onClick={() => llamada.iniciar('video')}><Video size={18} /><span>Videollamada</span></button>
          <button type="button" className="chat-action chat-report" title="Denunciar" aria-label="Denunciar conversación" onClick={() => navigate(rutaDenuncia)}><Flag size={16} /></button>
        </div>
      </div>

      <div className="chat-history">
      <div className="chat-body" ref={cuerpoRef} role="region" aria-label={`Mensajes con ${otro.nombre}`} tabIndex={0}
        onScroll={event => {
          const body = event.currentTarget
          const cerca = body.scrollHeight - body.scrollTop - body.clientHeight < 100
          seguirFinRef.current = cerca
          setMostrarIrAlFinal(!cerca)
        }}
        onLoadCapture={() => { const body = cuerpoRef.current; if (body && seguirFinRef.current) body.scrollTop = body.scrollHeight }}>
        <div className="chat-system">Tu espacio de conversación</div>
        {errorLectura === 'permission-denied' && (
          <div className="registro-error">No pudimos cargar los mensajes. Vuelve a abrir esta conversación en unos momentos.</div>
        )}
        {!cargando && !errorLectura && mensajes.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--gris)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#fff', color: 'var(--admin-accent-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquareText size={26} strokeWidth={1.6} />
            </div>
            <div style={{ fontSize: 13 }}>Aún no hay mensajes. Escriba el primero.</div>
          </div>
        )}
        {mensajes.map((m) => (
          <Burbuja
            key={m.id}
            mensaje={m}
            propio={m.de === miUid}
            onVerImagen={(archivo) => setVisor({ url: archivo.url, etiqueta: archivo.nombre ?? 'Foto' })}
          />
        ))}
        <div className="chat-scroll-end" aria-hidden="true" />
      </div>
      {mostrarIrAlFinal && <button type="button" className="chat-jump-bottom" onClick={() => { seguirFinRef.current = true; cuerpoRef.current?.scrollTo({ top: cuerpoRef.current.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }}><ArrowDown size={15} /> Ir al final</button>}
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
            <button type="button" className="attach-btn" title="Cancelar grabación" aria-label="Cancelar grabación" onClick={grabadora.cancelar}><Trash2 size={17} /></button>
            <div className="grabando"><span className="grabando-punto" />Grabando {formatearSegundos(grabadora.segundos)}</div>
            <button type="button" className="btn btn-primary btn-auto" onClick={enviarGrabacion}>Enviar audio</button>
          </>
        ) : (
          <>
            <button type="button" className="attach-btn" title="Enviar documentos o archivos" aria-label="Adjuntar archivo" onClick={() => archivosRef.current?.click()}><Paperclip size={16} /></button>
            <button type="button" className="attach-btn" title="Enviar fotos o videos" aria-label="Adjuntar foto o video" onClick={() => galeriaRef.current?.click()}><Image size={16} /></button>
            <button type="button" className="attach-btn" title="Grabar audio" aria-label="Grabar audio" onClick={empezarGrabacion}><Mic size={16} /></button>
            <input type="text" aria-label="Escribe un mensaje" placeholder="Escribe un mensaje…" value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button type="submit" className="btn btn-primary btn-auto" disabled={!texto.trim()} aria-label="Enviar mensaje"><span>Enviar</span><Send size={16} aria-hidden="true" /></button>
          </>
        )}
      </form>

      {visor && <VisorImagen imagenes={[visor]} indice={0} onCerrar={() => setVisor(null)} onCambiar={() => {}} />}

      <LlamadaPanel
        llamada={llamada.llamada}
        soyLlamante={llamada.soyLlamante}
        localStream={llamada.localStream}
        remoteStream={llamada.remoteStream}
        error={llamada.error}
        onAceptar={llamada.aceptar}
        onRechazar={llamada.rechazar}
        onColgar={llamada.colgar}
        onDescartarError={llamada.descartarError}
        otro={otro}
      />
    </div>
  )
}
