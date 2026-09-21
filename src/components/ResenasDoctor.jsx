import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { guardarCalificacion } from '../firebase/calificaciones'
import { formatearFecha } from '../utils/fechas'
import SelectorEstrellas from './SelectorEstrellas'

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
      {'★'.repeat(valor)}
      <span style={{ color: 'var(--marfil-osc)' }}>{'★'.repeat(5 - valor)}</span>
    </span>
  )
}

// Bloque "Deje su calificación" (el paciente elige de 1 a 5 estrellas y puede dejar un comentario) más la
// lista de calificaciones que ya dejaron otros pacientes. Recibe la lista ya cargada (useCalificaciones).
// Solo los pacientes califican: en el panel del doctor (`puedeCalificar` = false) se ve la lista, sin el formulario.
export default function ResenasDoctor({ doctorId, calificaciones, cargando, error, puedeCalificar = true }) {
  const { usuario } = useAuth()
  const miCalificacion = calificaciones.find((c) => c.pacienteId === usuario?.uid)

  // Mientras el paciente no toque nada se muestra lo que ya había calificado (si lo hizo).
  const [estrellasElegidas, setEstrellasElegidas] = useState(null)
  const [comentarioEscrito, setComentarioEscrito] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [verTodas, setVerTodas] = useState(false)

  const estrellas = estrellasElegidas ?? miCalificacion?.estrellas ?? 0
  const comentario = comentarioEscrito ?? miCalificacion?.comentario ?? ''
  const visibles = verTodas ? calificaciones : calificaciones.slice(0, RESENAS_VISIBLES)

  async function publicar(e) {
    e.preventDefault()
    if (estrellas < 1) {
      setMensaje({ tipo: 'error', texto: 'Elige de 1 a 5 estrellas antes de publicar.' })
      return
    }
    setEnviando(true)
    setMensaje(null)
    try {
      const { promedioActualizado } = await guardarCalificacion({ doctorId, pacienteId: usuario.uid, estrellas, comentario })
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
      {puedeCalificar && (
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
        {!cargando && !error && calificaciones.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--gris)', margin: 0 }}>{puedeCalificar ? 'Todavía nadie calificó a este profesional. ¡Sea el primero!' : 'Todavía nadie calificó a este profesional.'}</p>
        )}
        {visibles.map((c) => (
          <div className="resena" key={c.id}>
            <div className="resena-cabecera">
              <b>{c.nombre}</b>
              <EstrellasFijas valor={Math.min(5, Math.max(1, Math.round(Number(c.estrellas) || 1)))} />
              <span className="resena-fecha">{c.fecha ? formatearFecha(c.fecha) : 'Ahora'}</span>
            </div>
            {c.comentario && <p className="resena-texto">{c.comentario}</p>}
          </div>
        ))}
        {calificaciones.length > RESENAS_VISIBLES && (
          <button type="button" className="btn btn-outline btn-auto" style={{ marginTop: 10 }} onClick={() => setVerTodas((v) => !v)}>
            {verTodas ? 'Ver menos' : `Ver las ${calificaciones.length} calificaciones`}
          </button>
        )}
      </div>
    </>
  )
}
