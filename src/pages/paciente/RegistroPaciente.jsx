import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import SelectorFotos from '../../components/SelectorFotos'
import CampoContrasena from '../../components/CampoContrasena'
import { nombreSeguro, subirArchivo } from '../../utils/archivos'
import { AYUDA_CONTRASENA, validarContrasena } from '../../utils/validacion'

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

const OBLIGATORIOS = ['email', 'celular', 'contrasena', 'confirmarContrasena', 'nombre', 'apellido', 'edad', 'estatura', 'peso', 'lugar']

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

function CampoError({ campo, faltantes }) {
  if (!faltantes.includes(campo)) return null
  return <div style={{ fontSize: 11, color: 'var(--alerta)', marginTop: 4 }}>Este campo es obligatorio.</div>
}

export default function RegistroPaciente() {
  const [datos, setDatos] = useState(ESTADO_INICIAL)
  const [fotos, setFotos] = useState([])
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [mostrarTerminos, setMostrarTerminos] = useState(false)
  const [error, setError] = useState('')
  const [faltantes, setFaltantes] = useState([])
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

  function actualizarCelular(e) {
    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 8)
    setDatos((prev) => ({ ...prev, celular: soloNumeros }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // TODO: volver a exigir la foto de perfil en cuanto Storage esté disponible (plan Blaze activado).
    const camposFaltantes = OBLIGATORIOS.filter((campo) => !String(datos[campo]).trim())
    setFaltantes(camposFaltantes)
    if (camposFaltantes.length > 0) {
      setError('Complete todos los campos obligatorios antes de continuar (marcados en rojo).')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (datos.celular.length !== 8) {
      setError('El celular debe tener 8 dígitos.')
      setFaltantes(['celular'])
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const errorContrasena = validarContrasena(datos.contrasena)
    if (errorContrasena) {
      setError(errorContrasena)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (datos.contrasena !== datos.confirmarContrasena) {
      setError('Las contraseñas no coinciden.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!aceptaTerminos) {
      setError('Debe aceptar los términos y condiciones para continuar.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setEnviando(true)
    try {
      const credencial = await createUserWithEmailAndPassword(auth, datos.email, datos.contrasena)
      const uid = credencial.user.uid

      // La foto es opcional por ahora (Storage aún no está habilitado): si falla la subida,
      // seguimos el registro sin foto en vez de bloquearlo.
      let fotoUrl = ''
      if (fotos.length > 0) {
        try {
          const subida = await subirArchivo(`usuarios/${uid}/perfil-${Date.now()}-${nombreSeguro(fotos[0].name)}`, fotos[0])
          fotoUrl = subida.url
        } catch {
          fotoUrl = ''
        }
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
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
                    <input id="email" type="email" placeholder="tu@correo.com" value={datos.email} onChange={actualizarCampo('email')} />
                    <CampoError campo="email" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="celular">Celular (8 dígitos)</label>
                    <input id="celular" type="text" inputMode="numeric" placeholder="7XXXXXXX" value={datos.celular} onChange={actualizarCelular} />
                    <CampoError campo="celular" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="contrasena">Contraseña</label>
                    <CampoContrasena id="contrasena" placeholder="••••••••" value={datos.contrasena} onChange={actualizarCampo('contrasena')} />
                    <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>{AYUDA_CONTRASENA}</div>
                    <CampoError campo="contrasena" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="confirmarContrasena">Confirmar contraseña</label>
                    <CampoContrasena id="confirmarContrasena" placeholder="Repita la contraseña" value={datos.confirmarContrasena} onChange={actualizarCampo('confirmarContrasena')} />
                    <CampoError campo="confirmarContrasena" faltantes={faltantes} />
                  </div>
                </div>
              </div>

              <div className="registro-seccion">
                <h2 className="seccion-titulo">Datos personales</h2>
                <div className="campos-2col">
                  <div>
                    <label className="campo-label" htmlFor="nombre">Nombre</label>
                    <input id="nombre" type="text" placeholder="Camila" value={datos.nombre} onChange={actualizarCampo('nombre')} />
                    <CampoError campo="nombre" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="apellido">Apellido</label>
                    <input id="apellido" type="text" placeholder="Rojas Peña" value={datos.apellido} onChange={actualizarCampo('apellido')} />
                    <CampoError campo="apellido" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="edad">Edad</label>
                    <input id="edad" type="number" min="0" placeholder="29" value={datos.edad} onChange={actualizarCampo('edad')} />
                    <CampoError campo="edad" faltantes={faltantes} />
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
                    <input id="estatura" type="text" placeholder="1.63 m" value={datos.estatura} onChange={actualizarCampo('estatura')} />
                    <CampoError campo="estatura" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="peso">Peso aprox.</label>
                    <input id="peso" type="text" placeholder="58 kg" value={datos.peso} onChange={actualizarCampo('peso')} />
                    <CampoError campo="peso" faltantes={faltantes} />
                  </div>
                </div>
                <label className="campo-label" htmlFor="lugar">Lugar donde vive</label>
                <input id="lugar" type="text" placeholder="Quillacollo, Cochabamba" value={datos.lugar} onChange={actualizarCampo('lugar')} />
                <CampoError campo="lugar" faltantes={faltantes} />
              </div>
            </div>

            <div>
              <div className="registro-seccion">
                <h2 className="seccion-titulo">Foto de perfil (opcional por ahora)</h2>
                <SelectorFotos
                  archivos={fotos}
                  onChange={setFotos}
                  maximo={1}
                  textoBoton="Subir foto de perfil"
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
