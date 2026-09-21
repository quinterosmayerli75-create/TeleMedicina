import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { DIAS, FRANJA_NUEVA, normalizarDisponibilidad, validarHorarios } from '../utils/horarios'

// Tarjeta del panel del doctor: elige qué días atiende y en qué horarios (una o varias franjas por día).
// Los pacientes ven estos horarios en su perfil público.
export default function HorariosAtencion({ uid, disponibilidadInicial }) {
  // Un día "activo" sin franjas no existe: al reabrir queda apagado (lo resuelve normalizarDisponibilidad).
  const [horarios, setHorarios] = useState(() => normalizarDisponibilidad(disponibilidadInicial))
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  function cambiar(nuevo) {
    setHorarios(nuevo)
    setMensaje(null)
  }

  function alternarDia(clave) {
    const dia = horarios[clave]
    if (dia.activo) {
      cambiar({ ...horarios, [clave]: { ...dia, activo: false } })
    } else {
      cambiar({ ...horarios, [clave]: { activo: true, franjas: dia.franjas.length ? dia.franjas : [{ ...FRANJA_NUEVA }] } })
    }
  }

  function cambiarFranja(clave, indice, campo, valor) {
    const franjas = horarios[clave].franjas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f))
    cambiar({ ...horarios, [clave]: { ...horarios[clave], franjas } })
  }

  function agregarFranja(clave) {
    const franjas = horarios[clave].franjas
    const ultima = franjas[franjas.length - 1]
    // La nueva franja arranca donde terminó la anterior (dos horas), para no tener que escribir todo.
    let nueva = { ...FRANJA_NUEVA }
    if (ultima?.hasta) {
      const [h, m] = ultima.hasta.split(':').map(Number)
      const inicio = Math.min(h + 1, 22)
      nueva = { desde: `${String(inicio).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`, hasta: `${String(Math.min(inicio + 3, 23)).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}` }
    }
    cambiar({ ...horarios, [clave]: { ...horarios[clave], franjas: [...franjas, nueva] } })
  }

  function quitarFranja(clave, indice) {
    const franjas = horarios[clave].franjas.filter((_, i) => i !== indice)
    cambiar({ ...horarios, [clave]: { activo: franjas.length > 0, franjas } })
  }

  async function guardar(e) {
    e.preventDefault()
    const error = validarHorarios(horarios)
    if (error) {
      setMensaje({ tipo: 'error', texto: error })
      return
    }
    setGuardando(true)
    setMensaje(null)
    try {
      // Los días apagados se guardan vacíos para que no queden horarios "fantasma" guardados.
      const limpio = Object.fromEntries(
        DIAS.map(({ clave }) => [clave, horarios[clave].activo ? horarios[clave] : { activo: false, franjas: [] }])
      )
      await updateDoc(doc(db, 'profesionales', uid), { disponibilidad: limpio })
      setHorarios(normalizarDisponibilidad(limpio))
      setMensaje({ tipo: 'ok', texto: 'Horarios guardados. Los pacientes ya los ven en tu perfil.' })
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudieron guardar los horarios. Intenta de nuevo.' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="card-plain" onSubmit={guardar}>
      <h2 className="section-title">Días y horarios de atención</h2>
      <p style={{ fontSize: 12, color: 'var(--gris)', marginTop: 0 }}>
        Elige los días que atiendes y a qué hora. Puedes agregar más de un horario por día (por ejemplo mañana y tarde).
      </p>
      {DIAS.map(({ clave, etiqueta }, i) => {
        const dia = horarios[clave]
        return (
          <div className="horario-dia" key={clave} style={i === DIAS.length - 1 ? { borderBottom: 'none' } : undefined}>
            <div className="horario-dia-cabecera">
              <div
                className={`switch${dia.activo ? ' on' : ''}`}
                role="switch"
                tabIndex={0}
                aria-checked={dia.activo}
                aria-label={`Atiendo el ${etiqueta.toLowerCase()}`}
                onClick={() => alternarDia(clave)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), alternarDia(clave))}
              ></div>
              <span className="horario-dia-nombre">{etiqueta}</span>
              {!dia.activo && <span className="horario-dia-libre">No atiendo</span>}
            </div>
            {dia.activo && (
              <div className="horario-franjas">
                {dia.franjas.map((f, indice) => (
                  <div className="horario-franja" key={indice}>
                    <label>
                      <span>Desde</span>
                      <input type="time" value={f.desde} onChange={(e) => cambiarFranja(clave, indice, 'desde', e.target.value)} required />
                    </label>
                    <label>
                      <span>Hasta</span>
                      <input type="time" value={f.hasta} onChange={(e) => cambiarFranja(clave, indice, 'hasta', e.target.value)} required />
                    </label>
                    <button
                      type="button"
                      className="horario-quitar"
                      aria-label={`Quitar el horario ${indice + 1} del ${etiqueta.toLowerCase()}`}
                      onClick={() => quitarFranja(clave, indice)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="horario-agregar" onClick={() => agregarFranja(clave)}>+ Agregar otro horario</button>
              </div>
            )}
          </div>
        )
      })}
      {mensaje && (
        <div role="status" style={{ fontSize: 12, marginTop: 8, color: mensaje.tipo === 'ok' ? 'var(--esmeralda)' : 'var(--alerta)' }}>{mensaje.texto}</div>
      )}
      <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 10 }} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar horarios'}
      </button>
    </form>
  )
}
