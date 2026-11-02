import { useId, useState } from 'react'
import { Search } from '@/shared/components/Icons'
import './Mensajes.css'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useContactos, useConversaciones } from '../hooks/useChat'
import { aFecha } from '@/shared/utils/fechas'
import MascotaVacio from '@/shared/components/MascotaVacio'
import ChatVentana from './ChatVentana'
import { organizarConversaciones } from '../utils/conversaciones'

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
export default function PaginaMensajes({ rol, encabezadoLista = null }) {
  const { id } = useParams()
  const [busqueda, setBusqueda] = useState('')
  const [searchParams] = useSearchParams()
  const listaId = useId()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const esPaciente = rol === 'paciente'
  const base = esPaciente ? '/paciente' : '/doctor'
  const { conversaciones, cargando, error } = useConversaciones(usuario.uid)

  // "La otra persona" de cada conversación: se toma de participantes (siempre los dos uid
  // reales), no de los campos pacienteId/doctorId — esos solo dicen quién ocupa cada rol en
  // ESA conversación puntual, y un doctor puede aparecer como pacienteId de otro doctor (ver
  // "Mis citas"), así que asumir "yo siempre soy doctorId" lo hacía verse a sí mismo como contacto.
  const idOtro = (c) => (c.participantes ?? [c.pacienteId, c.doctorId]).find((p) => p !== usuario.uid) ?? (esPaciente ? c.doctorId : c.pacienteId)
  const otrosIds = conversaciones.map(idOtro)
  const contactos = useContactos([...otrosIds, id])
  // (Las notificaciones de "nuevo mensaje" se marcan como leídas desde ChatVentana.jsx, no aquí —
  // así también se revisa si llega un mensaje nuevo mientras el chat ya está abierto, no solo al
  // entrar.)

  // Un paciente que entra desde el perfil de un doctor con el que aún no habló ve la conversación vacía.
  const filas = id && !otrosIds.includes(id) ? [{ id: `nueva-${id}`, nueva: true, otroId: id }] : []
  conversaciones.forEach((c) => filas.push({ ...c, otroId: idOtro(c) }))
  const { grupoActivo, filasGrupo, contadores, idActivo } = organizarConversaciones({
    filas, contactos, id, grupo: searchParams.get('grupo'), esPaciente,
  })
  const activo = idActivo ? contactos[idActivo] : null
  const otroEsProfesional = activo?.rol === 'profesional'
  const cargandoContactos = [...otrosIds, id].filter(Boolean).some(uid => !Object.hasOwn(contactos, uid))
  const cargandoLista = cargando || cargandoContactos
  const filtro = busqueda.trim().toLocaleLowerCase()
  const filasVisibles = filasGrupo.filter(fila => !filtro || (contactos[fila.otroId]?.nombre ?? '').toLocaleLowerCase().includes(filtro))
  const sufijoGrupo = esPaciente ? '' : `?grupo=${grupoActivo}`

  function cambiarGrupo(grupo) {
    if (grupo === grupoActivo) return
    setBusqueda('')
    navigate(`${base}/mensajes?grupo=${grupo}`)
  }

  function navegarPestanas(event, grupo) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const siguiente = event.key === 'Home' ? 'pacientes' : event.key === 'End' ? 'doctores' : grupo === 'pacientes' ? 'doctores' : 'pacientes'
    cambiarGrupo(siguiente)
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[siguiente === 'pacientes' ? 0 : 1].focus()
  }


  return (
    <div className="web-two-pane chat-shell" data-mobile-view={id ? 'chat' : 'list'}>
      <div className="web-pane-list">
        <div className="chat-list-heading">
          <div className="chat-list-title"><h1>Mensajes</h1><span className="admin-subtab-count">{conversaciones.length}</span></div>
          <p>{esPaciente ? 'Un espacio para conversar y cuidarte.' : 'Tus pacientes y colegas, cada uno en su espacio.'}</p>
          {!esPaciente && <div className="chat-role-tabs" role="tablist" aria-label="Tipo de contacto">
            {['pacientes', 'doctores'].map(grupo => <button type="button" role="tab" key={grupo}
              id={`${listaId}-${grupo}`} aria-controls={listaId} aria-selected={grupoActivo === grupo}
              tabIndex={grupoActivo === grupo ? 0 : -1}
              onClick={() => cambiarGrupo(grupo)} onKeyDown={event => navegarPestanas(event, grupo)}>
              <span>{grupo === 'pacientes' ? 'Pacientes' : 'Doctores'}</span><span className="chat-role-count">{contadores[grupo]}</span>
            </button>)}
          </div>}
          <label className="chat-contact-search"><Search size={16} aria-hidden="true" /><input type="search" placeholder="Buscar conversación…" aria-label="Buscar conversación por nombre" value={busqueda} onChange={event => setBusqueda(event.target.value)} /></label>
        </div>
        {encabezadoLista}
        <div className="chat-contact-list" id={listaId} role={esPaciente ? undefined : 'tabpanel'}
          aria-labelledby={esPaciente ? undefined : `${listaId}-${grupoActivo}`} aria-label={esPaciente ? 'Conversaciones' : undefined} aria-busy={cargandoLista} tabIndex={esPaciente ? undefined : 0}>
        {error && (
          <div className="registro-error" style={{ padding: 16 }}>
            {error === 'permission-denied' ? 'No pudimos acceder a tus conversaciones. Vuelve a abrir esta página en unos momentos.' : 'No se pudieron cargar las conversaciones.'}
          </div>
        )}
        {!cargandoLista && !error && filasGrupo.length === 0 && (
          <MascotaVacio
            tamano={72}
            texto={
              esPaciente
                ? 'Aún no tiene conversaciones. Busque un especialista y toque “Mensaje” en su perfil.'
                : grupoActivo === 'doctores'
                  ? 'Aún no tienes conversaciones con doctores. Busca un especialista y abre su perfil para escribirle.'
                  : 'Aún no tienes conversaciones con pacientes. Aquí aparecerán cuando te escriban.'
            }
          />
        )}
        {cargandoLista && <div className="chat-loading" role="status"><span className="chat-sr-only">Cargando conversaciones…</span>{[0, 1, 2].map(i => <div className="chat-skeleton" key={i}><span /><div><span /><span /></div></div>)}</div>}
        {!cargandoLista && !error && filtro && filasGrupo.length > 0 && filasVisibles.length === 0 && <p className="chat-list-empty">{esPaciente ? 'No encontramos ese nombre. Prueba con otro.' : 'No encontramos ese nombre en esta pestaña. Prueba con otro.'}</p>}
        {filasVisibles.map((fila) => {
          const contacto = contactos[fila.otroId]
          return (
            <button
              type="button"
              key={fila.id}
              className={`chat-row${fila.otroId === idActivo ? ' is-active' : ''}`}
              aria-current={fila.otroId === idActivo ? 'true' : undefined}
              onClick={() => navigate(`${base}/mensajes/${fila.otroId}${sufijoGrupo}`)}
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
            </button>
          )
        })}
        </div>
      </div>

      {activo?.existe ? (
        <ChatVentana
          key={idActivo}
          onVolver={() => navigate(`${base}/mensajes${sufijoGrupo}`)}
          miUid={usuario.uid}
          miRol={rol}
          otro={activo}
          rutaPerfil={
            esPaciente || otroEsProfesional ? `${base}/${esPaciente ? 'doctor' : 'especialista'}/${idActivo}` : `/doctor/paciente/${idActivo}`
          }
          rutaDenuncia={`${base}/denuncia/${idActivo}`}
          subtitulo={
            esPaciente
              ? `${activo.enLinea ? 'En línea' : 'Desconectado'} · toque para ver su perfil`
              : otroEsProfesional
                ? `Doctor · ${activo.enLinea ? 'en línea' : 'desconectado'} · toque para ver su perfil`
                : 'Paciente · toque para ver su perfil'
          }
        />
      ) : (
        <div className="web-pane-chat chat-no-selection">
          <p className="web-sub" style={{ margin: 0 }}>
            {idActivo && activo && !activo.existe ? 'No se encontró a esa persona.' : 'Elija una conversación para empezar.'}
          </p>
        </div>
      )}
    </div>
  )
}
