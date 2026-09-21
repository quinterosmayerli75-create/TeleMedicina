import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { bloquearUsuario, levantarBloqueo, mensajeErrorBloqueo } from '../../firebase/bloqueos'
import ModalBloqueo from '../../components/admin/ModalBloqueo'
import { esBloqueo } from '../../utils/bloqueos'
import { formatearFecha } from '../../utils/fechas'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [modal, setModal] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [aviso, setAviso] = useState('')
  const [errorAccion, setErrorAccion] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'paciente'))
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setCargando(false)
      },
      () => setCargando(false)
    )
    return unsubscribe
  }, [])

  const filtrados = useMemo(() => {
    if (!busqueda) return usuarios
    const termino = busqueda.toLowerCase()
    return usuarios.filter((u) => `${u.nombre} ${u.apellido}`.toLowerCase().includes(termino) || u.email?.toLowerCase().includes(termino))
  }, [usuarios, busqueda])

  async function aplicarBloqueo(u, { tipo, dias, motivo }) {
    const { hasta } = await bloquearUsuario({ usuarioId: u.id, tipo, dias, motivo })
    const nombre = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim()
    setModal(null)
    setErrorAccion('')
    setAviso(
      tipo === 'temporal'
        ? `${nombre} quedó bloqueado temporalmente hasta el ${formatearFecha(hasta)}.`
        : `${nombre} quedó bloqueado permanentemente.`
    )
  }

  async function reactivar(u) {
    setAviso('')
    setErrorAccion('')
    try {
      await levantarBloqueo(u.id)
      setAviso(`Se levantó el bloqueo de ${`${u.nombre ?? ''} ${u.apellido ?? ''}`.trim()}: su cuenta vuelve a estar activa.`)
    } catch (err) {
      setErrorAccion(mensajeErrorBloqueo(err))
    }
  }

  async function eliminarUsuario() {
    setAviso('')
    setErrorAccion('')
    try {
      await deleteDoc(doc(db, 'usuarios', seleccion.id))
      setAviso('El usuario se eliminó.')
    } catch (err) {
      setErrorAccion(mensajeErrorBloqueo(err))
    }
    setModal(null)
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  return (
    <div>
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Usuarios registrados</span>
        <span style={{ fontSize: 14, color: 'var(--gris)', fontWeight: 400 }}>{usuarios.length} en total</span>
      </h1>

      <input
        type="text"
        placeholder="Buscar por nombre o correo…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ maxWidth: 420, marginBottom: 20 }}
      />

      {aviso && <div className="banner-ok" role="status" data-testid="aviso-ok">{aviso}</div>}
      {errorAccion && <div className="banner-error" role="alert" data-testid="aviso-error">{errorAccion}</div>}

      <div className="card-plain" style={{ maxWidth: 960 }}>
        {filtrados.map((u) => (
          <div className="admin-row" key={u.id}>
            <div>{u.nombre} {u.apellido}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`status-pill ${u.estado === 'activo' ? 'status-active' : 'status-blocked'}`}>
                {u.estado === 'bloqueado_temporal'
                  ? `Bloqueado temporal · hasta ${formatearFecha(u.bloqueadoHasta)}`
                  : u.estado === 'bloqueado' ? 'Bloqueado permanente' : 'Activo'}
              </span>
              <button type="button" className="mini-btn" onClick={() => { setSeleccion(u); setModal('detalle') }}>Ver detalle</button>
              {esBloqueo(u.estado) ? (
                <button type="button" className="mini-btn" onClick={() => reactivar(u)}>Levantar bloqueo</button>
              ) : (
                <button type="button" className="mini-btn danger" onClick={() => { setSeleccion(u); setAviso(''); setErrorAccion(''); setModal('bloquear') }}>Bloquear</button>
              )}
              <button type="button" className="mini-btn danger" onClick={() => { setSeleccion(u); setModal('eliminar') }}>Eliminar</button>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && <p className="web-sub" style={{ marginBottom: 0 }}>Aún no hay pacientes registrados.</p>}
      </div>

      {modal === 'bloquear' && seleccion && (
        <ModalBloqueo
          key={seleccion.id}
          nombre={`${seleccion.nombre ?? ''} ${seleccion.apellido ?? ''}`.trim()}
          onCerrar={() => setModal(null)}
          onConfirmar={(datos) => aplicarBloqueo(seleccion, datos)}
        />
      )}

      {modal === 'detalle' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">{seleccion.nombre} {seleccion.apellido}</div>
            <div className="modal-sub">Paciente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><div style={{ color: 'var(--gris)' }}>Correo</div><div style={{ fontWeight: 600 }}>{seleccion.email}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Celular</div><div style={{ fontWeight: 600 }}>{seleccion.telefono}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Edad</div><div style={{ fontWeight: 600 }}>{seleccion.edad ?? '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Sexo</div><div style={{ fontWeight: 600 }}>{seleccion.sexo ?? '—'}</div></div>
              <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Lugar donde vive</div><div style={{ fontWeight: 600 }}>{seleccion.lugar ?? '—'}</div></div>
              {esBloqueo(seleccion.estado) && (
                <div style={{ gridColumn: '1/3' }}>
                  <div style={{ color: 'var(--gris)' }}>Bloqueo</div>
                  <div style={{ fontWeight: 600 }}>
                    {seleccion.estado === 'bloqueado_temporal' ? `Temporal, hasta el ${formatearFecha(seleccion.bloqueadoHasta)}` : 'Permanente'}
                    {seleccion.motivoBloqueo && ` · ${seleccion.motivoBloqueo}`}
                  </div>
                </div>
              )}
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {modal === 'eliminar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>¿Eliminar a {seleccion.nombre}?</div>
            <div className="modal-sub">Se borra su perfil de la plataforma de forma permanente.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={eliminarUsuario}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
