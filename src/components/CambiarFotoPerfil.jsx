import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { LIMITE_FOTO_MB, mensajeErrorSubida, nombreSeguro, subirArchivo, validarArchivo } from '../utils/archivos'

function iniciales(nombre = '') {
  const partes = nombre.replace(/^(dr\.?|dra\.?)\s+/i, '').split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Foto de perfil de la cuenta que inició sesión, con botón para cambiarla por otra
// (funciona igual para paciente y doctor: la foto vive en `usuarios/{uid}.fotoUrl`).
export default function CambiarFotoPerfil({ compacto = false }) {
  const { usuario } = useAuth()
  const inputRef = useRef(null)
  const [nombre, setNombre] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [cargando, setCargando] = useState(true)
  const [progreso, setProgreso] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'usuarios', usuario.uid))
      .then((snap) => {
        if (!snap.exists()) return
        setNombre(snap.data().nombre ?? '')
        setFotoUrl(snap.data().fotoUrl ?? '')
      })
      .finally(() => setCargando(false))
  }, [usuario])

  async function alElegir(e) {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    const problema = validarArchivo(archivo, { solo: 'imagen', maxMB: LIMITE_FOTO_MB })
    if (problema) {
      setMensaje({ tipo: 'error', texto: problema })
      return
    }

    setMensaje(null)
    setProgreso(0)
    try {
      const { url } = await subirArchivo(`usuarios/${usuario.uid}/perfil-${Date.now()}-${nombreSeguro(archivo.name)}`, archivo, setProgreso)
      await updateDoc(doc(db, 'usuarios', usuario.uid), { fotoUrl: url })
      setFotoUrl(url)
      setMensaje({ tipo: 'ok', texto: 'Foto de perfil actualizada.' })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err?.code?.startsWith('storage/') ? mensajeErrorSubida(err) : 'No se pudo guardar la foto. Intenta de nuevo.' })
    } finally {
      setProgreso(null)
    }
  }

  const tamano = compacto ? 80 : 96
  const subiendo = progreso !== null

  return (
    <div className={compacto ? 'foto-perfil compacto' : 'foto-perfil'}>
      {fotoUrl ? (
        <img src={fotoUrl} alt="Mi foto de perfil" style={{ width: tamano, height: tamano }} />
      ) : (
        <div className="foto-perfil-vacia" style={{ width: tamano, height: tamano }} aria-hidden="true">
          {cargando ? '' : iniciales(nombre)}
        </div>
      )}
      <div>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={alElegir} aria-label="Elegir foto de perfil" />
        <button type="button" className="btn btn-outline btn-auto" onClick={() => inputRef.current?.click()} disabled={subiendo || cargando}>
          {subiendo ? `Subiendo… ${Math.round(progreso * 100)}%` : fotoUrl ? '📷 Cambiar foto' : '📷 Subir foto'}
        </button>
        {!compacto && <div className="selector-ayuda">JPG o PNG, máximo {LIMITE_FOTO_MB} MB.</div>}
        {mensaje && (
          <div style={{ fontSize: 12, marginTop: 8, color: mensaje.tipo === 'ok' ? 'var(--esmeralda)' : 'var(--alerta)' }}>{mensaje.texto}</div>
        )}
      </div>
    </div>
  )
}
