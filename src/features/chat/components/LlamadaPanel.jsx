import { useEffect, useRef, useState } from 'react'

function VideoStream({ stream, muted, espejado, oculto }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream ?? null
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

// Pantalla de llamada (sonando, entrante o en curso) que se superpone sobre el chat abierto.
export default function LlamadaPanel({ llamada, soyLlamante, localStream, remoteStream, error, onAceptar, onRechazar, onColgar, otro }) {
  const [micActivo, setMicActivo] = useState(true)
  const [camActiva, setCamActiva] = useState(true)

  useEffect(() => {
    localStream?.getAudioTracks().forEach((t) => { t.enabled = micActivo })
  }, [micActivo, localStream])

  useEffect(() => {
    localStream?.getVideoTracks().forEach((t) => { t.enabled = camActiva })
  }, [camActiva, localStream])

  if (!llamada) return null

  const sonando = llamada.estado === 'llamando'
  const esVideo = llamada.tipo === 'video'

  return (
    <div className="llamada-overlay">
      {sonando && soyLlamante && (
        <div className="llamada-tarjeta">
          <div className="llamada-nombre">Llamando a {otro.nombre}…</div>
          <div className="llamada-tipo">{esVideo ? '🎥 Videollamada' : '📞 Llamada de voz'}</div>
          <button type="button" className="btn btn-danger btn-auto" style={{ marginTop: 14 }} onClick={onColgar}>Cancelar</button>
        </div>
      )}

      {sonando && !soyLlamante && (
        <div className="llamada-tarjeta">
          <div className="llamada-nombre">{otro.nombre} te está llamando</div>
          <div className="llamada-tipo">{esVideo ? '🎥 Videollamada' : '📞 Llamada de voz'}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" className="btn btn-danger btn-auto" onClick={onRechazar}>Rechazar</button>
            <button type="button" className="btn btn-ok btn-auto" onClick={onAceptar}>Aceptar</button>
          </div>
        </div>
      )}

      {llamada.estado === 'conectada' && (
        <div className="llamada-activa">
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
              {micActivo ? '🎤' : '🔇'}
            </button>
            {esVideo && (
              <button type="button" className={`llamada-btn${camActiva ? '' : ' off'}`} onClick={() => setCamActiva((v) => !v)} title={camActiva ? 'Apagar cámara' : 'Encender cámara'}>
                {camActiva ? '🎥' : '📷'}
              </button>
            )}
            <button type="button" className="llamada-btn colgar" onClick={onColgar} title="Colgar">📵</button>
          </div>
        </div>
      )}

      {error && <div className="registro-error" style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: '#fff', padding: 10 }}>{error}</div>}
    </div>
  )
}
