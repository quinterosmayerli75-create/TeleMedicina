import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { bloquearUsuario, levantarBloqueo, mensajeErrorBloqueo } from '../../firebase/bloqueos'
import { useBloqueados } from '../../hooks/useBloqueados'
import ListaBloqueos from '../../components/admin/ListaBloqueos'
import ModalBloqueo from '../../components/admin/ModalBloqueo'
import { aFecha, formatearFecha } from '../../utils/fechas'
import { estadoEfectivo } from '../../utils/bloqueos'

// Lee un usuario sin que un id faltante, un documento borrado o un error de permisos rompa la pantalla.
async function leerUsuario(id) {
  if (!id) return null
  try {
    const snap = await getDoc(doc(db, 'usuarios', id))
    return snap.exists() ? snap.data() : null
  } catch {
    return null
  }
}

const ETIQUETA_ROL = { profesional: 'Doctor', paciente: 'Paciente', administrador: 'Administrador' }
const ETIQUETA_ESTADO = { bloqueado: 'bloqueada', bloqueado_temporal: 'bloqueada temporalmente', pendiente: 'pendiente', rechazado_temporal: 'rechazada', rechazado_definitivo: 'rechazada' }

const PESTANAS = [
  { clave: 'denuncias', etiqueta: 'Denuncias' },
  { clave: 'temporales', etiqueta: 'Bloqueos temporales' },
  { clave: 'permanentes', etiqueta: 'Bloqueos permanentes' },
  { clave: 'apelaciones', etiqueta: 'Apelaciones' },
]

// Apelaciones de usuarios bloqueados: colección "apelaciones"
//   { usuarioId, reporteId?, mensaje, estado: 'pendiente' | 'aceptada' | 'rechazada', fecha, notaAdmin? }
function useApelaciones() {
  const [apelaciones, setApelaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    const unsubscribe = onSnapshot(
      collection(db, 'apelaciones'),
      async (snap) => {
        try {
          const filas = await Promise.all(
            snap.docs.map(async (docSnap) => {
              const apelacion = { id: docSnap.id, ...docSnap.data() }
              return { ...apelacion, usuario: await leerUsuario(apelacion.usuarioId) }
            })
          )
          // Pendientes primero; dentro de cada grupo, las más recientes arriba.
          filas.sort((a, b) => {
            if ((a.estado === 'pendiente') !== (b.estado === 'pendiente')) return a.estado === 'pendiente' ? -1 : 1
            return (aFecha(b.fecha)?.getTime() ?? 0) - (aFecha(a.fecha)?.getTime() ?? 0)
          })
          if (vigente) setApelaciones(filas)
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

  return { apelaciones, cargando }
}

export default function Denuncias() {
  const [pestana, setPestana] = useState('denuncias')
  const [denuncias, setDenuncias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const temporales = useBloqueados('bloqueado_temporal')
  const permanentes = useBloqueados('bloqueado')
  const { apelaciones, cargando: cargandoApelaciones } = useApelaciones()
  const [seleccion, setSeleccion] = useState(null)
  const [modal, setModal] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [aviso, setAviso] = useState('')
  const [errorAccion, setErrorAccion] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'reportes'), where('estado', '==', 'pendiente'))
    let vigente = true
    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        try {
          const filas = await Promise.all(
            snap.docs.map(async (docSnap) => {
              const denuncia = { id: docSnap.id, ...docSnap.data() }
              const [denunciante, denunciado] = await Promise.all([
                leerUsuario(denuncia.denuncianteId),
                leerUsuario(denuncia.denunciadoId),
              ])
              return { ...denuncia, denunciante, denunciado }
            })
          )
          if (!vigente) return
          setDenuncias(filas)
          setErrorCarga('')
        } catch (err) {
          if (vigente) setErrorCarga(err?.message ?? 'Error desconocido')
        } finally {
          if (vigente) setCargando(false)
        }
      },
      (err) => {
        if (!vigente) return
        setErrorCarga(err?.code ? `${err.code}: ${err.message}` : (err?.message ?? 'Error desconocido'))
        setCargando(false)
      }
    )
    return () => {
      vigente = false
      unsubscribe()
    }
  }, [])

  // Ejecuta una acción del admin: cierra la ventana si salió bien y deja a la vista el resultado o el error.
  async function ejecutar(accion, exito) {
    setAviso('')
    setErrorAccion('')
    try {
      await accion()
      setModal(null)
      setMotivo('')
      setAviso(exito)
    } catch (err) {
      setModal(null)
      setErrorAccion(mensajeErrorBloqueo(err))
    }
  }

  const descartar = (d) => ejecutar(
    () => updateDoc(doc(db, 'reportes', d.id), { estado: 'descartada', notaAdmin: motivo, resueltaEn: serverTimestamp() }),
    'La denuncia se descartó.'
  )

  // Los bloqueos se aplican desde ModalBloqueo, que muestra sus propios errores sin cerrarse.
  async function aplicarBloqueo(d, { tipo, dias, motivo: motivoBloqueo }) {
    const { hasta } = await bloquearUsuario({ usuarioId: d.denunciadoId, tipo, dias, motivo: motivoBloqueo, reporteId: d.id })
    const nombre = d.denunciado?.nombre ?? 'La cuenta'
    setModal(null)
    setErrorAccion('')
    setAviso(
      tipo === 'temporal'
        ? `Bloqueo temporal aplicado a ${nombre} hasta el ${formatearFecha(hasta)}. La denuncia quedó resuelta.`
        : `Bloqueo permanente aplicado a ${nombre}. La denuncia quedó resuelta.`
    )
  }

  const aceptarApelacion = (a) => ejecutar(async () => {
    await levantarBloqueo(a.usuarioId)
    await updateDoc(doc(db, 'apelaciones', a.id), { estado: 'aceptada', resueltaEn: serverTimestamp() })
  }, 'Apelación aceptada: el bloqueo se levantó y la cuenta vuelve a estar activa.')

  const rechazarApelacion = (a) => ejecutar(
    () => updateDoc(doc(db, 'apelaciones', a.id), { estado: 'rechazada', notaAdmin: motivo, resueltaEn: serverTimestamp() }),
    'Apelación rechazada: el bloqueo se mantiene.'
  )

  const pendientes = apelaciones.filter((a) => a.estado === 'pendiente').length
  const conteos = {
    denuncias: denuncias.length,
    temporales: temporales.bloqueados.length,
    permanentes: permanentes.bloqueados.length,
    apelaciones: pendientes,
  }

  return (
    <div>
      <h1 className="web-h1">Denuncias</h1>
      <p className="web-sub">Denuncias recibidas, bloqueos aplicados y apelaciones de los usuarios bloqueados.</p>
      {aviso && <div className="banner-ok" role="status" data-testid="aviso-ok">{aviso}</div>}
      {errorAccion && <div className="banner-error" role="alert" data-testid="aviso-error">{errorAccion}</div>}

      <div className="subtabs" role="tablist">
        {PESTANAS.map((p) => (
          <button
            type="button"
            role="tab"
            key={p.clave}
            aria-selected={pestana === p.clave}
            className={`subtab${pestana === p.clave ? ' on' : ''}`}
            onClick={() => setPestana(p.clave)}
          >
            {p.etiqueta} <span className="subtab-count">{conteos[p.clave]}</span>
          </button>
        ))}
      </div>

      {pestana === 'temporales' && <ListaBloqueos {...temporales} temporal />}
      {pestana === 'permanentes' && <ListaBloqueos {...permanentes} />}
      {pestana === 'apelaciones' && (
        <ListaApelaciones
          apelaciones={apelaciones}
          cargando={cargandoApelaciones}
          onAceptar={(a) => { setSeleccion(a); setModal('apel-aceptar') }}
          onRechazar={(a) => { setSeleccion(a); setMotivo(''); setModal('apel-rechazar') }}
        />
      )}

      {pestana === 'denuncias' && cargando && <p className="web-sub">Cargando…</p>}
      {pestana === 'denuncias' && errorCarga && (
        <div className="registro-error" style={{ marginTop: 0 }}>No se pudieron cargar las denuncias ({errorCarga}).</div>
      )}
      {pestana === 'denuncias' && !cargando && !errorCarga && denuncias.length === 0 && <p className="web-sub">No hay denuncias pendientes.</p>}

      {pestana === 'denuncias' && (
        <div className="web-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {denuncias.map((d) => (
            <div className="card-plain" key={d.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.motivo}</div>
                <span className="status-pill status-pending">Pendiente</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--gris)', margin: '4px 0' }}>
                Denunciado: {d.denunciado?.nombre ?? '—'}
                {d.denunciado && ` (${ETIQUETA_ROL[d.denunciado.rol] ?? d.denunciado.rol})`}
                {d.denunciado && estadoEfectivo(d.denunciado) !== 'activo' && ` · cuenta ${ETIQUETA_ESTADO[estadoEfectivo(d.denunciado)] ?? d.denunciado.estado}`}
                <br />
                Denunciante: {d.denunciante?.nombre ?? '—'}
              </div>
              {!d.denunciado && (
                <div className="registro-error" style={{ marginTop: 0, marginBottom: 6 }}>
                  La cuenta denunciada ya no existe, así que no se puede bloquear. Descarta la denuncia.
                </div>
              )}
              <div className="btn-grid-4">
                <button type="button" className="btn btn-outline" onClick={() => { setSeleccion(d); setModal('info') }}>Info de denuncia</button>
                <button type="button" className="btn btn-outline" onClick={() => { setSeleccion(d); setModal('descartar') }}>Descartar</button>
                <button type="button" className="btn btn-warn" disabled={!d.denunciado} onClick={() => { setSeleccion(d); setAviso(''); setErrorAccion(''); setModal('bloq-temp') }}>Bloqueo temporal</button>
                <button type="button" className="btn btn-danger" disabled={!d.denunciado} onClick={() => { setSeleccion(d); setAviso(''); setErrorAccion(''); setModal('bloq-def') }}>Bloqueo definitivo</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'info' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">Información de la denuncia</div>
            <div className="modal-sub">{seleccion.motivo}</div>
            <div className="card-plain" style={{ marginTop: 12 }}>
              <div className="admin-row"><div>Denunciante</div><div style={{ fontWeight: 600 }}>{seleccion.denunciante?.nombre ?? '—'}</div></div>
              <div className="admin-row" style={{ borderBottom: 'none' }}><div>Denunciado</div><div style={{ fontWeight: 600 }}>{seleccion.denunciado?.nombre ?? '—'}</div></div>
            </div>
            <div className="section-title">Descripción del denunciante</div>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: '#3a4750', background: 'var(--marfil)', padding: 12 }}>{seleccion.descripcion}</p>
            <div className="section-title">Evidencia</div>
            {(seleccion.evidencias ?? []).length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--gris)', marginTop: 0 }}>El denunciante no adjuntó fotos.</p>
            ) : (
              <div className="doc-thumbs" style={{ marginBottom: 16 }}>
                {seleccion.evidencias.map((url, i) => (
                  <a className="doc-thumb" href={url} target="_blank" rel="noreferrer" key={url}>
                    <img src={url} alt={`Evidencia ${i + 1}`} />Evidencia {i + 1}
                  </a>
                ))}
              </div>
            )}
            <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {modal === 'descartar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">¿Descartar esta denuncia?</div>
            <div className="modal-sub">Se archiva y no se toma ninguna acción contra el denunciado.</div>
            <label className="campo-label">Motivo del descarte</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Pruebas insuficientes…" />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={() => descartar(seleccion)}>Descartar denuncia</button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'bloq-temp' || modal === 'bloq-def') && seleccion && (
        <ModalBloqueo
          key={`${seleccion.id}-${modal}`}
          nombre={seleccion.denunciado?.nombre ?? 'La cuenta denunciada'}
          tipoInicial={modal === 'bloq-temp' ? 'temporal' : 'permanente'}
          tipoFijo
          motivoInicial={seleccion.motivo ?? ''}
          onCerrar={() => setModal(null)}
          onConfirmar={(datos) => aplicarBloqueo(seleccion, datos)}
        />
      )}

      {modal === 'apel-aceptar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--esmeralda)' }}>Aceptar apelación</div>
            <div className="modal-sub">Se levanta el bloqueo de {seleccion.usuario?.nombre ?? 'este usuario'} y su cuenta vuelve a estar activa.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-ok" onClick={() => aceptarApelacion(seleccion)}>Aceptar y desbloquear</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'apel-rechazar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>Rechazar apelación</div>
            <div className="modal-sub">El bloqueo de {seleccion.usuario?.nombre ?? 'este usuario'} se mantiene.</div>
            <label className="campo-label">Motivo del rechazo</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Las pruebas de la denuncia se mantienen…" />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={() => rechazarApelacion(seleccion)}>Rechazar apelación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ESTILO_APELACION = {
  pendiente: { texto: 'Pendiente', clase: 'status-pending' },
  aceptada: { texto: 'Aceptada', clase: 'status-active' },
  rechazada: { texto: 'Rechazada', clase: 'status-blocked' },
}

function ListaApelaciones({ apelaciones, cargando, onAceptar, onRechazar }) {
  if (cargando) return <p className="web-sub">Cargando…</p>

  return (
    <div className="card-plain" style={{ maxWidth: 960 }}>
      {apelaciones.length === 0 && <p className="web-sub" style={{ marginBottom: 0 }}>No hay apelaciones.</p>}
      {apelaciones.map((a) => {
        const estilo = ESTILO_APELACION[a.estado] ?? ESTILO_APELACION.pendiente
        const nombre = [a.usuario?.nombre, a.usuario?.apellido].filter(Boolean).join(' ') || '—'
        return (
          <div className="admin-row" key={a.id} style={{ alignItems: 'flex-start', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div>
                {nombre}
                {a.usuario?.rol && <span className="status-pill status-pending" style={{ marginLeft: 8 }}>{ETIQUETA_ROL[a.usuario.rol] ?? a.usuario.rol}</span>}
              </div>
              <div className="rank-meta">{formatearFecha(a.fecha)}</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: '#3a4750', background: 'var(--marfil)', padding: 10, margin: '8px 0 0' }}>{a.mensaje}</p>
              {a.estado === 'rechazada' && a.notaAdmin && <div className="rank-meta" style={{ marginTop: 6 }}>Motivo del rechazo: {a.notaAdmin}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`status-pill ${estilo.clase}`}>{estilo.texto}</span>
              {a.estado === 'pendiente' && (
                <>
                  <button type="button" className="mini-btn" onClick={() => onAceptar(a)}>Aceptar</button>
                  <button type="button" className="mini-btn danger" onClick={() => onRechazar(a)}>Rechazar</button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
