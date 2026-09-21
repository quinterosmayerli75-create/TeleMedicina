import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import SelectorFotos from '../../components/SelectorFotos'
import { mensajeErrorSubida, nombreSeguro, subirArchivo } from '../../utils/archivos'
import { validarContrasena } from '../../utils/validacion'

const PROFESIONES = ['Médico', 'Odontólogo', 'Psicólogo', 'Nutricionista']
const ESPECIALIDADES = ['Cardiología', 'Odontología', 'Psicología', 'Medicina general']
const MODALIDADES = [
  { clave: 'chat', etiqueta: 'Chat de texto' },
  { clave: 'llamada', etiqueta: 'Llamada de voz' },
  { clave: 'video', etiqueta: 'Videollamada' },
]

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

export default function RegistroProfesional() {
  const [datos, setDatos] = useState(ESTADO_INICIAL)
  const [fotoPerfil, setFotoPerfil] = useState([])
  const [fotosTitulos, setFotosTitulos] = useState([])
  const [fotoCarnet, setFotoCarnet] = useState([])
  const [intentado, setIntentado] = useState(false)
  const [modalidades, setModalidades] = useState({ chat: true, llamada: true, video: false })
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [mostrarTerminos, setMostrarTerminos] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const navigate = useNavigate()

  function actualizarCampo(campo) {
    return (e) => setDatos((prev) => ({ ...prev, [campo]: e.target.value }))
  }

  async function subirSiExiste(archivo, uid, etiqueta) {
    if (!archivo) return ''
    const { url } = await subirArchivo(`profesionales/${uid}/${etiqueta}-${Date.now()}-${nombreSeguro(archivo.name)}`, archivo)
    return url
  }

  function camposIncompletos() {
    const obligatorios = ['email', 'celular', 'contrasena', 'confirmarContrasena', 'nombre', 'edad', 'estatura', 'peso', 'carnet', 'experiencia', 'descripcion', 'costoConsulta']
    return obligatorios.some((campo) => !String(datos[campo]).trim())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIntentado(true)

    const faltantes = []
    if (fotoPerfil.length === 0) faltantes.push('la foto de perfil')
    if (fotosTitulos.length === 0) faltantes.push('al menos una foto de sus títulos')
    if (fotoCarnet.length === 0) faltantes.push('la foto del carnet profesional')
    if (faltantes.length > 0) {
      setError(`Las fotos son obligatorias. Falta subir: ${faltantes.join(', ')}.`)
      return
    }
    if (camposIncompletos()) {
      setError('Complete todos los campos obligatorios antes de enviar la solicitud.')
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

      let fotoUrl
      let titulosUrls
      let fotoCarnetUrl
      try {
        ;[fotoUrl, titulosUrls, fotoCarnetUrl] = await Promise.all([
          subirSiExiste(fotoPerfil[0], uid, 'perfil'),
          Promise.all(fotosTitulos.map((foto, i) => subirSiExiste(foto, uid, `titulo-${i + 1}`))),
          subirSiExiste(fotoCarnet[0], uid, 'carnet'),
        ])
      } catch (errSubida) {
        // Sin las fotos la solicitud no se puede revisar: se anula la cuenta recién creada para que
        // pueda reintentar con el mismo correo en vez de quedar una cuenta a medias.
        await credencial.user.delete().catch(() => {})
        setError(`No se pudieron subir las fotos. ${mensajeErrorSubida(errSubida)}`)
        setEnviando(false)
        return
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
                  <div><label className="campo-label" htmlFor="email">Correo electrónico</label><input id="email" type="email" value={datos.email} onChange={actualizarCampo('email')} required /></div>
                  <div><label className="campo-label" htmlFor="celular">Celular</label><input id="celular" type="text" value={datos.celular} onChange={actualizarCampo('celular')} required /></div>
                  <div>
                    <label className="campo-label" htmlFor="contrasena">Contraseña</label>
                    <input id="contrasena" type="password" value={datos.contrasena} onChange={actualizarCampo('contrasena')} required />
                    <div style={{ fontSize: 10.5, color: 'var(--gris)', marginTop: 4 }}>Mínimo 8 caracteres, con letras y números.</div>
                  </div>
                  <div><label className="campo-label" htmlFor="confirmarContrasena">Confirmar contraseña</label><input id="confirmarContrasena" type="password" value={datos.confirmarContrasena} onChange={actualizarCampo('confirmarContrasena')} required /></div>
                </div>
              </div>

              <div className="registro-seccion">
                <h2 className="seccion-titulo">Datos personales</h2>
                <div className="campos-2col">
                  <div><label className="campo-label" htmlFor="edad">Edad</label><input id="edad" type="number" min="18" placeholder="35" value={datos.edad} onChange={actualizarCampo('edad')} required /></div>
                  <div><label className="campo-label" htmlFor="estatura">Estatura aprox.</label><input id="estatura" type="text" placeholder="1.70 m" value={datos.estatura} onChange={actualizarCampo('estatura')} required /></div>
                  <div><label className="campo-label" htmlFor="peso">Peso aprox.</label><input id="peso" type="text" placeholder="72 kg" value={datos.peso} onChange={actualizarCampo('peso')} required /></div>
                </div>
              </div>

              <div className="registro-seccion">
                <h2 className="seccion-titulo">Datos profesionales</h2>
                <label className="campo-label" htmlFor="nombre">Nombre completo</label>
                <input id="nombre" type="text" placeholder="Dr./Dra. Nombre Apellido" value={datos.nombre} onChange={actualizarCampo('nombre')} required />
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
                  <div><label className="campo-label" htmlFor="carnet">Carnet profesional</label><input id="carnet" type="text" placeholder="CP-4821-CB" value={datos.carnet} onChange={actualizarCampo('carnet')} required /></div>
                  <div><label className="campo-label" htmlFor="experiencia">Experiencia</label><input id="experiencia" type="text" placeholder="5 años de experiencia clínica" value={datos.experiencia} onChange={actualizarCampo('experiencia')} required /></div>
                </div>
                <label className="campo-label" htmlFor="descripcion">Descripción profesional</label>
                <textarea id="descripcion" rows="3" placeholder="Cuénteles a sus pacientes en qué se especializa…" value={datos.descripcion} onChange={actualizarCampo('descripcion')} required />
                <label className="campo-label" htmlFor="costoConsulta">Costo de la consulta (Bs)</label>
                <input id="costoConsulta" type="number" placeholder="150" value={datos.costoConsulta} onChange={actualizarCampo('costoConsulta')} required />

                <div style={{ marginTop: 14 }}>
                  <label className="campo-label">Foto de perfil (obligatoria)</label>
                  <SelectorFotos
                    archivos={fotoPerfil}
                    onChange={setFotoPerfil}
                    maximo={1}
                    textoBoton="Subir foto de perfil"
                    obligatoria
                    resaltar={intentado}
                    nombre="La foto de perfil"
                    deshabilitado={enviando}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="campo-label">Fotos de sus títulos (obligatorias)</label>
                  <SelectorFotos
                    archivos={fotosTitulos}
                    onChange={setFotosTitulos}
                    maximo={6}
                    textoBoton="Subir fotos de títulos"
                    obligatoria
                    resaltar={intentado}
                    nombre="Las fotos de sus títulos"
                    ayuda="Puede subir varios títulos o certificados; los pacientes los verán en su perfil."
                    deshabilitado={enviando}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  <label className="campo-label">Foto del carnet profesional (obligatoria)</label>
                  <SelectorFotos
                    archivos={fotoCarnet}
                    onChange={setFotoCarnet}
                    maximo={1}
                    textoBoton="Subir foto del carnet"
                    obligatoria
                    resaltar={intentado}
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
