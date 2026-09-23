import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import SelectorFotos from '../../components/SelectorFotos'
import CampoContrasena from '../../components/CampoContrasena'
import { nombreSeguro, subirArchivo } from '../../utils/archivos'
import { AYUDA_CONTRASENA, validarContrasena } from '../../utils/validacion'

const PROFESIONES = ['Médico', 'Odontólogo', 'Psicólogo', 'Nutricionista']
const ESPECIALIDADES = ['Cardiología', 'Odontología', 'Psicología', 'Medicina general']
const MODALIDADES = [
  { clave: 'chat', etiqueta: 'Chat de texto' },
  { clave: 'llamada', etiqueta: 'Llamada de voz' },
  { clave: 'video', etiqueta: 'Videollamada' },
]
const OBLIGATORIOS = ['email', 'celular', 'contrasena', 'confirmarContrasena', 'nombre', 'edad', 'estatura', 'peso', 'carnet', 'experiencia', 'descripcion', 'costoConsulta']

function mensajeError(codigo) {
  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con ese correo.'
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.'
    default:
      return 'No se pudo crear la cuenta. Intenta de nuevo.'
  }
}

const ESTADO_INICIAL = {
  email: '', celular: '', contrasena: '', confirmarContrasena: '',
  nombre: '', edad: '', estatura: '', peso: '', profesion: PROFESIONES[0], especialidad: ESPECIALIDADES[0],
  experiencia: '', carnet: '', descripcion: '', costoConsulta: '',
}

function CampoError({ campo, faltantes }) {
  if (!faltantes.includes(campo)) return null
  return <div style={{ fontSize: 11, color: 'var(--alerta)', marginTop: 4 }}>Este campo es obligatorio.</div>
}

export default function RegistroProfesional() {
  const [datos, setDatos] = useState(ESTADO_INICIAL)
  const [fotoPerfil, setFotoPerfil] = useState([])
  const [fotosTitulos, setFotosTitulos] = useState([])
  const [fotoCarnet, setFotoCarnet] = useState([])
  const [modalidades, setModalidades] = useState({ chat: true, llamada: true, video: false })
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [mostrarTerminos, setMostrarTerminos] = useState(false)
  const [error, setError] = useState('')
  const [faltantes, setFaltantes] = useState([])
  const [enviando, setEnviando] = useState(false)

  const navigate = useNavigate()

  function actualizarCampo(campo) {
    return (e) => setDatos((prev) => ({ ...prev, [campo]: e.target.value }))
  }

  function actualizarCelular(e) {
    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 8)
    setDatos((prev) => ({ ...prev, celular: soloNumeros }))
  }

  async function subirSiExiste(archivo, uid, etiqueta) {
    if (!archivo) return ''
    const { url } = await subirArchivo(`profesionales/${uid}/${etiqueta}-${Date.now()}-${nombreSeguro(archivo.name)}`, archivo)
    return url
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // TODO: volver a exigir las 3 fotos (fotoPerfil, fotosTitulos, fotoCarnet) en cuanto Storage
    // esté disponible (plan Blaze activado). Mientras tanto no bloqueamos el registro por esto.
    const camposFaltantes = OBLIGATORIOS.filter((campo) => !String(datos[campo]).trim())
    setFaltantes(camposFaltantes)
    if (camposFaltantes.length > 0) {
      setError('Complete todos los campos obligatorios antes de enviar la solicitud (marcados en rojo).')
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

      // Las fotos son opcionales por ahora (Storage aún no está habilitado): si falla la subida,
      // seguimos el registro sin esa foto en vez de bloquearlo.
      let fotoUrl = ''
      let titulosUrls = []
      let fotoCarnetUrl = ''
      try {
        ;[fotoUrl, titulosUrls, fotoCarnetUrl] = await Promise.all([
          subirSiExiste(fotoPerfil[0], uid, 'perfil'),
          Promise.all(fotosTitulos.map((foto, i) => subirSiExiste(foto, uid, `titulo-${i + 1}`))),
          subirSiExiste(fotoCarnet[0], uid, 'carnet'),
        ])
      } catch {
        // Storage no disponible todavía: no interrumpimos el registro, solo quedan sin foto.
        fotoUrl = ''
        titulosUrls = []
        fotoCarnetUrl = ''
      }

      await setDoc(doc(db, 'usuarios', uid), {
        email: datos.email,
        nombre: datos.nombre,
        telefono: datos.celular,
        edad: Number(datos.edad),
        estatura: datos.estatura,
        peso: datos.peso,
        rol: 'profesional',
        estado: 'pendiente',
        fotoUrl,
        fechaRegistro: serverTimestamp(),
      })

      await setDoc(doc(db, 'profesionales', uid), {
        profesion: datos.profesion,
        especialidad: datos.especialidad,
        experiencia: datos.experiencia,
        descripcion: datos.descripcion,
        carnet: datos.carnet,
        costoConsulta: datos.costoConsulta ? Number(datos.costoConsulta) : 0,
        calificacionPromedio: 0,
        verificado: false,
        disponibleAhora: false,
        modalidades: [modalidades.chat, modalidades.llamada, modalidades.video],
        disponibilidad: {},
        titulos: titulosUrls,
        documentosVerificacion: [...titulosUrls, fotoCarnetUrl].filter(Boolean),
      })

      navigate('/', { state: { solicitudEnviada: true } })
    } catch (err) {
      setError(mensajeError(err.code))
      setEnviando(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="registro-fondo">
      <div className="registro-card">
        <h1 className="registro-titulo">Registro profesional</h1>
        <p className="registro-sub">DocTop es 100% virtual: complete sus datos para atender consultas a distancia.</p>
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
                    <input id="email" type="email" value={datos.email} onChange={actualizarCampo('email')} />
                    <CampoError campo="email" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="celular">Celular (8 dígitos)</label>
                    <input id="celular" type="text" inputMode="numeric" placeholder="7XXXXXXX" value={datos.celular} onChange={actualizarCelular} />
                    <CampoError campo="celular" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="contrasena">Contraseña</label>
                    <CampoContrasena id="contrasena" value={datos.contrasena} onChange={actualizarCampo('contrasena')} />
                    <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>{AYUDA_CONTRASENA}</div>
                    <CampoError campo="contrasena" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="confirmarContrasena">Confirmar contraseña</label>
                    <CampoContrasena id="confirmarContrasena" value={datos.confirmarContrasena} onChange={actualizarCampo('confirmarContrasena')} />
                    <CampoError campo="confirmarContrasena" faltantes={faltantes} />
                  </div>
                </div>
              </div>

              <div className="registro-seccion">
                <h2 className="seccion-titulo">Datos personales</h2>
                <div className="campos-2col">
                  <div>
                    <label className="campo-label" htmlFor="edad">Edad</label>
                    <input id="edad" type="number" min="18" placeholder="35" value={datos.edad} onChange={actualizarCampo('edad')} />
                    <CampoError campo="edad" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="estatura">Estatura aprox.</label>
                    <input id="estatura" type="text" placeholder="1.70 m" value={datos.estatura} onChange={actualizarCampo('estatura')} />
                    <CampoError campo="estatura" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="peso">Peso aprox.</label>
                    <input id="peso" type="text" placeholder="72 kg" value={datos.peso} onChange={actualizarCampo('peso')} />
                    <CampoError campo="peso" faltantes={faltantes} />
                  </div>
                </div>
              </div>

              <div className="registro-seccion">
                <h2 className="seccion-titulo">Datos profesionales</h2>
                <label className="campo-label" htmlFor="nombre">Nombre completo</label>
                <input id="nombre" type="text" placeholder="Dr./Dra. Nombre Apellido" value={datos.nombre} onChange={actualizarCampo('nombre')} />
                <CampoError campo="nombre" faltantes={faltantes} />
                <div className="campos-2col">
                  <div>
                    <label className="campo-label" htmlFor="profesion">Profesión</label>
                    <select id="profesion" value={datos.profesion} onChange={actualizarCampo('profesion')}>
                      {PROFESIONES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="especialidad">Especialidad</label>
                    <select id="especialidad" value={datos.especialidad} onChange={actualizarCampo('especialidad')}>
                      {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="carnet">Carnet profesional</label>
                    <input id="carnet" type="text" placeholder="CP-4821-CB" value={datos.carnet} onChange={actualizarCampo('carnet')} />
                    <CampoError campo="carnet" faltantes={faltantes} />
                  </div>
                  <div>
                    <label className="campo-label" htmlFor="experiencia">Experiencia</label>
                    <input id="experiencia" type="text" placeholder="5 años de experiencia clínica" value={datos.experiencia} onChange={actualizarCampo('experiencia')} />
                    <CampoError campo="experiencia" faltantes={faltantes} />
                  </div>
                </div>
                <label className="campo-label" htmlFor="descripcion">Descripción profesional</label>
                <textarea id="descripcion" rows="3" placeholder="Cuénteles a sus pacientes en qué se especializa…" value={datos.descripcion} onChange={actualizarCampo('descripcion')} />
                <CampoError campo="descripcion" faltantes={faltantes} />
                <label className="campo-label" htmlFor="costoConsulta">Costo de la consulta (Bs)</label>
                <input id="costoConsulta" type="number" placeholder="150" value={datos.costoConsulta} onChange={actualizarCampo('costoConsulta')} />
                <CampoError campo="costoConsulta" faltantes={faltantes} />

                <div style={{ marginTop: 14 }}>
                  <label className="campo-label">Foto de perfil (opcional por ahora)</label>
                  <SelectorFotos
                    archivos={fotoPerfil}
                    onChange={setFotoPerfil}
                    maximo={1}
                    textoBoton="Subir foto de perfil"
                    nombre="La foto de perfil"
                    deshabilitado={enviando}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="campo-label">Fotos de sus títulos (opcional por ahora)</label>
                  <SelectorFotos
                    archivos={fotosTitulos}
                    onChange={setFotosTitulos}
                    maximo={6}
                    textoBoton="Subir fotos de títulos"
                    nombre="Las fotos de sus títulos"
                    ayuda="Puede subir varios títulos o certificados; los pacientes los verán en su perfil."
                    deshabilitado={enviando}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="campo-label">Foto del carnet profesional (opcional por ahora)</label>
                  <SelectorFotos
                    archivos={fotoCarnet}
                    onChange={setFotoCarnet}
                    maximo={1}
                    textoBoton="Subir foto del carnet"
                    nombre="La foto del carnet profesional"
                    deshabilitado={enviando}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="registro-seccion" style={{ borderColor: 'var(--oro)' }}>
                <h2 className="seccion-titulo">Modalidades de atención</h2>
                {MODALIDADES.map((m) => (
                  <div className="admin-row" key={m.clave}>
                    <label style={{ fontSize: 12.5 }}>
                      <input
                        type="checkbox"
                        checked={modalidades[m.clave]}
                        onChange={(e) => setModalidades((prev) => ({ ...prev, [m.clave]: e.target.checked }))}
                      /> {m.etiqueta}
                    </label>
                  </div>
                ))}
              </div>

              <div style={{ background: '#EAF3FA', borderLeft: '2px solid var(--oro)', padding: 12, fontSize: 11.5, lineHeight: 1.6, color: '#3a4750' }}>
                No hay membresía ni pago para registrarse. Un administrador de DocTop revisará su carnet
                profesional y sus documentos antes de activar su cuenta.
              </div>

              <div className="terms-row">
                <input type="checkbox" id="chk-terminos" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} />
                <div>
                  <label htmlFor="chk-terminos">Acepto los términos y condiciones.</label>
                  <div style={{ marginTop: 6 }}>
                    <span className="terminos-link" onClick={() => setMostrarTerminos(true)}>Ver términos y condiciones</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={enviando} style={{ marginTop: 12 }}>
                {enviando ? 'Enviando…' : 'Enviar solicitud de registro'}
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
              1. DocTop es una plataforma de intermediación 100% virtual: no presta servicios médicos ni se
              responsabiliza por diagnósticos o tratamientos acordados entre doctor y paciente.
              <br /><br />
              2. El profesional declara que los datos, título y carnet subidos son auténticos. La falsificación
              implica la anulación definitiva de la cuenta.
              <br /><br />
              3. El registro no tiene costo. El paciente paga por cada consulta directamente al momento de
              solicitarla.
              <br /><br />
              4. El profesional se compromete a un trato respetuoso. Denuncias confirmadas por acoso derivan
              en bloqueo definitivo.
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
