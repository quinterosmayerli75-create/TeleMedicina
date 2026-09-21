import { useState } from 'react'
import { MAX_DIAS_BLOQUEO, mensajeErrorBloqueo } from '../../firebase/bloqueos'

// Ventana para bloquear una cuenta, temporal o permanentemente. La usan Denuncias, Doctores y Usuarios.
// `onConfirmar({ tipo, dias, motivo })` hace el bloqueo; si lanza un error, se muestra aquí mismo y la
// ventana sigue abierta. Quien la usa la cierra cuando el bloqueo salió bien.
export default function ModalBloqueo({ nombre, tipoInicial = 'temporal', tipoFijo = false, motivoInicial = '', onCerrar, onConfirmar }) {
  const [tipo, setTipo] = useState(tipoInicial)
  const [dias, setDias] = useState(7)
  const [motivo, setMotivo] = useState(motivoInicial)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(false)

  const temporal = tipo === 'temporal'

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setProcesando(true)
    try {
      await onConfirmar({ tipo, dias, motivo })
    } catch (err) {
      setError(mensajeErrorBloqueo(err))
      setProcesando(false)
    }
  }

  return (
    <div className="modal-fondo" onClick={procesando ? undefined : onCerrar}>
      <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={enviar} noValidate data-testid="modal-bloqueo">
        <div className="modal-titulo" style={{ color: temporal ? 'var(--ambar)' : 'var(--alerta)' }}>
          {temporal ? 'Bloqueo temporal' : 'Bloqueo permanente'}
        </div>
        <div className="modal-sub">
          {nombre} —{' '}
          {temporal
            ? 'no podrá usar la plataforma hasta que se cumpla el plazo; después la cuenta se reactiva sola.'
            : 'no podrá usar la plataforma hasta que un administrador levante el bloqueo o acepte una apelación.'}
        </div>

        {!tipoFijo && (
          <div className="chip-row" style={{ marginBottom: 12 }} role="group" aria-label="Tipo de bloqueo">
            <button type="button" className={`chip${temporal ? ' on' : ''}`} onClick={() => setTipo('temporal')}>Temporal</button>
            <button type="button" className={`chip${!temporal ? ' on' : ''}`} onClick={() => setTipo('permanente')}>Permanente</button>
          </div>
        )}

        {temporal && (
          <>
            <label className="campo-label" htmlFor="bloqueo-dias">Duración del bloqueo (días)</label>
            <input id="bloqueo-dias" type="number" min="1" max={MAX_DIAS_BLOQUEO} step="1" value={dias} onChange={(e) => setDias(e.target.value)} />
          </>
        )}

        <label className="campo-label" htmlFor="bloqueo-motivo">Motivo (obligatorio, la persona lo verá)</label>
        <textarea id="bloqueo-motivo" rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Trato irrespetuoso a un paciente." />

        {error && <div className="registro-error" role="alert" data-testid="bloqueo-error">{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-outline" onClick={onCerrar} disabled={procesando}>Cancelar</button>
          <button type="submit" className={`btn ${temporal ? 'btn-warn' : 'btn-danger'}`} disabled={procesando}>
            {procesando ? 'Aplicando…' : temporal ? 'Aplicar bloqueo temporal' : 'Bloquear permanentemente'}
          </button>
        </div>
      </form>
    </div>
  )
}
