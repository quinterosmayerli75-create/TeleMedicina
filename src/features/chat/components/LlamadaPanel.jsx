import { useEffect, useRef, useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'

function VideoStream({ stream, muted, espejado, oculto }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.srcObject = stream ?? null
    // En varios navegadores (sobre todo en celular) el autoplay de un video con audio y sin
    // "muted" se bloquea en silencio: el stream llega bien, pero el video se queda pausado con
    // el ícono nativo de "play" y no se escucha nada. Forzar play() explícito arregla la mayoría
    // de los casos; si igual lo bloquea, queda el reintento al tocar la pantalla (ver más abajo).
    if (stream) ref.current.play().catch(() => {})
  }, [stream])
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: espejado ? 'scaleX(-1)' : undefined, display: oculto ? 'none' : undefined }}
    />
  )
}

// Reintenta reproducir todo video/audio de la llamada: para cuando el navegador bloqueó el
// autoplay y hace falta un toque de la persona (un gesto real del usuario) para desbloquearlo.
function reintentarReproduccion(contenedor) {
  contenedor?.querySelectorAll('video').forEach((v) => v.play().catch(() => {}))
}

// Pantalla de llamada (sonando, entrante o en curso) que se superpone sobre el chat abierto.
export default function LlamadaPanel({ llamada, soyLlamante, localStream, remoteStream, error, onAceptar, onRechazar, onColgar, onDescartarError, otro }) {
  const [micActivo, setMicActivo] = useState(true)
  const [camActiva, setCamActiva] = useState(true)

  useEffect(() => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = micActivo })
  }, [micActivo, localStream])

  useEffect(() => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = camActiva })
  }, [camActiva, localStream])

  // Si falló el micrófono/cámara ANTES de crear la llamada en Firestore, "llamada" nunca llega a
  // existir — pero igual hay que mostrar el error, si no la persona no ve absolutamente nada al
  // tocar el botón de llamar (justo el bug reportado: "no me muestra que estoy llamando").
  if (!llamada) {
    if (!error) return null
    return (
      <div className="llamada-overlay">
        <div className="llamada-tarjeta">
          <div className="llamada-nombre">No se pudo iniciar la llamada</div>
          <p style={{ fontSize: 13, color: '#CFE8DE', marginTop: 8 }}>{error}</p>
          <button type="button" className="btn btn-outline btn-auto" style={{ marginTop: 14 }} onClick={onDescartarError}>Cerrar</button>
        </div>
      </div>
    )
  }

  const sonando = llamada.estado === 'llamando'
  const esVideo = llamada.tipo === 'video'

  return (
    <div className="llamada-overlay">
      {sonando && soyLlamante && (
        <div className="llamada-tarjeta">
          <div className="llamada-nombre">Llamando a {otro.nombre}…</div>
          <div className="llamada-tipo">{esVideo ? '🎥 Videollamada' : '📞 Llamada de voz'}</div>
          <button type="button" className="llamada-redondo colgar" style={{ margin: '16px auto 0' }} onClick={onColgar} title="Cancelar">
            <PhoneOff size={24} />
          </button>
        </div>
      )}

      {sonando && !soyLlamante && (
        <div className="llamada-tarjeta">
          <div className="llamada-nombre">{otro.nombre} te está llamando</div>
          <div className="llamada-tipo">{esVideo ? '🎥 Videollamada' : '📞 Llamada de voz'}</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 18, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <button type="button" className="llamada-redondo colgar" onClick={onRechazar} title="Rechazar">
                <PhoneOff size={24} />
              </button>
              <div style={{ fontSize: 11, color: '#CFE8DE', marginTop: 6 }}>Rechazar</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button type="button" className="llamada-redondo aceptar" onClick={onAceptar} title="Aceptar">
                <Phone size={24} />
              </button>
              <div style={{ fontSize: 11, color: '#CFE8DE', marginTop: 6 }}>Aceptar</div>
            </div>
          </div>
        </div>
      )}

      {llamada.estado === 'conectada' && (
        <div className="llamada-activa" onClick={(e) => reintentarReproduccion(e.currentTarget)}>
          {esVideo && (
            <div className="llamada-header">
              <div className="llamada-header-chip">🟢 {otro.nombre}</div>
            </div>
          )}
          {esVideo ? (
            <div className="llamada-videos">
              <VideoStream stream={remoteStream} />
              <div className="llamada-video-propio"><VideoStream stream={localStream} muted espejado /></div>
            </div>
          ) : (
            <div className="llamada-audio-indicador">
              <div className="avatar-vacio" style={{ width: 72, height: 72, fontSize: 28 }}>{otro.nombre?.[0]}</div>
              <div className="llamada-nombre">{otro.nombre}</div>
              <div className="llamada-tipo">📞 En llamada…</div>
              <VideoStream stream={remoteStream} oculto />
            </div>
          )}

          <div className="llamada-controles">
            <button type="button" className={`llamada-btn${micActivo ? '' : ' off'}`} onClick={() => setMicActivo((v) => !v)} title={micActivo ? 'Silenciar' : 'Activar micrófono'}>
              {micActivo ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            {esVideo && (
              <button type="button" className={`llamada-btn${camActiva ? '' : ' off'}`} onClick={() => setCamActiva((v) => !v)} title={camActiva ? 'Apagar cámara' : 'Encender cámara'}>
                {camActiva ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            )}
            <button type="button" className="llamada-btn colgar" onClick={onColgar} title="Colgar"><PhoneOff size={20} /></button>
          </div>
        </div>
      )}

      {error && <div className="registro-error" style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: '#fff', padding: 10 }}>{error}</div>}
    </div>
  )
}
