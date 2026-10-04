import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotificaciones } from '../hooks/useNotificaciones'
import { marcarNotificacionLeida } from '../firebase/notificaciones'
import { aFecha } from '../utils/fechas'

function hace(fecha) {
  const f = aFecha(fecha)
  if (!f) return ''
  const minutos = Math.round((Date.now() - f.getTime()) / 60000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.round(horas / 24)} d`
}

// Campanita de notificaciones (paciente, doctor y admin): lista las notificaciones de la persona y,
// al tocar una, la marca como leída y navega al lugar relacionado (una consulta, un pago, etc.).
export default function NotificacionesBell() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { notificaciones, noLeidas } = useNotificaciones(usuario?.uid)
  const [abierto, setAbierto] = useState(false)

  function abrir(n) {
    setAbierto(false)
    if (!n.leida) marcarNotificacionLeida(n.id).catch(() => {})
    if (n.enlace) navigate(n.enlace)
  }

  return (
    <div className="notif-wrap">
      <button type="button" className="notif-campana" onClick={() => setAbierto((v) => !v)} aria-label="Notificaciones">
        🔔
        {noLeidas > 0 && <span className="notif-badge">{noLeidas > 9 ? '9+' : noLeidas}</span>}
      </button>

      {abierto && (
        <>
          <div className="notif-fondo" onClick={() => setAbierto(false)} />
          <div className="notif-panel">
            <div className="notif-panel-titulo">Notificaciones</div>
            {notificaciones.length === 0 && <p className="notif-vacio">No tienes notificaciones.</p>}
            {notificaciones.slice(0, 20).map((n) => (
              <div key={n.id} className={`notif-item${n.leida ? '' : ' no-leida'}`} onClick={() => abrir(n)}>
                <div className="notif-texto">{n.texto}</div>
                <div className="notif-hace">{hace(n.fecha)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
