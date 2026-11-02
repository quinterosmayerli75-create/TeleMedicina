import Logo from '@/shared/components/Logo'
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/services/firebase/config'
import { useAuth } from '../context/AuthContext'
import CampoContrasena from '@/shared/components/CampoContrasena'
import InicioCarrusel from '@/shared/components/InicioCarrusel'
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
      <div className="acceso-tarjeta">
        <div className="acceso-panel">
          <div className="acceso-panel-top">
            <div className="acceso-panel-logo">
              <div className="mark" aria-hidden="true">DT</div>
              <div>
                <div className="word">DOCTOP</div>
                <div className="sub">Salud digital</div>
              </div>
            </div>
            <div className="acceso-panel-pill">Acceso a tu cuenta</div>
          </div>

          <div className="acceso-panel-tag">Personas que cuidan de personas</div>
          <h1>Qué bueno tenerte por aquí.</h1>
          <p>Habla con un profesional de la salud, resuelve tus dudas y cuídate desde donde estés.</p>

          <figure className="acceso-foto"><InicioCarrusel soloFotos /><figcaption>Tu próxima consulta, desde un lugar cómodo para ti.</figcaption></figure>

          <ul className="acceso-panel-badges" aria-label="Cómo te atendemos">
            <li className="acceso-panel-badge">Profesionales verificados</li>
            <li className="acceso-panel-badge">Chat, llamada o videollamada</li>
            <li className="acceso-panel-badge">Pago directo por QR</li>
          </ul>
        </div>

        <div className="acceso-formulario">
          <div className="acceso-card">
            <div className="acceso-marca">
              <Logo size={46} />
              <div className="acceso-nombre">DOCTOP</div>
              <div className="acceso-slogan">Bienvenido de nuevo — ingresa a tu cuenta</div>
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
                {enviando ? 'Ingresando…' : 'Iniciar sesión →'}
              </button>
            </form>

            <div className="acceso-divisor">¿Aún no tiene cuenta?</div>
            <div className="acceso-crear-cuenta">
              <p>Regístrate gratis como paciente o como profesional de la salud.</p>
            </div>
            <Link to="/registro" className="btn btn-outline" style={{ marginTop: 10 }}>Crear mi cuenta</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
