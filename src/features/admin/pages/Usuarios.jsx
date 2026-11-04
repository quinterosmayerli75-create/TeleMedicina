import Icono from '@/shared/components/Icono'
import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { bloquearUsuario, congelarUsuario, levantarBloqueo, mensajeErrorBloqueo } from '@/features/bloqueos/services/bloqueos'
import ModalBloqueo from '@/features/bloqueos/components/ModalBloqueo'
import { esBloqueo } from '@/features/bloqueos/utils/bloqueos'
import { formatearFecha } from '@/shared/utils/fechas'
import { descargarCSV } from '@/shared/utils/exportar'
import { coincideTexto } from '@/shared/utils/texto'

const COLUMNAS_EXPORTAR = [
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'apellido', etiqueta: 'Apellido' },
  { clave: 'email', etiqueta: 'Correo' },
  { clave: 'telefono', etiqueta: 'Celular' },
  { clave: 'edad', etiqueta: 'Edad' },
  { clave: 'sexo', etiqueta: 'Sexo' },
  { clave: 'lugar', etiqueta: 'Lugar' },
  { clave: 'estado', etiqueta: 'Estado' },
]

const FILTROS_ESTADO = [
  { clave: '', etiqueta: 'Todos' },
  { clave: 'activo', etiqueta: 'Activos' },
  { clave: 'bloqueado_temporal', etiqueta: 'Bloqueados temporalmente' },
  { clave: 'bloqueado', etiqueta: 'Bloqueados permanentemente' },
  { clave: 'congelada', etiqueta: 'Congeladas' },
]

const POR_PAGINA = 10

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [estadoSel, setEstadoSel] = useState('')
  const [pagina, setPagina] = useState(1)

  const [modal, setModal] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [aviso, setAviso] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [motivoCongelar, setMotivoCongelar] = useState('')

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

  const conteoEstado = useMemo(() => {
    const conteo = { '': usuarios.length }
    usuarios.forEach((u) => { conteo[u.estado] = (conteo[u.estado] ?? 0) + 1 })
    return conteo
  }, [usuarios])

  const filtrados = useMemo(() => {
    return usuarios.filter((u) => {
      if (estadoSel && u.estado !== estadoSel) return false
      if (!busqueda.trim()) return true
      return (
        coincideTexto(`${u.nombre} ${u.apellido}`, busqueda) ||
        coincideTexto(u.email, busqueda) ||
        u.telefono?.includes(busqueda.trim())
      )
    })
  }, [usuarios, busqueda, estadoSel])

  useEffect(() => setPagina(1), [busqueda, estadoSel])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

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

  // Las cuentas nunca se borran de la base de datos: se congelan (se conserva su historial).
  async function congelarUsuarioAccion() {
    setAviso('')
    setErrorAccion('')
    try {
      await congelarUsuario({ usuarioId: seleccion.id, motivo: motivoCongelar })
      setAviso('La cuenta se congeló.')
      setModal(null)
      setMotivoCongelar('')
    } catch (err) {
      setErrorAccion(mensajeErrorBloqueo(err))
    }
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  return (
    <div>
      <div className="admin-eyebrow">
        GESTIÓN DE PACIENTES
        <span className="vivo"><span className="punto" /> Sincronización en vivo</span>
      </div>
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Usuarios registrados</span>
        <span className="admin-total-pill"><Icono nombre="users" size={19} /> {usuarios.length} en total</span>
      </h1>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
        <div className="admin-metric-card">
          <div className="icono"><Icono nombre="users" size={19} /></div>
          <div className="overline">Total pacientes</div>
          <div className="numero">{usuarios.length}</div>
          <div className="caption">Cuentas registradas</div>
        </div>
        <div className="admin-metric-card c-azul">
          <div className="icono"><Icono nombre="check" size={19} /></div>
          <div className="overline">Activos</div>
          <div className="numero">{conteoEstado.activo ?? 0}</div>
          <div className="caption">Cuentas sin bloqueo</div>
        </div>
        <div className="admin-metric-card c-ambar">
          <div className="icono"><Icono nombre="clock" size={19} /></div>
          <div className="overline">Bloqueados temporalmente</div>
          <div className="numero">{conteoEstado.bloqueado_temporal ?? 0}</div>
          <div className="caption">Con fecha de reactivación</div>
        </div>
        <div className="admin-metric-card c-onyx">
          <div className="icono"><Icono nombre="ban" size={19} /></div>
          <div className="overline">Bloqueados permanentemente</div>
          <div className="numero">{conteoEstado.bloqueado ?? 0}</div>
          <div className="caption">Sin acceso a la plataforma</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Buscar por nombre, correo o celular…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 420, margin: 0 }}
        />
        <button type="button" className="btn btn-outline btn-auto" onClick={() => descargarCSV('pacientes-doctop', COLUMNAS_EXPORTAR, filtrados)}>
          <Icono nombre="chart" size={19} /> Exportar a Excel
        </button>
      </div>

      {aviso && <div className="banner-ok" role="status" data-testid="aviso-ok">{aviso}</div>}
      {errorAccion && <div className="banner-error" role="alert" data-testid="aviso-error">{errorAccion}</div>}

      <div className="chip-row" style={{ marginBottom: 20 }} role="group" aria-label="Filtrar por estado">
        {FILTROS_ESTADO.map((f) => (
          <button type="button" key={f.clave || 'todos'} className={`chip${estadoSel === f.clave ? ' on' : ''}`} onClick={() => setEstadoSel(f.clave)}>
            {f.etiqueta}<span className="chip-count">{conteoEstado[f.clave] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="card-plain" style={{ maxWidth: 960 }}>
        {paginados.map((u) => (
          <div className="admin-row" key={u.id}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="admin-avatar-row">{(u.nombre?.[0] ?? '?').toUpperCase()}</div>
              <div>
                {u.nombre} {u.apellido}
                <div className="rank-meta">{u.email}{u.telefono && ` · ${u.telefono}`}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`status-pill ${u.estado === 'activo' ? 'status-active' : 'status-blocked'}`}>
                {u.estado === 'bloqueado_temporal'
                  ? `Bloqueado temporal · hasta ${formatearFecha(u.bloqueadoHasta)}`
                  : u.estado === 'bloqueado' ? 'Bloqueado permanente'
                  : u.estado === 'congelada' ? 'Congelada' : 'Activo'}
              </span>
              <button type="button" className="mini-btn" onClick={() => { setSeleccion(u); setModal('detalle') }}>Ver detalle</button>
              {esBloqueo(u.estado) ? (
                <button type="button" className="mini-btn" onClick={() => reactivar(u)}>Levantar bloqueo</button>
              ) : (
                <button type="button" className="mini-btn danger" onClick={() => { setSeleccion(u); setAviso(''); setErrorAccion(''); setModal('bloquear') }}>Bloquear</button>
              )}
              <button type="button" className="mini-btn danger" onClick={() => { setSeleccion(u); setMotivoCongelar(''); setModal('congelar') }}>Congelar</button>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <p className="web-sub" style={{ marginBottom: 0 }}>
            {usuarios.length === 0 ? 'Aún no hay pacientes registrados.' : 'No hay pacientes que coincidan con el filtro.'}
          </p>
        )}
      </div>

      {filtrados.length > POR_PAGINA && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button type="button" className="mini-btn" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>← Anterior</button>
          <span className="rank-meta">Página {pagina} de {totalPaginas}</span>
          <button type="button" className="mini-btn" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
        </div>
      )}

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

      {modal === 'congelar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>¿Congelar la cuenta de {seleccion.nombre}?</div>
            <div className="modal-sub">
              Ya no podrá entrar a DocTop, pero su historial se conserva. Las cuentas nunca se borran de la plataforma.
            </div>
            <label className="campo-label">Motivo (lo verá si intenta entrar)</label>
            <textarea rows="3" value={motivoCongelar} onChange={(e) => setMotivoCongelar(e.target.value)} placeholder="Ej. Cuenta duplicada, a pedido del usuario…" />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" disabled={!motivoCongelar.trim()} onClick={congelarUsuarioAccion}>Sí, congelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
