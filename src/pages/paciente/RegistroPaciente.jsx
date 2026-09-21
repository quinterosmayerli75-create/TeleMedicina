import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import SelectorFotos from '../../components/SelectorFotos'
import { mensajeErrorSubida, nombreSeguro, subirArchivo } from '../../utils/archivos'
import { validarContrasena } from '../../utils/validacion'

function mensajeError(codigo) {
  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese correo.'
    case 'auth/invalid-email':
      return 'El correo no es válido.'
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.'
    default:
      return 'No se pudo crear la cuenta. Intenta de nuevo.'
  }
}

const ESTADO_INICIAL = {
  email: '',
  celular: '',
  contrasena: '',
  confirmarContrasena: '',
  nombre: '',
  apellido: '',
  edad: '',
  sexo: 'Femenino',
  estatura: '',
  peso: '',
  lugar: '',
}

export default function RegistroPaciente() {
  const [datos, setDatos] = useState(ESTADO_INICIAL)
  const [fotos, setFotos] = useState([])
  const [intentado, setIntentado] = useState(false)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [mostrarTerminos, setMostrarTerminos] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const navigate = useNavigate()
  const { usuario, rol, cargando, refrescarRol } = useAuth()

  useEffect(() => {
    // Mientras se está creando la cuenta, el propio submit decide a dónde ir.
    if (!cargando && usuario && rol === 'paciente' && !enviando) {
      navigate('/paciente', { replace: true })
    }
  }, [usuario, rol, cargando, enviando, navigate])

  function actualizarCampo(campo) {
    return (e) => setDatos((prev) => ({ ...prev, [campo]: e.target.value }))
  }

  function camposIncompletos() {
    const obligatorios = ['email', 'celular', 'contrasena', 'confirmarContrasena', 'nombre', 'apellido', 'edad', 'estatura', 'peso', 'lugar']
    return obligatorios.some((campo) => !String(datos[campo]).trim())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIntentado(true)

    if (fotos.length === 0) {
      setError('La foto de perfil es obligatoria. Suba una foto suya para poder crear la cuenta.')
      return
    }
    if (camposIncompletos()) {
      setError('Complete todos los campos obligatorios antes de continuar.')
      return
    }

    const errorContrasena = validarContrasena(datos.contrasena)
    if (errorContrasena) {
      setError(errorContrasena)
      return
    }
    if (datos.contrasena !== datos.confirmarContrasena) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!aceptaTerminos) {
      setError('Debe aceptar los términos y condiciones para continuar.')
      return
    }

    setEnviando(true)
    try {
      const credencial = await createUserWithEmailAndPassword(auth, datos.email, datos.contrasena)
      const uid = credencial.user.uid

      // La foto es obligatoria: si no se puede subir se anula la cuenta recién creada para que pueda
      // reintentar con el mismo correo en vez de quedar una cuenta sin foto.
      let fotoUrl
      try {
        const subida = await subirArchivo(`usuarios/${uid}/perfil-${Date.now()}-${nombreSeguro(fotos[0].name)}`, fotos[0])
        fotoUrl = subida.url
      } catch (errSubida) {
        await credencial.user.delete().catch(() => {})
        setError(`No se pudo subir la foto, por eso la cuenta no se creó. ${mensajeErrorSubida(errSubida)}`)
        setEnviando(false)
        return
      }

      await setDoc(doc(db, 'usuarios', uid), {
        email: datos.email,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.celular,
        edad: datos.edad ? Number(datos.edad) : null,
        sexo: datos.sexo,
        estatura: datos.estatura,
        peso: datos.peso,
        lugar: datos.lugar,
        rol: 'paciente',
        estado: 'activo',
        fotoUrl,
        fechaRegistro: serverTimestamp(),
      })

      await refrescarRol(uid)
      navigate('/paciente', { replace: true })
    } catch (err) {
      setError(mensajeError(err.code))
      setEnviando(false)
    }
  }

  return (
    <div className="registro-fondo">
      <div className="registro-card">
        <h1 className="registro-titulo">Registro de paciente</h1>
        <p className="registro-sub">Sus datos se usan para que el doctor pueda emitir su informe médico.</p>
        {error && (
          <div style={{ background: '#F7ECEB', borderLeft: '3px solid var(--alerta)', padding: 14, marginBottom: 20, color: '#5c3330', fontSize: 13.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="registro-grid">
            <div>
              <div className="registro-seccion">
                <h2 className="seccion-titulo">Datos de acceso</h2>
                <div className="campos-2col">
                  <div>
                    <label className="campo-label" htmlFor="email">Correo electrónico</label>
                    <input id="email" type="email" placeholder="tu@correo.com" value={datos.email} onChange={actualizarCampo('email')} required />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="celular">Celular</label>
                    <input id="celular" type="text" placeholder="+591 7XXXXXXX" value={datos.celular} onChange={actualizarCampo('celular')} required />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="contrasena">Contraseña</label>
                    <input id="contrasena" type="password" placeholder="••••••••" value={datos.contrasena} onChange={actualizarCampo('contrasena')} required />
                    <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>Mínimo 8 caracteres, con letras y números.</div>
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="confirmarContrasena">Confirmar contraseña</label>
                    <input id="confirmarContrasena" type="password" placeholder="Repita la contraseña" value={datos.confirmarContrasena} onChange={actualizarCampo('confirmarContrasena')} required />
                  </div>
                </div>
              </div>

              <div className="registro-seccion">
                <h2 className="seccion-titulo">Datos personales</h2>
                <div className="campos-2col">
                  <div>
                    <label className="campo-label" htmlFor="nombre">Nombre</label>
                    <input id="nombre" type="text" placeholder="Camila" value={datos.nombre} onChange={actualizarCampo('nombre')} required />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="apellido">Apellido</label>
                    <input id="apellido" type="text" placeholder="Rojas Peña" value={datos.apellido} onChange={actualizarCampo('apellido')} required />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="edad">Edad</label>
                    <input id="edad" type="number" min="0" placeholder="29" value={datos.edad} onChange={actualizarCampo('edad')} required />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="sexo">Sexo</label>
                    <select id="sexo" value={datos.sexo} onChange={actualizarCampo('sexo')}>
                      <option>Femenino</option>
                      <option>Masculino</option>
                    </select>
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="estatura">Estatura aprox.</label>
                    <input id="estatura" type="text" placeholder="1.63 m" value={datos.estatura} onChange={actualizarCampo('estatura')} required />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="peso">Peso aprox.</label>
                    <input id="peso" type="text" placeholder="58 kg" value={datos.peso} onChange={actualizarCampo('peso')} required />
                  </div>
                </div>
                <label className="campo-label" htmlFor="lugar">Lugar donde vive</label>
                <input id="lugar" type="text" placeholder="Quillacollo, Cochabamba" value={datos.lugar} onChange={actualizarCampo('lugar')} required />
              </div>
            </div>

            <div>
              <div className="registro-seccion">
                <h2 className="seccion-titulo">Foto de perfil (obligatoria)</h2>
                <SelectorFotos
                  archivos={fotos}
                  onChange={setFotos}
                  maximo={1}
                  textoBoton="Subir foto de perfil"
                  obligatoria
                  resaltar={intentado}
                  nombre="La foto de perfil"
                  ayuda="JPG o PNG, máximo 5 MB. Podrás cambiarla después en Configuración."
                  deshabilitado={enviando}
                />
              </div>

              <div className="terminos-row">
                <input
                  type="checkbox"
                  id="chk-terminos"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                />
                <div>
                  <label htmlFor="chk-terminos">Acepto los términos y condiciones.</label>
                  <div style={{ marginTop: 6 }}>
                    <span className="terminos-link" onClick={() => setMostrarTerminos(true)}>Ver términos y condiciones</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={enviando} style={{ marginTop: 12 }}>
                {enviando ? 'Creando cuenta…' : 'Crear mi cuenta'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Link to="/acceso" className="terminos-link">¿Ya tiene cuenta? Inicie sesión</Link>
              </div>
            </div>
          </div>
        </form>
      </div>

      {mostrarTerminos && (
        <div className="modal-fondo" onClick={() => setMostrarTerminos(false)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <h2 className="seccion-titulo" style={{ marginTop: 0 }}>Términos y condiciones</h2>
            <p className="terminos-texto">
              1. DocTop es una plataforma de intermediación: conecta pacientes con profesionales verificados,
              pero no presta servicios médicos ni se responsabiliza por diagnósticos o tratamientos.
              <br /><br />
              2. Los datos de salud que comparta (edad, peso, estatura) se usan para que el profesional pueda
              elaborar su informe médico y no se venden a terceros.
              <br /><br />
              3. El paciente se compromete a un trato respetuoso. Denuncias confirmadas por acoso derivan en
              la suspensión de la cuenta.
              <br /><br />
              4. Los pagos por consulta se acuerdan directamente con el profesional; DocTop no interviene en ese cobro.
              <br /><br />
              5. Las conversaciones pueden ser revisadas por el equipo de DocTop únicamente ante una denuncia formal.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setMostrarTerminos(false)}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  )
}
