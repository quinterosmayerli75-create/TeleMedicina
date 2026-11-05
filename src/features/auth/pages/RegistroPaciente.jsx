import Icono from '@/shared/components/Icono'
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '@/services/firebase/config'
import { useAuth } from '../context/AuthContext'
import SelectorFotos from '@/shared/components/SelectorFotos'
import CampoContrasena from '@/shared/components/CampoContrasena'
import CampoFecha from '@/shared/components/CampoFecha'
import CampoTelefono from '@/shared/components/CampoTelefono'
import EtiquetaCampo from '@/shared/components/EtiquetaCampo'
import { mensajeErrorSubida, nombreSeguro, subirArchivo } from '@/services/archivos'
import { AYUDA_CONTRASENA, validarContrasena, validarCorreo, validarNombre } from '@/shared/utils/validacion'
import { validarTelefono } from '@/shared/utils/telefonos'
import { calcularEdad } from '@/shared/utils/fechas'

const EDAD_MINIMA = 18

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

const OBLIGATORIOS = ['email', 'celular', 'contrasena', 'confirmarContrasena', 'nombre', 'apellido', 'fechaNacimiento', 'estatura', 'peso', 'lugar']
const HOY = new Date().toISOString().slice(0, 10)

const ESTADO_INICIAL = {
  email: '',
  celular: '',
  celularPais: 'BO',
  contrasena: '',
  confirmarContrasena: '',
  nombre: '',
  apellido: '',
  fechaNacimiento: '',
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

  function actualizarTelefono(valor) {
    setDatos((prev) => ({ ...prev, celularPais: valor.pais, celular: valor.numero }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const camposFaltantes = OBLIGATORIOS.filter((campo) => !String(datos[campo]).trim())
    if (fotos.length === 0) camposFaltantes.push('foto')
    setFaltantes(camposFaltantes)
    if (camposFaltantes.length > 0) {
      setError(
        camposFaltantes.includes('foto') && camposFaltantes.length === 1
          ? 'La foto de perfil es obligatoria. Suba una foto suya para poder crear la cuenta.'
          : 'Complete todos los campos obligatorios antes de continuar (marcados en rojo).'
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const errorNombre = validarNombre(datos.nombre) || validarNombre(datos.apellido)
    if (errorNombre) {
      setError(errorNombre)
      setFaltantes(['nombre', 'apellido'])
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const errorCorreo = validarCorreo(datos.email)
    if (errorCorreo) {
      setError(errorCorreo)
      setFaltantes(['email'])
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const errorTelefono = validarTelefono(datos.celularPais, datos.celular)
    if (errorTelefono) {
      setError(errorTelefono)
      setFaltantes(['celular'])
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (datos.fechaNacimiento > HOY) {
      setError('La fecha de nacimiento no puede ser futura.')
      setFaltantes(['fechaNacimiento'])
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (calcularEdad(datos.fechaNacimiento) < EDAD_MINIMA) {
      setError(`Debe ser mayor de edad (${EDAD_MINIMA} años) para registrarse.`)
      setFaltantes(['fechaNacimiento'])
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

      // La foto es obligatoria: si no se puede subir se anula la cuenta recién creada para que
      // pueda reintentar con el mismo correo en vez de quedar una cuenta sin foto.
      let fotoUrl
      try {
        const subida = await subirArchivo(`usuarios/${uid}/perfil-${Date.now()}-${nombreSeguro(fotos[0].name)}`, fotos[0])
        fotoUrl = subida.url
      } catch (errSubida) {
        await credencial.user.delete().catch(() => {})
        setError(`No se pudo subir la foto, por eso la cuenta no se creó. ${mensajeErrorSubida(errSubida)}`)
        setEnviando(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      await setDoc(doc(db, 'usuarios', uid), {
        email: datos.email,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.celular,
        fechaNacimiento: datos.fechaNacimiento,
        edad: calcularEdad(datos.fechaNacimiento),
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
        <div className="admin-eyebrow">
          <span className="vivo" style={{ color: 'var(--admin-accent-dark)' }}><Icono nombre="shield" size={19} /> PROTOCOLO DE REGISTRO CLÍNICO</span>
        </div>
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
                <h2 className="seccion-titulo"><Icono nombre="key" size={19} /> Datos de acceso</h2>
                <div className="campos-2col">
                  <div>
                    <EtiquetaCampo htmlFor="email">Correo electrónico</EtiquetaCampo>
                    <input id="email" type="email" placeholder="tu@correo.com" value={datos.email} onChange={actualizarCampo('email')} />
                    <CampoError campo="email" faltantes={faltantes} />
                  </div>
                  <div>
                    <EtiquetaCampo htmlFor="celular">Celular</EtiquetaCampo>
                    <CampoTelefono id="celular" value={{ pais: datos.celularPais, numero: datos.celular }} onChange={actualizarTelefono} />
                    <CampoError campo="celular" faltantes={faltantes} />
                  </div>
                  <div>
                    <EtiquetaCampo htmlFor="contrasena">Contraseña</EtiquetaCampo>
                    <CampoContrasena id="contrasena" placeholder="••••••••" value={datos.contrasena} onChange={actualizarCampo('contrasena')} />
                    <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>{AYUDA_CONTRASENA}</div>
                    <CampoError campo="contrasena" faltantes={faltantes} />
                  </div>
                  <div>
                    <EtiquetaCampo htmlFor="confirmarContrasena">Confirmar contraseña</EtiquetaCampo>
                    <CampoContrasena id="confirmarContrasena" placeholder="Repita la contraseña" value={datos.confirmarContrasena} onChange={actualizarCampo('confirmarContrasena')} />
                    <CampoError campo="confirmarContrasena" faltantes={faltantes} />
                  </div>
                </div>
              </div>

              <div className="registro-seccion">
                <h2 className="seccion-titulo"><Icono nombre="document" size={19} /> Datos personales</h2>
                <div className="campos-2col">
                  <div>
                    <EtiquetaCampo htmlFor="nombre">Nombre</EtiquetaCampo>
                    <input id="nombre" type="text" placeholder="Camila" value={datos.nombre} onChange={actualizarCampo('nombre')} />
                    <CampoError campo="nombre" faltantes={faltantes} />
                  </div>
                  <div>
                    <EtiquetaCampo htmlFor="apellido">Apellido</EtiquetaCampo>
                    <input id="apellido" type="text" placeholder="Rojas Peña" value={datos.apellido} onChange={actualizarCampo('apellido')} />
                    <CampoError campo="apellido" faltantes={faltantes} />
                  </div>
                  <div>
                    <EtiquetaCampo htmlFor="fechaNacimiento">Fecha de nacimiento</EtiquetaCampo>
                    <CampoFecha id="fechaNacimiento" max={HOY} value={datos.fechaNacimiento} onChange={actualizarCampo('fechaNacimiento')} />
                    <CampoError campo="fechaNacimiento" faltantes={faltantes} />
                  </div>
                  <div>
                    <EtiquetaCampo htmlFor="sexo" opcional>Sexo</EtiquetaCampo>
                    <select id="sexo" value={datos.sexo} onChange={actualizarCampo('sexo')}>
                      <option>Femenino</option>
                      <option>Masculino</option>
                    </select>
                  </div>
                  <div>
                    <EtiquetaCampo htmlFor="estatura">Estatura aprox.</EtiquetaCampo>
                    <input id="estatura" type="text" placeholder="1.63 m" value={datos.estatura} onChange={actualizarCampo('estatura')} />
                    <CampoError campo="estatura" faltantes={faltantes} />
                  </div>
                  <div>
                    <EtiquetaCampo htmlFor="peso">Peso aprox.</EtiquetaCampo>
                    <input id="peso" type="text" placeholder="58 kg" value={datos.peso} onChange={actualizarCampo('peso')} />
                    <CampoError campo="peso" faltantes={faltantes} />
                  </div>
                </div>
                <EtiquetaCampo htmlFor="lugar">Lugar donde vive</EtiquetaCampo>
                <input id="lugar" type="text" placeholder="Quillacollo, Cochabamba" value={datos.lugar} onChange={actualizarCampo('lugar')} />
                <CampoError campo="lugar" faltantes={faltantes} />
              </div>
            </div>

            <div>
              <div className="registro-seccion">
                <h2 className="seccion-titulo"><Icono nombre="image" size={19} /> Foto de perfil (obligatoria)</h2>
                <SelectorFotos
                  archivos={fotos}
                  onChange={setFotos}
                  maximo={1}
                  textoBoton="Subir foto de perfil"
                  obligatoria
                  resaltar={faltantes.includes('foto')}
                  nombre="La foto de perfil"
                  ayuda="JPG o PNG, máximo 5 MB. Podrás cambiarla después en Configuración."
                  deshabilitado={enviando}
                />
              </div>

              <div style={{ fontSize: 12.5, color: 'var(--gris)', marginBottom: 12 }}>
                <span style={{ color: 'var(--alerta)', fontSize: '1.3em', fontWeight: 700 }}>*</span> Campo obligatorio
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
