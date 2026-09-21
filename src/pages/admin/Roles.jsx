import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { crearUsuarioAuxiliar } from '../../firebase/crearUsuarioSecundario'
import { mensajeErrorBloqueo } from '../../firebase/bloqueos'
import { useAuth } from '../../context/AuthContext'
import { validarContrasena } from '../../utils/validacion'
import { formatearFecha } from '../../utils/fechas'

const NUEVO_INICIAL = { nombre: '', email: '', telefono: '', contrasena: '' }

function mensajeCrear(err) {
  if (err?.code === 'auth/email-already-in-use') return 'Ya existe una cuenta con ese correo.'
  if (err?.code === 'auth/invalid-email') return 'El correo no es válido.'
  if (err?.code === 'auth/weak-password') return 'La contraseña es demasiado débil.'
  if (err?.code === 'permission-denied') return mensajeErrorBloqueo(err)
  return 'No se pudo crear la cuenta de administrador. Intenta de nuevo.'
}

export default function Roles() {
  const { usuario, esSuperAdmin } = useAuth()
  const [admins, setAdmins] = useState([])
  const [nuevo, setNuevo] = useState(NUEVO_INICIAL)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmando, setConfirmando] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'administrador'))
    return onSnapshot(q, (snap) => setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {})
  }, [])

  const haySuperAdmin = admins.some((a) => a.superadmin === true)

  async function crearAdministrador(e) {
    e.preventDefault()
    setError('')
    setAviso('')
    const errorContrasena = validarContrasena(nuevo.contrasena)
    if (errorContrasena) {
      setError(errorContrasena)
      return
    }
    setCreando(true)
    try {
      // El perfil se guarda mientras la sesión auxiliar está abierta; si falla, la cuenta de acceso se anula.
      await crearUsuarioAuxiliar(nuevo.email.trim(), nuevo.contrasena, (uid) =>
        setDoc(doc(db, 'usuarios', uid), {
          email: nuevo.email.trim(),
          nombre: nuevo.nombre.trim(),
          telefono: nuevo.telefono.trim(),
          rol: 'administrador',
          estado: 'activo',
          fotoUrl: '',
          creadoPor: usuario.uid,
          fechaRegistro: serverTimestamp(),
        })
      )
      setAviso(`Se creó la cuenta de administrador de ${nuevo.nombre.trim()}. Compártele su correo y la contraseña inicial.`)
      setNuevo(NUEVO_INICIAL)
    } catch (err) {
      setError(mensajeCrear(err))
    } finally {
      setCreando(false)
    }
  }

  async function quitarAdministrador(a) {
    setError('')
    setAviso('')
    try {
      await deleteDoc(doc(db, 'usuarios', a.id))
      setAviso(`Se quitó el acceso de administrador a ${a.nombre || a.email}.`)
    } catch (err) {
      setError(mensajeErrorBloqueo(err))
    }
    setConfirmando(null)
  }

  return (
    <div>
      <h1 className="web-h1">Permisos por rol</h1>
      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', maxWidth: 1100 }}>
        <div className="card-plain">
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Paciente</div>
          <div className="chip-row">
            <div className="chip on">Ver doctores</div><div className="chip on">Mensajes</div>
            <div className="chip on">Calificar</div><div className="chip on">Denunciar</div>
          </div>
        </div>
        <div className="card-plain">
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Doctor</div>
          <div className="chip-row">
            <div className="chip on">Editar perfil</div><div className="chip on">Trabajos</div>
            <div className="chip on">Horario</div><div className="chip on">Denunciar</div>
          </div>
        </div>
        <div className="card-plain">
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Administrador</div>
          <div className="chip-row">
            <div className="chip on">Aprobar registros</div><div className="chip on">Bloquear</div>
            <div className="chip on">Categorías</div><div className="chip on">Denuncias</div>
          </div>
        </div>
        <div className="card-plain" style={{ borderColor: 'var(--oro)' }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Super admin</div>
          <div className="chip-row">
            <div className="chip on">Todo lo del administrador</div>
            <div className="chip on">Crear administradores</div>
          </div>
        </div>
      </div>

      <h2 className="section-title">Administradores con acceso</h2>
      {aviso && <div className="banner-ok" role="status" data-testid="aviso-ok">{aviso}</div>}
      {!haySuperAdmin && (
        <div className="banner-error" data-testid="sin-superadmin">
          Todavía no hay ninguna cuenta marcada como super admin, así que nadie puede crear administradores. Para
          habilitarlo, abre en Firebase Console → Firestore el documento <code>usuarios/&lt;uid del super admin&gt;</code> y
          agrégale el campo <code>superadmin</code> = <code>true</code> (booleano).
        </div>
      )}

      <div className="card-plain" style={{ maxWidth: 760 }}>
        {admins.map((a) => (
          <div className="admin-row" key={a.id}>
            <div>
              <div style={{ fontSize: 13 }}>
                {a.nombre || a.email}
                {a.superadmin === true
                  ? <span className="status-pill status-pending" style={{ marginLeft: 8 }}>Super admin</span>
                  : <span className="status-pill status-active" style={{ marginLeft: 8 }}>Administrador</span>}
              </div>
              <div className="rank-meta">{a.email}{a.fechaRegistro && ` · desde ${formatearFecha(a.fechaRegistro)}`}</div>
            </div>
            {esSuperAdmin && a.superadmin !== true && (
              confirmando === a.id ? (
                <span style={{ display: 'inline-flex', gap: 6 }}>
                  <button type="button" className="mini-btn" onClick={() => setConfirmando(null)}>Cancelar</button>
                  <button type="button" className="mini-btn danger" onClick={() => quitarAdministrador(a)}>Confirmar</button>
                </span>
              ) : (
                <button type="button" className="mini-btn danger" onClick={() => setConfirmando(a.id)}>Quitar acceso</button>
              )
            )}
          </div>
        ))}
        {admins.length === 0 && <p className="web-sub" style={{ marginBottom: 0 }}>No hay administradores registrados aún.</p>}
      </div>

      {esSuperAdmin ? (
        <form className="card-plain" style={{ maxWidth: 760, marginTop: 16 }} onSubmit={crearAdministrador} data-testid="form-crear-admin">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Crear cuenta de administrador</div>
          <div className="web-sub" style={{ marginBottom: 8 }}>
            Solo el super admin puede hacerlo. La cuenta queda activa de inmediato; comparte con la persona su correo y
            la contraseña inicial, y que la cambie desde Configuración.
          </div>
          <div className="campos-2col">
            <div>
              <label className="campo-label" htmlFor="adm-nombre">Nombre completo</label>
              <input id="adm-nombre" type="text" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="campo-label" htmlFor="adm-telefono">Celular</label>
              <input id="adm-telefono" type="text" value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} />
            </div>
            <div>
              <label className="campo-label" htmlFor="adm-email">Correo</label>
              <input id="adm-email" type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} required />
            </div>
            <div>
              <label className="campo-label" htmlFor="adm-clave">Contraseña inicial</label>
              <input id="adm-clave" type="password" value={nuevo.contrasena} onChange={(e) => setNuevo({ ...nuevo, contrasena: e.target.value })} required />
              <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>Mínimo 8 caracteres, con letras y números.</div>
            </div>
          </div>
          {error && <div className="registro-error" role="alert" data-testid="error-crear-admin">{error}</div>}
          <button type="submit" className="btn btn-primary btn-auto" style={{ marginTop: 14 }} disabled={creando}>
            {creando ? 'Creando…' : 'Crear administrador'}
          </button>
        </form>
      ) : (
        <div className="registro-aviso" style={{ maxWidth: 760, marginTop: 16 }} data-testid="solo-superadmin">
          Solo el <strong>super admin</strong> puede crear cuentas de administrador. Si necesitas una nueva, pídesela a él.
        </div>
      )}
    </div>
  )
}
