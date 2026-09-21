import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useContactos, useConversaciones } from '../../hooks/useChat'
import { aFecha } from '../../utils/fechas'
import ChatVentana from './ChatVentana'

function Avatar({ contacto }) {
  return contacto?.fotoUrl ? (
    <img src={contacto.fotoUrl} alt={contacto.nombre} />
  ) : (
    <div className="avatar-vacio" aria-hidden="true">{(contacto?.nombre ?? '?')[0]}</div>
  )
}

function horaCorta(valor) {
  const fecha = aFecha(valor)
  if (!fecha) return ''
  const hoy = new Date()
  return fecha.toDateString() === hoy.toDateString()
    ? fecha.toLocaleTimeString('es-BO', { hour: 'numeric', minute: '2-digit' })
    : fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' })
}

// Pantalla de mensajes compartida por paciente y doctor: lista de conversaciones a la izquierda y
// la conversación abierta a la derecha. `rol` es el de quien mira: 'paciente' | 'profesional'.
export default function PaginaMensajes({ rol }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const esPaciente = rol === 'paciente'
  const base = esPaciente ? '/paciente' : '/doctor'
  const { conversaciones, cargando, error } = useConversaciones(usuario.uid)

  const idOtro = (c) => (esPaciente ? c.doctorId : c.pacienteId)
  const otrosIds = conversaciones.map(idOtro)
  const idActivo = id ?? otrosIds[0] ?? null
  const contactos = useContactos([...otrosIds, idActivo], esPaciente ? 'profesional' : 'paciente')
  const activo = idActivo ? contactos[idActivo] : null

  // Un paciente que entra desde el perfil de un doctor con el que aún no habló ve la conversación vacía.
  const filas = idActivo && !otrosIds.includes(idActivo) ? [{ id: `nueva-${idActivo}`, nueva: true, otroId: idActivo }] : []
  conversaciones.forEach((c) => filas.push({ ...c, otroId: idOtro(c) }))

  return (
    <div className="web-two-pane chat-shell" style={{ margin: '-30px -36px' }}>
      <div className="web-pane-list">
        {error && (
          <div className="registro-error" style={{ padding: 16 }}>
            {error === 'permission-denied' ? 'Firestore no permite leer las conversaciones: hay que publicar las reglas de firestore.rules (ver README).' : 'No se pudieron cargar las conversaciones.'}
          </div>
        )}
        {!cargando && !error && filas.length === 0 && (
          <p className="web-sub" style={{ padding: 20 }}>
            {esPaciente
              ? 'Aún no tiene conversaciones. Busque un especialista y toque “Mensaje” en su perfil.'
              : 'Aún no tiene conversaciones. Aquí aparecerán los pacientes que le escriban.'}
          </p>
        )}
        {filas.map((fila) => {
          const contacto = contactos[fila.otroId]
          return (
            <div
              key={fila.id}
              className="chat-row"
              style={fila.otroId === idActivo ? { background: 'var(--marfil)' } : undefined}
              onClick={() => navigate(`${base}/mensajes/${fila.otroId}`)}
            >
              <div className="avatar-wrap">
                <Avatar contacto={contacto} />
                {contacto?.enLinea !== null && contacto?.enLinea !== undefined && <div className={`status-dot ${contacto.enLinea ? 'on' : 'off'}`}></div>}
              </div>
              <div className="chat-row-body">
                <div className="chat-row-top">
                  <div className="chat-row-name">{contacto?.nombre ?? '…'}</div>
                  <div className="chat-row-time">{horaCorta(fila.ultimaFecha)}</div>
                </div>
                <div className="chat-row-msg">{fila.nueva ? 'Nueva conversación' : fila.ultimoMensaje}</div>
              </div>
            </div>
          )
        })}
      </div>

      {activo?.existe ? (
        <ChatVentana
          key={idActivo}
          miUid={usuario.uid}
          miRol={rol}
          otro={activo}
          rutaPerfil={esPaciente ? `/paciente/doctor/${idActivo}` : `/doctor/paciente/${idActivo}`}
          rutaDenuncia={`${base}/denuncia/${idActivo}`}
          subtitulo={
            esPaciente
              ? `${activo.enLinea ? 'En línea' : 'Desconectado'} · toque para ver su perfil`
              : 'Paciente · toque para ver su perfil'
          }
        />
      ) : (
        <div className="web-pane-chat" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <p className="web-sub" style={{ margin: 0 }}>
            {idActivo && activo && !activo.existe ? 'No se encontró a esa persona.' : 'Elija una conversación para empezar.'}
          </p>
        </div>
      )}
    </div>
  )
}
