import Icono from '@/shared/components/Icono'
import { useState } from 'react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { denunciarComentario, guardarCalificacion } from '../services/calificaciones'
import { crearNotificacion } from '@/features/notificaciones/services/notificaciones'
import { formatearFecha } from '@/shared/utils/fechas'
import { contieneVulgaridad } from '@/shared/utils/filtroPalabras'
import SelectorEstrellas from './SelectorEstrellas'

const MOTIVOS_DENUNCIA_COMENTARIO = ['Lenguaje ofensivo', 'Información falsa', 'Spam o publicidad', 'Otro']

const RESENAS_VISIBLES = 5

function mensajeError(err) {
  if (err?.code === 'permission-denied') {
    return 'Firestore rechazó la calificación: hay que publicar las reglas de firestore.rules (ver README).'
  }
  return 'No se pudo guardar tu calificación. Intenta de nuevo.'
}

function EstrellasFijas({ valor }) {
  return (
    <span className="stars" aria-label={`${valor} de 5 estrellas`}>
      {[0, 1, 2, 3, 4].map(index => <Icono key={index} nombre="star" size={14} fill={index < valor ? 'currentColor' : 'none'} style={{ color: index < valor ? 'var(--admin-accent)' : '#c7d0be', marginRight: 2 }} />)}
    </span>
  )
}

// Bloque "Deje su calificación" (el paciente elige de 1 a 5 estrellas y puede dejar un comentario) más la
// lista de calificaciones que ya dejaron otros pacientes. Recibe la lista ya cargada (useCalificaciones).
// Solo los pacientes califican: en el panel del doctor (`puedeCalificar` = false) se ve la lista, sin el formulario.
// Además, solo puede calificar quien ya tuvo una consulta finalizada con ese doctor (`consultaId`, o null si no tuvo ninguna).
export default function ResenasDoctor({ doctorId, calificaciones, cargando, error, puedeCalificar = true, consultaId = null }) {
  const { usuario, rol } = useAuth()
  const miCalificacion = calificaciones.find((c) => c.pacienteId === usuario?.uid)

  // Mientras el paciente no toque nada se muestra lo que ya había calificado (si lo hizo).
  const [estrellasElegidas, setEstrellasElegidas] = useState(null)
  const [comentarioEscrito, setComentarioEscrito] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [verTodas, setVerTodas] = useState(false)

  // Un doctor no puede borrar comentarios, solo denunciarlos — el admin decide qué hacer desde
  // "Comentarios denunciados". No se limita a "solo en mi propio perfil": cualquier profesional
  // que vea un comentario indebido en cualquier perfil puede marcarlo.
  const puedeDenunciar = rol === 'profesional'
  const [denunciando, setDenunciando] = useState(null)
  const [motivoDenuncia, setMotivoDenuncia] = useState(MOTIVOS_DENUNCIA_COMENTARIO[0])
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false)
  const [denunciasEnviadas, setDenunciasEnviadas] = useState(new Set())

  async function confirmarDenuncia() {
    setEnviandoDenuncia(true)
    try {
      await denunciarComentario({
        doctorId: usuario.uid,
        pacienteId: denunciando.pacienteId,
        calificacionId: denunciando.id,
        comentario: denunciando.comentario,
        motivo: motivoDenuncia,
      })
      setDenunciasEnviadas((prev) => new Set(prev).add(denunciando.id))
      setDenunciando(null)
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo enviar la denuncia. Intenta de nuevo.' })
    } finally {
      setEnviandoDenuncia(false)
    }
  }

  const estrellas = estrellasElegidas ?? miCalificacion?.estrellas ?? 0
  const comentario = comentarioEscrito ?? miCalificacion?.comentario ?? ''
  // Un comentario oculto por el admin (tras una denuncia) ya no se muestra en la lista pública,
  // pero no se borra de la base de datos — sigue existiendo el documento.
  const calificacionesVisibles = calificaciones.filter((c) => !c.oculto)
  const visibles = verTodas ? calificacionesVisibles : calificacionesVisibles.slice(0, RESENAS_VISIBLES)

  async function publicar(e) {
    e.preventDefault()
    if (estrellas < 1) {
      setMensaje({ tipo: 'error', texto: 'Elige de 1 a 5 estrellas antes de publicar.' })
      return
    }
    if (contieneVulgaridad(comentario)) {
      setMensaje({ tipo: 'error', texto: 'Tu comentario tiene palabras no permitidas. Vuelve a escribirlo sin groserías para poder publicarlo.' })
      return
    }
    setEnviando(true)
    setMensaje(null)
    try {
      const { promedioActualizado } = await guardarCalificacion({ doctorId, pacienteId: usuario.uid, estrellas, comentario, consultaId })
      if (!miCalificacion) {
        crearNotificacion({
          paraUid: doctorId,
          tipo: 'calificacion',
          texto: `Recibiste una nueva calificación: ${estrellas} ★`,
          enlace: `/doctor/especialista/${doctorId}`,
        }).catch(() => {})
      }
      setEstrellasElegidas(null)
      setComentarioEscrito(null)
      setMensaje(
        promedioActualizado
          ? { tipo: 'ok', texto: miCalificacion ? '¡Tu calificación se actualizó!' : '¡Gracias! Tu calificación se publicó.' }
          : { tipo: 'error', texto: 'Tu calificación se guardó, pero no se pudo actualizar el promedio del doctor (ver reglas en el README).' }
      )
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeError(err) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {puedeCalificar && !consultaId && (
        <div className="card-plain">
          <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>
            Podrás calificar a este profesional después de tener una consulta finalizada con él.
          </p>
        </div>
      )}

      {puedeCalificar && consultaId && (
      <form className="card-plain" onSubmit={publicar}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
          {miCalificacion ? 'Tu calificación (puedes cambiarla)' : 'Deje su calificación'}
        </div>
        <SelectorEstrellas valor={estrellas} onChange={setEstrellasElegidas} deshabilitado={enviando} />
        <textarea
          rows="2"
          maxLength={500}
          placeholder="Cuéntenos cómo fue su consulta… (opcional)"
          value={comentario}
          onChange={(e) => setComentarioEscrito(e.target.value)}
          disabled={enviando}
        />
        <button type="submit" className="btn btn-gold btn-auto" style={{ marginTop: 8 }} disabled={enviando || estrellas < 1}>
          {enviando ? 'Guardando…' : miCalificacion ? 'Actualizar mi calificación' : 'Publicar calificación'}
        </button>
        {mensaje && (
          <div role="status" style={{ fontSize: 12, marginTop: 8, color: mensaje.tipo === 'ok' ? 'var(--esmeralda)' : 'var(--alerta)' }}>
            {mensaje.texto}
          </div>
        )}
      </form>
      )}

      <div className="card-plain">
        <h2 className="section-title" style={{ marginTop: 0 }}>Calificaciones de pacientes</h2>
        {cargando && <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>Cargando…</p>}
        {!cargando && error && (
          <p style={{ fontSize: 12.5, color: 'var(--alerta)', margin: 0 }}>No se pudieron cargar las calificaciones.</p>
        )}
        {!cargando && !error && calificacionesVisibles.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>{puedeCalificar && consultaId ? 'Todavía nadie calificó a este profesional. ¡Sea el primero!' : 'Todavía nadie calificó a este profesional.'}</p>
        )}
        {visibles.map((c) => (
          <div className="resena" key={c.id}>
            <div className="resena-cabecera">
              <b>{c.nombre}</b>
              <EstrellasFijas valor={Math.min(5, Math.max(1, Math.round(Number(c.estrellas) || 1)))} />
              <span className="resena-fecha">{c.fecha ? formatearFecha(c.fecha) : 'Ahora'}</span>
              {puedeDenunciar && c.comentario && (
                denunciasEnviadas.has(c.id) ? (
                  <span style={{ fontSize: 11, color: 'var(--gris)', marginLeft: 'auto' }}>Denuncia enviada</span>
                ) : (
                  <span
                    style={{ fontSize: 11, color: 'var(--alerta)', marginLeft: 'auto', cursor: 'pointer' }}
                    onClick={() => { setDenunciando(c); setMotivoDenuncia(MOTIVOS_DENUNCIA_COMENTARIO[0]) }}
                  >
                    <Icono nombre="flag" size={19} /> Denunciar
                  </span>
                )
              )}
            </div>
            {c.comentario && <p className="resena-texto">{c.comentario}</p>}
          </div>
        ))}
        {calificacionesVisibles.length > RESENAS_VISIBLES && (
          <button type="button" className="btn btn-outline btn-auto" style={{ marginTop: 10 }} onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? 'Ver menos' : `Ver las ${calificacionesVisibles.length} calificaciones`}
          </button>
        )}
      </div>

      {denunciando && (
        <div className="modal-fondo" onClick={() => setDenunciando(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>Denunciar comentario</div>
            <div className="modal-sub">El admin revisará este comentario y decidirá qué hacer. No puedes borrarlo tú mismo.</div>
            <p className="resena-texto" style={{ fontStyle: 'italic' }}>"{denunciando.comentario}"</p>
            <label className="campo-label">Motivo</label>
            <select value={motivoDenuncia} onChange={(e) => setMotivoDenuncia(e.target.value)}>
              {MOTIVOS_DENUNCIA_COMENTARIO.map((m) => <option key={m}>{m}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setDenunciando(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" disabled={enviandoDenuncia} onClick={confirmarDenuncia}>
                {enviandoDenuncia ? 'Enviando…' : 'Denunciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
