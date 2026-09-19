import { useEffect, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { crearUsuarioAuxiliar } from '../../firebase/crearUsuarioSecundario'
import { useAuth } from '../../context/AuthContext'
import { validarContrasena } from '../../utils/validacion'

const MODALIDADES = [
  { clave: 'chat', etiqueta: 'Chat de texto' },
  { clave: 'llamada', etiqueta: 'Llamada de voz' },
  { clave: 'video', etiqueta: 'Videollamada' },
]

const PACIENTE_INICIAL = {
  nombre: '', apellido: '', email: '', contrasena: '', telefono: '',
  edad: '', sexo: 'Femenino', estatura: '', peso: '', lugar: '',
}

export default function Panel() {
  const { usuario } = useAuth()
  const [datosUsuario, setDatosUsuario] = useState(null)
  const [datosProfesional, setDatosProfesional] = useState(null)
  const [costoConsulta, setCostoConsulta] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [mostrarPaciente, setMostrarPaciente] = useState(false)
  const [nuevoPaciente, setNuevoPaciente] = useState(PACIENTE_INICIAL)
  const [errorPaciente, setErrorPaciente] = useState('')
  const [enviandoPaciente, setEnviandoPaciente] = useState(false)

  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'usuarios', usuario.uid)).then((snap) => snap.exists() && setDatosUsuario(snap.data()))
    getDoc(doc(db, 'profesionales', usuario.uid)).then((snap) => {
      if (snap.exists()) {
        const datos = snap.data()
        setDatosProfesional(datos)
        setCostoConsulta(datos.costoConsulta ?? '')
        setDescripcion(datos.descripcion ?? '')
      }
    })
  }, [usuario])

  async function alternarDisponible() {
    const nuevoValor = !datosProfesional.disponibleAhora
    setDatosProfesional((prev) => ({ ...prev, disponibleAhora: nuevoValor }))
    await updateDoc(doc(db, 'profesionales', usuario.uid), { disponibleAhora: nuevoValor })
  }

  async function alternarModalidad(indice) {
    const nuevasModalidades = [...datosProfesional.modalidades]
    nuevasModalidades[indice] = !nuevasModalidades[indice]
    setDatosProfesional((prev) => ({ ...prev, modalidades: nuevasModalidades }))
    await updateDoc(doc(db, 'profesionales', usuario.uid), { modalidades: nuevasModalidades })
  }

  async function guardarPrecioYDescripcion(e) {
    e.preventDefault()
    setMensaje('')
    await updateDoc(doc(db, 'profesionales', usuario.uid), {
      costoConsulta: Number(costoConsulta),
      descripcion,
    })
    setMensaje('Guardado.')
  }

  function abrirNuevoPaciente() {
    setNuevoPaciente(PACIENTE_INICIAL)
    setErrorPaciente('')
    setMostrarPaciente(true)
  }

  async function crearPaciente(e) {
    e.preventDefault()
    setErrorPaciente('')
    const errorContrasena = validarContrasena(nuevoPaciente.contrasena)
    if (errorContrasena) {
      setErrorPaciente(errorContrasena)
      return
    }
    setEnviandoPaciente(true)
    try {
      const uid = await crearUsuarioAuxiliar(nuevoPaciente.email, nuevoPaciente.contrasena)
      await setDoc(doc(db, 'usuarios', uid), {
        email: nuevoPaciente.email,
        nombre: nuevoPaciente.nombre,
        apellido: nuevoPaciente.apellido,
        telefono: nuevoPaciente.telefono,
        edad: nuevoPaciente.edad ? Number(nuevoPaciente.edad) : null,
        sexo: nuevoPaciente.sexo,
        estatura: nuevoPaciente.estatura,
        peso: nuevoPaciente.peso,
        lugar: nuevoPaciente.lugar,
        rol: 'paciente',
        estado: 'activo',
        fotoUrl: '',
        fechaRegistro: serverTimestamp(),
      })
      setMostrarPaciente(false)
    } catch (err) {
      setErrorPaciente(err.code === 'auth/email-already-in-use' ? 'Ya existe una cuenta con ese correo.' : 'No se pudo crear el paciente.')
    } finally {
      setEnviandoPaciente(false)
    }
  }

  if (!datosUsuario || !datosProfesional) return <p className="web-sub">Cargando…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="web-h1">{datosUsuario.nombre}</div>
          <div className="web-sub">{datosProfesional.profesion} · {datosProfesional.especialidad} · Cuenta activa</div>
        </div>
        {datosUsuario.fotoUrl && (
          <img src={datosUsuario.fotoUrl} alt={datosUsuario.nombre} style={{ width: 56, height: 56, borderRadius: 6, border: '2px solid var(--oro)', objectFit: 'cover' }} />
        )}
      </div>

      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="metric-card"><div className="metric-num">{datosProfesional.calificacionPromedio ?? 0}</div><div className="metric-label">Calificación</div></div>
        <div className="metric-card"><div className="metric-num">Bs {datosProfesional.costoConsulta ?? 0}</div><div className="metric-label">Precio de consulta</div></div>
        <div className="metric-card"><div className="metric-num">{datosProfesional.verificado ? 'Sí' : 'En revisión'}</div><div className="metric-label">Verificado</div></div>
      </div>

      <div className="web-2col">
        <div>
          <div className="card-plain">
            <h2 className="section-title">Disponibilidad y modalidades</h2>
            <div className="admin-row">
              <div style={{ fontSize: 12.5 }}>Disponible ahora (visible para pacientes)</div>
              <div className={`switch${datosProfesional.disponibleAhora ? ' on' : ''}`} onClick={alternarDisponible}></div>
            </div>
            {MODALIDADES.map((m, i) => (
              <div className="admin-row" key={m.clave} style={i === MODALIDADES.length - 1 ? { borderBottom: 'none' } : undefined}>
                <div style={{ fontSize: 12.5 }}>{m.etiqueta}</div>
                <div className={`switch${datosProfesional.modalidades?.[i] ? ' on' : ''}`} onClick={() => alternarModalidad(i)}></div>
              </div>
            ))}
          </div>

          <div className="card-plain">
            <h2 className="section-title">Carnet profesional</h2>
            <p style={{ fontSize: 12.5, fontFamily: 'var(--mono)', color: 'var(--gris)' }}>{datosProfesional.carnet || 'No registrado'}</p>
            <p style={{ fontSize: 11.5, color: 'var(--gris)' }}>{datosProfesional.experiencia}</p>
          </div>

          <div className="card-plain">
            <h2 className="section-title">Pacientes</h2>
            <p style={{ fontSize: 12.5, color: 'var(--gris)' }}>
              ¿Un paciente no puede registrarse por su cuenta? Puedes crearle una cuenta aquí.
            </p>
            <button type="button" className="btn btn-outline btn-auto" onClick={abrirNuevoPaciente}>+ Registrar paciente nuevo</button>
          </div>
        </div>

        <div>
          <form className="card-plain" onSubmit={guardarPrecioYDescripcion}>
            <h2 className="section-title">Mi perfil público</h2>
            <label className="campo-label" htmlFor="costo">Costo de la consulta (Bs)</label>
            <input id="costo" type="number" value={costoConsulta} onChange={(e) => setCostoConsulta(e.target.value)} />
            <label className="campo-label" htmlFor="descripcion">Descripción</label>
            <textarea id="descripcion" rows="3" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            {mensaje && <div style={{ fontSize: 12, marginTop: 8, color: 'var(--esmeralda)' }}>{mensaje}</div>}
            <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 8 }}>Guardar</button>
          </form>
        </div>
      </div>

      {mostrarPaciente && (
        <div className="modal-fondo" onClick={() => setMostrarPaciente(false)}>
          <form className="modal-tarjeta" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onSubmit={crearPaciente}>
            <div className="modal-titulo">Registrar paciente</div>
            <div className="modal-sub">Se crea con acceso activo de inmediato.</div>
            <div className="campos-2col">
              <div><label className="campo-label">Nombre</label><input type="text" value={nuevoPaciente.nombre} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })} required /></div>
              <div><label className="campo-label">Apellido</label><input type="text" value={nuevoPaciente.apellido} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, apellido: e.target.value })} required /></div>
              <div><label className="campo-label">Correo</label><input type="email" value={nuevoPaciente.email} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, email: e.target.value })} required /></div>
              <div><label className="campo-label">Contraseña inicial</label><input type="password" value={nuevoPaciente.contrasena} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, contrasena: e.target.value })} required /></div>
              <div><label className="campo-label">Celular</label><input type="text" value={nuevoPaciente.telefono} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, telefono: e.target.value })} required /></div>
              <div><label className="campo-label">Edad</label><input type="number" value={nuevoPaciente.edad} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, edad: e.target.value })} required /></div>
              <div>
                <label className="campo-label">Sexo</label>
                <select value={nuevoPaciente.sexo} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, sexo: e.target.value })}>
                  <option>Femenino</option>
                  <option>Masculino</option>
                </select>
              </div>
              <div><label className="campo-label">Estatura aprox.</label><input type="text" value={nuevoPaciente.estatura} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, estatura: e.target.value })} required /></div>
              <div><label className="campo-label">Peso aprox.</label><input type="text" value={nuevoPaciente.peso} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, peso: e.target.value })} required /></div>
            </div>
            <label className="campo-label">Lugar donde vive</label>
            <input type="text" value={nuevoPaciente.lugar} onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, lugar: e.target.value })} required />
            {errorPaciente && <div className="registro-error">{errorPaciente}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setMostrarPaciente(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={enviandoPaciente}>{enviandoPaciente ? 'Creando…' : 'Crear paciente'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
