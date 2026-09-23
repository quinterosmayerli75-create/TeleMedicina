import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { crearUsuarioAuxiliar } from '../../firebase/crearUsuarioSecundario'
import { bloquearUsuario, levantarBloqueo, mensajeErrorBloqueo } from '../../firebase/bloqueos'
import ModalBloqueo from '../../components/admin/ModalBloqueo'
import { esBloqueo } from '../../utils/bloqueos'
import { diasRestantes, formatearFecha } from '../../utils/fechas'
import { AYUDA_CONTRASENA, validarContrasena } from '../../utils/validacion'
import FotosDoctorAdmin from '../../components/FotosDoctorAdmin'
import CampoContrasena from '../../components/CampoContrasena'
import { useTiposProfesion } from '../../hooks/useTiposProfesion'

const ETIQUETA_ESTADO = {
  activo: { texto: 'Activo', clase: 'status-active' },
  pendiente: { texto: 'Pendiente', clase: 'status-pending' },
  bloqueado: { texto: 'Bloqueado permanente', clase: 'status-blocked' },
  bloqueado_temporal: { texto: 'Bloqueado temporal', clase: 'status-blocked' },
  rechazado_temporal: { texto: 'Rechazo temporal', clase: 'status-warn' },
  rechazado_definitivo: { texto: 'Rechazado', clase: 'status-blocked' },
}

// Estados de cuenta que se listan aquí (los pendientes y rechazados viven en Solicitudes).
const ESTADOS_VISIBLES = ['activo', 'bloqueado_temporal', 'bloqueado']
const FILTROS_ESTADO = [
  { clave: '', etiqueta: 'Todos' },
  { clave: 'activo', etiqueta: 'Activos' },
  { clave: 'bloqueado_temporal', etiqueta: 'Bloqueados temporalmente' },
  { clave: 'bloqueado', etiqueta: 'Bloqueados permanentemente' },
]

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
  const [especialidadSel, setEspecialidadSel] = useState('')
  const [estadoSel, setEstadoSel] = useState('')
  const [aviso, setAviso] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const tiposProfesion = useTiposProfesion()

  const [modal, setModal] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [nuevo, setNuevo] = useState(NUEVO_INICIAL)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    // Todos los doctores, incluidos los bloqueados: así el bloqueo (temporal o permanente) se ve aquí.
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'profesional'))
    let vigente = true
    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        try {
          const filas = await Promise.all(
            snap.docs
              .filter((docSnap) => ESTADOS_VISIBLES.includes(docSnap.data().estado))
              .map(async (docSnap) => {
                const usuario = { id: docSnap.id, ...docSnap.data() }
                const profSnap = await getDoc(doc(db, 'profesionales', docSnap.id)).catch(() => null)
                return { ...usuario, profesional: profSnap?.exists() ? profSnap.data() : null }
              })
          )
          if (vigente) setDoctores(filas)
        } finally {
          if (vigente) setCargando(false)
        }
      },
      () => vigente && setCargando(false)
    )
    return () => {
      vigente = false
      unsubscribe()
    }
  }, [])

  // Especialidades del filtro: las del catálogo (Categorías) más cualquiera que ya tenga doctores.
  const especialidades = useMemo(() => {
    const conteo = new Map()
    tiposProfesion.forEach((t) => t.nombre && conteo.set(t.nombre, 0))
    doctores.forEach((d) => {
      const clave = d.profesional?.especialidad ?? 'Sin especialidad'
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1)
    })
    return [...conteo.entries()]
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [tiposProfesion, doctores])

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    return doctores.filter((d) => {
      const especialidad = d.profesional?.especialidad ?? 'Sin especialidad'
      if (especialidadSel && especialidad !== especialidadSel) return false
      if (estadoSel && d.estado !== estadoSel) return false
      if (!termino) return true
      return d.nombre?.toLowerCase().includes(termino) || especialidad.toLowerCase().includes(termino)
    })
  }, [doctores, busqueda, especialidadSel, estadoSel])

  const conteoEstado = useMemo(() => {
    const conteo = { '': doctores.length }
    doctores.forEach((d) => { conteo[d.estado] = (conteo[d.estado] ?? 0) + 1 })
    return conteo
  }, [doctores])

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
      // El perfil se guarda mientras la sesión auxiliar está abierta: si falla, la cuenta de acceso se
      // anula y se puede reintentar con el mismo correo.
      await crearUsuarioAuxiliar(nuevo.email, nuevo.contrasena, async (uid) => {
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
      })
      setModal(null)
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'Ya existe una cuenta con ese correo.' : 'No se pudo crear el doctor.')
    } finally {
      setEnviando(false)
    }
  }

  function abrirDetalle(d) {
    setSeleccion(d)
    setModal('detalle')
  }

  async function eliminarDoctor() {
    setAviso('')
    setErrorAccion('')
    try {
      await deleteDoc(doc(db, 'usuarios', seleccion.id))
      await deleteDoc(doc(db, 'profesionales', seleccion.id))
      setAviso(`Se eliminó a ${seleccion.nombre}.`)
    } catch (err) {
      setErrorAccion(mensajeErrorBloqueo(err))
    }
    setModal(null)
  }

  async function aplicarBloqueo(d, { tipo, dias, motivo }) {
    const { hasta } = await bloquearUsuario({ usuarioId: d.id, tipo, dias, motivo })
    setModal(null)
    setErrorAccion('')
    setAviso(
      tipo === 'temporal'
        ? `${d.nombre} quedó bloqueado temporalmente hasta el ${formatearFecha(hasta)}.`
        : `${d.nombre} quedó bloqueado permanentemente.`
    )
  }

  async function reactivar(d) {
    setAviso('')
    setErrorAccion('')
    try {
      await levantarBloqueo(d.id)
      setAviso(`Se levantó el bloqueo de ${d.nombre}: su cuenta vuelve a estar activa.`)
    } catch (err) {
      setErrorAccion(mensajeErrorBloqueo(err))
    }
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  const porEspecialidad = filtrados.reduce((acc, d) => {
    const clave = d.profesional?.especialidad ?? 'Sin especialidad'
    acc[clave] = acc[clave] ?? []
    acc[clave].push(d)
    return acc
  }, {})

  return (
    <div className="con-fab">
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Doctores registrados</span>
        <span style={{ fontSize: 14, color: 'var(--gris)', fontWeight: 400 }}>{doctores.length} en total</span>
      </h1>

      <input
        type="text"
        placeholder="Buscar por nombre o especialidad…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ maxWidth: 420, marginBottom: 14 }}
      />

      {aviso && <div className="banner-ok" role="status" data-testid="aviso-ok">{aviso}</div>}
      {errorAccion && <div className="banner-error" role="alert" data-testid="aviso-error">{errorAccion}</div>}

      <div className="chip-row" style={{ marginBottom: 12 }} role="group" aria-label="Filtrar por estado">
        {FILTROS_ESTADO.map((f) => (
          <button type="button" key={f.clave || 'todos'} className={`chip${estadoSel === f.clave ? ' on' : ''}`} onClick={() => setEstadoSel(f.clave)}>
            {f.etiqueta}<span className="chip-count">{conteoEstado[f.clave] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }} role="group" aria-label="Filtrar por especialidad">
        <button type="button" className={`chip${especialidadSel === '' ? ' on' : ''}`} onClick={() => setEspecialidadSel('')}>
          Todas<span className="chip-count">{doctores.length}</span>
        </button>
        {especialidades.map((e) => (
          <button
            type="button"
            key={e.nombre}
            className={`chip${especialidadSel === e.nombre ? ' on' : ''}${e.total === 0 ? ' vacio' : ''}`}
            onClick={() => setEspecialidadSel(especialidadSel === e.nombre ? '' : e.nombre)}
          >
            {e.nombre}<span className="chip-count">{e.total}</span>
          </button>
        ))}
      </div>

      <div className="card-plain" style={{ maxWidth: 960 }}>
        {Object.entries(porEspecialidad).map(([especialidad, lista]) => (
          <div key={especialidad}>
            <div className="spec-group">{especialidad} ({lista.length})</div>
            {lista.map((d) => {
              const etiqueta = ETIQUETA_ESTADO[d.estado] ?? ETIQUETA_ESTADO.activo
              const bloqueado = esBloqueo(d.estado)
              return (
                <div className="admin-row" key={d.id} data-testid={`fila-doctor-${d.id}`}>
                  <div>
                    {d.nombre}
                    {d.profesional?.notaEstado && (
                      <span className="status-pill status-warn" style={{ marginLeft: 8 }}>{d.profesional.notaEstado}</span>
                    )}
                    {bloqueado && (d.motivoBloqueo) && <div className="rank-meta">Motivo: {d.motivoBloqueo}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`status-pill ${etiqueta.clase}`}>
                      {etiqueta.texto}
                      {d.estado === 'bloqueado_temporal' && ` · hasta ${formatearFecha(d.bloqueadoHasta)}`}
                    </span>
                    <button type="button" className="mini-btn" onClick={() => abrirDetalle(d)}>Ver detalle</button>
                    {bloqueado ? (
                      <button type="button" className="mini-btn" onClick={() => reactivar(d)}>Levantar bloqueo</button>
                    ) : (
                      <button type="button" className="mini-btn danger" onClick={() => { setSeleccion(d); setAviso(''); setErrorAccion(''); setModal('bloquear') }}>Bloquear</button>
                    )}
                    <button type="button" className="mini-btn danger" onClick={() => { setSeleccion(d); setModal('eliminar') }}>Eliminar</button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {filtrados.length === 0 && (
          <p className="web-sub" style={{ marginBottom: 0 }}>
            {doctores.length === 0 ? 'Aún no hay doctores registrados.' : 'No hay doctores que coincidan con el filtro.'}
          </p>
        )}
      </div>

      <button type="button" className="btn btn-primary btn-auto fab-registrar" onClick={abrirNuevo}>+ Registrar doctor</button>

      {modal === 'nuevo' && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <form className="modal-tarjeta" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onSubmit={crearDoctor}>
            <div className="modal-titulo">Registrar doctor</div>
            <div className="modal-sub">La cuenta queda activa de inmediato, sin pasar por revisión.</div>
            <div className="campos-2col">
              <div><label className="campo-label">Nombre completo</label><input type="text" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required /></div>
              <div><label className="campo-label">Celular (8 dígitos)</label><input type="text" inputMode="numeric" value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value.replace(/\D/g, '').slice(0, 8) })} required /></div>
              <div><label className="campo-label">Correo</label><input type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} required /></div>
              <div>
                <label className="campo-label">Contraseña inicial</label>
                <CampoContrasena value={nuevo.contrasena} onChange={(e) => setNuevo({ ...nuevo, contrasena: e.target.value })} required />
                <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>{AYUDA_CONTRASENA}</div>
              </div>
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

      {modal === 'bloquear' && seleccion && (
        <ModalBloqueo
          key={seleccion.id}
          nombre={seleccion.nombre}
          onCerrar={() => setModal(null)}
          onConfirmar={(datos) => aplicarBloqueo(seleccion, datos)}
        />
      )}

      {modal === 'detalle' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">{seleccion.nombre}</div>
            <div className="modal-sub">{seleccion.profesional?.profesion} · {seleccion.profesional?.especialidad}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><div style={{ color: 'var(--gris)' }}>Correo</div><div style={{ fontWeight: 600 }}>{seleccion.email}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Celular</div><div style={{ fontWeight: 600 }}>{seleccion.telefono}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Carnet</div><div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{seleccion.profesional?.carnet}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Costo de consulta</div><div style={{ fontWeight: 600 }}>Bs {seleccion.profesional?.costoConsulta}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Experiencia</div><div style={{ fontWeight: 600 }}>{seleccion.profesional?.experiencia}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Calificación</div><div style={{ fontWeight: 600 }}>{seleccion.profesional?.calificacionPromedio}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Edad</div><div style={{ fontWeight: 600 }}>{seleccion.edad ? `${seleccion.edad} años` : '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Estatura · Peso</div><div style={{ fontWeight: 600 }}>{seleccion.estatura || '—'} · {seleccion.peso || '—'}</div></div>
              <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Descripción</div><div>{seleccion.profesional?.descripcion || '—'}</div></div>
              {seleccion.profesional?.notaEstado && (
                <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Nota de estado</div><div style={{ fontWeight: 600 }}>{seleccion.profesional.notaEstado}</div></div>
              )}
            </div>
            {esBloqueo(seleccion.estado) && (
              <div className="banner-error" style={{ marginTop: 14, marginBottom: 0 }}>
                <strong>{seleccion.estado === 'bloqueado_temporal' ? 'Bloqueado temporalmente' : 'Bloqueado permanentemente'}</strong>
                {seleccion.estado === 'bloqueado_temporal' && seleccion.bloqueadoHasta && (
                  <> hasta el {formatearFecha(seleccion.bloqueadoHasta)}
                    {diasRestantes(seleccion.bloqueadoHasta) > 0 ? ` (faltan ${diasRestantes(seleccion.bloqueadoHasta)} días)` : ' (plazo cumplido)'}</>
                )}
                {seleccion.motivoBloqueo && <><br />Motivo: {seleccion.motivoBloqueo}</>}
                {seleccion.bloqueadoEn && <><br />Desde el {formatearFecha(seleccion.bloqueadoEn)}</>}
              </div>
            )}
            <FotosDoctorAdmin doctor={seleccion} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
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
