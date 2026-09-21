import { useEffect, useRef, useState } from 'react'
import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../context/AuthContext'
import { LIMITE_FOTO_MB, mensajeErrorSubida, nombreSeguro, subirArchivo, validarArchivo } from '../utils/archivos'
import { obtenerTitulos } from '../utils/documentosDoctor'

// Títulos del doctor que inició sesión: ve los que ya subió y puede agregar más. Todos se muestran
// a los pacientes en su perfil público.
export default function GestionTitulos() {
  const { usuario } = useAuth()
  const inputRef = useRef(null)
  const [titulos, setTitulos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'profesionales', usuario.uid))
      .then((snap) => snap.exists() && setTitulos(obtenerTitulos(snap.data())))
      .finally(() => setCargando(false))
  }, [usuario])

  async function alElegir(e) {
    const elegidos = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (elegidos.length === 0) return

    const errores = []
    const validos = elegidos.filter((archivo) => {
      const problema = validarArchivo(archivo, { solo: 'imagen', maxMB: LIMITE_FOTO_MB })
      if (problema) errores.push(problema)
      return !problema
    })
    if (validos.length === 0) {
      setMensaje({ tipo: 'error', texto: errores.join(' ') })
      return
    }

    setMensaje(null)
    setSubiendo(true)
    try {
      const marca = Date.now()
      const subidas = await Promise.all(
        validos.map((archivo, i) => subirArchivo(`profesionales/${usuario.uid}/titulo-${marca}-${i}-${nombreSeguro(archivo.name)}`, archivo))
      )
      const urls = subidas.map((s) => s.url)
      await updateDoc(doc(db, 'profesionales', usuario.uid), { titulos: arrayUnion(...urls) })
      setTitulos((prev) => [...prev, ...urls])
      setMensaje({
        tipo: errores.length ? 'error' : 'ok',
        texto: errores.length ? `Se agregaron ${urls.length}, pero: ${errores.join(' ')}` : (urls.length > 1 ? `Se agregaron ${urls.length} fotos.` : 'Se agregó 1 foto.'),
      })
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err?.code?.startsWith('storage/') ? mensajeErrorSubida(err) : 'No se pudieron guardar los títulos. Intenta de nuevo.' })
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="card-plain">
      <h2 className="section-title">Mis títulos y certificados</h2>
      <p style={{ fontSize: 12, color: 'var(--gris)', marginTop: 0 }}>
        Los pacientes ven estas fotos en su perfil: mientras más títulos muestre, más confianza genera.
      </p>
      {!cargando && titulos.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--gris)' }}>Aún no subió ningún título.</p>}
      {titulos.length > 0 && (
        <div className="doc-thumbs" style={{ marginBottom: 12 }}>
          {titulos.map((url, i) => (
            <a className="doc-thumb" href={url} target="_blank" rel="noreferrer" key={url}>
              <img src={url} alt={`Título ${i + 1}`} />Título {i + 1}
            </a>
          ))}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={alElegir} aria-label="Elegir fotos de títulos" />
      <button type="button" className="btn btn-outline btn-auto" onClick={() => inputRef.current?.click()} disabled={subiendo || cargando}>
        {subiendo ? 'Subiendo…' : '📷 Agregar título'}
      </button>
      {mensaje && <div style={{ fontSize: 12, marginTop: 8, color: mensaje.tipo === 'ok' ? 'var(--esmeralda)' : 'var(--alerta)' }}>{mensaje.texto}</div>}
    </div>
  )
}
