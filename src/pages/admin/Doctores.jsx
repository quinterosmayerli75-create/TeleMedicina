import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { crearUsuarioAuxiliar } from '../../firebase/crearUsuarioSecundario'
import { validarContrasena } from '../../utils/validacion'

const ETIQUETA_ESTADO = {
  activo: { texto: 'Activo', clase: 'status-active' },
  pendiente: { texto: 'Pendiente', clase: 'status-pending' },
  bloqueado: { texto: 'Bloqueado', clase: 'status-blocked' },
  bloqueado_temporal: { texto: 'Bloqueado temporal', clase: 'status-blocked' },
  rechazado_temporal: { texto: 'Rechazo temporal', clase: 'status-warn' },
  rechazado_definitivo: { texto: 'Rechazado', clase: 'status-blocked' },
}

const PROFESIONES = ['Médico', 'Odontólogo', 'Psicólogo', 'Nutricionista']
const ESPECIALIDADES = ['Cardiología', 'Odontología', 'Psicología', 'Medicina general']

const NUEVO_INICIAL = {
  nombre: '', email: '', contrasena: '', telefono: '',
  profesion: PROFESIONES[0], especialidad: ESPECIALIDADES[0],
  carnet: '', experiencia: '', descripcion: '', costoConsulta: '',
}

export default function Doctores() {
  const [doctores, setDoctores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [modal, setModal] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [edicion, setEdicion] = useState(null)
  const [nuevo, setNuevo] = useState(NUEVO_INICIAL)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('estado', '==', 'activo'))
    const unsubscribe = onSnapshot(q, async (snap) => {
      const filas = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const usuario = { id: docSnap.id, ...docSnap.data() }
          const profSnap = await getDoc(doc(db, 'profesionales', docSnap.id))
          return { ...usuario, profesional: profSnap.exists() ? profSnap.data() : null }
        })
      )
      setDoctores(filas)
      setCargando(false)
    })
    return unsubscribe
  }, [])

  const filtrados = useMemo(() => {
    if (!busqueda) return doctores
    const termino = busqueda.toLowerCase()
    return doctores.filter(
      (d) => d.nombre?.toLowerCase().includes(termino) || d.profesional?.especialidad?.toLowerCase().includes(termino)
    )
  }, [doctores, busqueda])

  function abrirNuevo() {
    setNuevo(NUEVO_INICIAL)
    setError('')
    setModal('nuevo')
  }

  async function crearDoctor(e) {
    e.preventDefault()
    setError('')
    const errorContrasena = validarContrasena(nuevo.contrasena)
    if (errorContrasena) {
      setError(errorContrasena)
      return
    }
    setEnviando(true)
    try {
      const uid = await crearUsuarioAuxiliar(nuevo.email, nuevo.contrasena)
      await setDoc(doc(db, 'usuarios', uid), {
        email: nuevo.email,
        nombre: nuevo.nombre,
        telefono: nuevo.telefono,
        rol: 'profesional',
        estado: 'activo',
        fotoUrl: '',
        fechaRegistro: serverTimestamp(),
      })
      await setDoc(doc(db, 'profesionales', uid), {
        profesion: nuevo.profesion,
        especialidad: nuevo.especialidad,
        carnet: nuevo.carnet,
        experiencia: nuevo.experiencia,
        descripcion: nuevo.descripcion,
        costoConsulta: nuevo.costoConsulta ? Number(nuevo.costoConsulta) : 0,
        calificacionPromedio: 0,
        verificado: true,
        disponibleAhora: false,
        modalidades: [true, true, false],
        disponibilidad: {},
        documentosVerificacion: [],
        notaEstado: '',
      })
      setModal(null)
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'Ya existe una cuenta con ese correo.' : 'No se pudo crear el doctor.')
    } finally {
      setEnviando(false)
    }
  }

  function abrirEditar(d) {
    setSeleccion(d)
    setEdicion({
      nombre: d.nombre ?? '',
      telefono: d.telefono ?? '',
      especialidad: d.profesional?.especialidad ?? ESPECIALIDADES[0],
      carnet: d.profesional?.carnet ?? '',
      experiencia: d.profesional?.experiencia ?? '',
      descripcion: d.profesional?.descripcion ?? '',
      costoConsulta: d.profesional?.costoConsulta ?? '',
      notaEstado: d.profesional?.notaEstado ?? '',
    })
    setModal('editar')
  }

  async function guardarEdicion(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      await updateDoc(doc(db, 'usuarios', seleccion.id), {
        nombre: edicion.nombre,
        telefono: edicion.telefono,
      })
      await updateDoc(doc(db, 'profesionales', seleccion.id), {
        especialidad: edicion.especialidad,
        carnet: edicion.carnet,
        experiencia: edicion.experiencia,
        descripcion: edicion.descripcion,
        costoConsulta: edicion.costoConsulta ? Number(edicion.costoConsulta) : 0,
        notaEstado: edicion.notaEstado,
      })
      setModal(null)
    } finally {
      setEnviando(false)
    }
  }

  async function eliminarDoctor() {
    await deleteDoc(doc(db, 'usuarios', seleccion.id))
    await deleteDoc(doc(db, 'profesionales', seleccion.id))
    setModal(null)
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  const porEspecialidad = filtrados.reduce((acc, d) => {
    const clave = d.profesional?.especialidad ?? 'Sin especialidad'
    acc[clave] = acc[clave] ?? []
    acc[clave].push(d)
    return acc
  }, {})

  return (
    <div>
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Doctores registrados</span>
        <span style={{ fontSize: 14, color: 'var(--gris)', fontWeight: 400 }}>{doctores.length} en total</span>
      </h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o especialidad…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <button type="button" className="btn btn-primary btn-auto" onClick={abrirNuevo}>+ Registrar doctor</button>
      </div>

      <div className="card-plain" style={{ maxWidth: 960 }}>
        {Object.entries(porEspecialidad).map(([especialidad, lista]) => (
          <div key={especialidad}>
            <div className="spec-group">{especialidad} ({lista.length})</div>
            {lista.map((d) => {
              const etiqueta = ETIQUETA_ESTADO[d.estado] ?? ETIQUETA_ESTADO.activo
              return (
                <div className="admin-row" key={d.id}>
                  <div>
                    {d.nombre}
                    {d.profesional?.notaEstado && (
                      <span className="status-pill status-warn" style={{ marginLeft: 8 }}>{d.profesional.notaEstado}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`status-pill ${etiqueta.clase}`}>{etiqueta.texto}</span>
                    <button type="button" className="mini-btn" onClick={() => { setSeleccion(d); setModal('detalle') }}>Ver detalle</button>
                    <button type="button" className="mini-btn" onClick={() => abrirEditar(d)}>Editar</button>
                    <button type="button" className="mini-btn danger" onClick={() => { setSeleccion(d); setModal('eliminar') }}>Eliminar</button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {filtrados.length === 0 && <p className="web-sub" style={{ marginBottom: 0 }}>Aún no hay doctores activos.</p>}
      </div>

      {modal === 'nuevo' && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <form className="modal-tarjeta" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onSubmit={crearDoctor}>
            <div className="modal-titulo">Registrar doctor</div>
            <div className="modal-sub">La cuenta queda activa de inmediato, sin pasar por revisión.</div>
            <div className="campos-2col">
              <div><label className="campo-label">Nombre completo</label><input type="text" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required /></div>
              <div><label className="campo-label">Celular</label><input type="text" value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} required /></div>
              <div><label className="campo-label">Correo</label><input type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} required /></div>
              <div><label className="campo-label">Contraseña inicial</label><input type="password" value={nuevo.contrasena} onChange={(e) => setNuevo({ ...nuevo, contrasena: e.target.value })} required /></div>
              <div>
                <label className="campo-label">Profesión</label>
                <select value={nuevo.profesion} onChange={(e) => setNuevo({ ...nuevo, profesion: e.target.value })}>
                  {PROFESIONES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="campo-label">Especialidad</label>
                <select value={nuevo.especialidad} onChange={(e) => setNuevo({ ...nuevo, especialidad: e.target.value })}>
                  {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div><label className="campo-label">Carnet profesional</label><input type="text" value={nuevo.carnet} onChange={(e) => setNuevo({ ...nuevo, carnet: e.target.value })} required /></div>
              <div><label className="campo-label">Experiencia</label><input type="text" value={nuevo.experiencia} onChange={(e) => setNuevo({ ...nuevo, experiencia: e.target.value })} /></div>
              <div><label className="campo-label">Costo de consulta (Bs)</label><input type="number" value={nuevo.costoConsulta} onChange={(e) => setNuevo({ ...nuevo, costoConsulta: e.target.value })} required /></div>
            </div>
            <label className="campo-label">Descripción</label>
            <textarea rows="2" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />
            {error && <div className="registro-error">{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Creando…' : 'Crear doctor'}</button>
            </div>
          </form>
        </div>
      )}

      {modal === 'detalle' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">{seleccion.nombre}</div>
            <div className="modal-sub">{seleccion.profesional?.profesion} · {seleccion.profesional?.especialidad}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><div style={{ color: 'var(--gris)' }}>Correo</div><div style={{ fontWeight: 600 }}>{seleccion.email}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Celular</div><div style={{ fontWeight: 600 }}>{seleccion.telefono}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Carnet</div><div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{seleccion.profesional?.carnet}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Costo de consulta</div><div style={{ fontWeight: 600 }}>Bs {seleccion.profesional?.costoConsulta}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Experiencia</div><div style={{ fontWeight: 600 }}>{seleccion.profesional?.experiencia}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Calificación</div><div style={{ fontWeight: 600 }}>{seleccion.profesional?.calificacionPromedio}</div></div>
              <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Descripción</div><div>{seleccion.profesional?.descripcion || '—'}</div></div>
              {seleccion.profesional?.notaEstado && (
                <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Nota de estado</div><div style={{ fontWeight: 600 }}>{seleccion.profesional.notaEstado}</div></div>
              )}
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {modal === 'editar' && edicion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <form className="modal-tarjeta" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()} onSubmit={guardarEdicion}>
            <div className="modal-titulo">Editar a {seleccion.nombre}</div>
            <div className="campos-2col">
              <div><label className="campo-label">Nombre completo</label><input type="text" value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} required /></div>
              <div><label className="campo-label">Celular</label><input type="text" value={edicion.telefono} onChange={(e) => setEdicion({ ...edicion, telefono: e.target.value })} /></div>
              <div>
                <label className="campo-label">Especialidad</label>
                <select value={edicion.especialidad} onChange={(e) => setEdicion({ ...edicion, especialidad: e.target.value })}>
                  {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div><label className="campo-label">Carnet</label><input type="text" value={edicion.carnet} onChange={(e) => setEdicion({ ...edicion, carnet: e.target.value })} /></div>
              <div><label className="campo-label">Experiencia</label><input type="text" value={edicion.experiencia} onChange={(e) => setEdicion({ ...edicion, experiencia: e.target.value })} /></div>
              <div><label className="campo-label">Costo de consulta (Bs)</label><input type="number" value={edicion.costoConsulta} onChange={(e) => setEdicion({ ...edicion, costoConsulta: e.target.value })} /></div>
            </div>
            <label className="campo-label">Descripción</label>
            <textarea rows="2" value={edicion.descripcion} onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })} />
            <label className="campo-label">Nota de estado (ej. "De vacaciones hasta 10/10")</label>
            <input type="text" placeholder="Dejar vacío si no aplica" value={edicion.notaEstado} onChange={(e) => setEdicion({ ...edicion, notaEstado: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={enviando}>Guardar cambios</button>
            </div>
          </form>
        </div>
      )}

      {modal === 'eliminar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>¿Eliminar a {seleccion.nombre}?</div>
            <div className="modal-sub">
              Se borra su perfil de la plataforma. Su cuenta de acceso queda inutilizable porque ya no tendrá
              datos asociados, aunque el registro de autenticación deba limpiarse aparte.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={eliminarDoctor}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
