import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import CampoContrasena from '../../components/CampoContrasena'
import './Acceso.css'

const RUTA_POR_ROL = {
  paciente: '/paciente',
  profesional: '/doctor',
  administrador: '/admin',
}

function mensajeError(codigo) {
  switch (codigo) {
    case 'auth/invalid-email':
      return 'El correo no es válido.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta de nuevo en unos minutos.'
    default:
      return 'No se pudo iniciar sesión. Intenta de nuevo.'
  }
}

export default function Acceso() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const navigate = useNavigate()
  const { usuario, rol, cargando } = useAuth()

  useEffect(() => {
    if (!cargando && usuario && rol && RUTA_POR_ROL[rol]) {
      navigate(RUTA_POR_ROL[rol], { replace: true })
    }
  }, [usuario, rol, cargando, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!correo.trim() && !contrasena.trim()) {
      setError('Complete el correo y la contraseña.')
      return
    }
    if (!correo.trim()) {
      setError('Complete el correo electrónico.')
      return
    }
    if (!contrasena.trim()) {
      setError('Complete la contraseña.')
      return
    }

    setEnviando(true)
    try {
      await signInWithEmailAndPassword(auth, correo, contrasena)
    } catch (err) {
      setError(mensajeError(err.code))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="acceso-fondo">
      <div className="acceso-card">
        <div className="acceso-marca">
          <svg width="46" height="46" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--onyx)" strokeWidth="4" />
            <text x="50" y="61" textAnchor="middle" fontFamily="Playfair Display" fontSize="32" fill="var(--onyx)" fontWeight="600">DT</text>
          </svg>
          <div className="acceso-nombre">DOCTOP</div>
          <div className="acceso-slogan">Su especialista de confianza, en cualquier dispositivo</div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="campo-label" htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            type="text"
            placeholder="tu@correo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="email"
          />

          <label className="campo-label" htmlFor="contrasena">Contraseña</label>
          <CampoContrasena
            id="contrasena"
            placeholder="••••••••"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="current-password"
          />

          {error && <div className="acceso-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="acceso-divisor">¿Aún no tiene cuenta?</div>
        <Link to="/registro/paciente" className="btn btn-outline">Registrarme como paciente</Link>
        <Link to="/registro/profesional" className="btn btn-outline" style={{ marginTop: 10 }}>
          Registrarme como profesional de la salud
        </Link>
      </div>
    </div>
  )
}
