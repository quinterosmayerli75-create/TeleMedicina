import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { useInforme } from '../../hooks/useInformes'
import { nombreCompleto, usePaciente } from '../../hooks/usePaciente'
import SelectorPaciente from '../../components/SelectorPaciente'
import { fechaAInput, fechaDesdeInput, hoyInput } from '../../utils/informes'

function Formulario({ inicial, informeId, pacientePrefijado }) {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const editando = Boolean(informeId)

  const [paciente, setPaciente] = useState(inicial ? { id: inicial.pacienteId, nombre: inicial.pacienteNombre, edad: inicial.pacienteEdad, sexo: inicial.pacienteSexo } : pacientePrefijado)
  const [fecha, setFecha] = useState(inicial ? fechaAInput(inicial.fecha) : hoyInput())
  const [motivo, setMotivo] = useState(inicial?.motivo ?? '')
  const [diagnostico, setDiagnostico] = useState(inicial?.diagnostico ?? '')
  const [tratamiento, setTratamiento] = useState(inicial?.tratamiento ?? '')
  const [observaciones, setObservaciones] = useState(inicial?.observaciones ?? '')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (!paciente) return setError('Elige el paciente al que corresponde el informe.')
    if (!fechaDesdeInput(fecha)) return setError('Indica la fecha de la consulta.')
    if (!motivo.trim()) return setError('Escribe el motivo de la consulta.')
    if (!diagnostico.trim()) return setError('Escribe el diagnóstico.')

    setEnviando(true)
    try {
      const campos = {
        fecha: fechaDesdeInput(fecha),
        motivo: motivo.trim(),
        diagnostico: diagnostico.trim(),
        tratamiento: tratamiento.trim(),
        observaciones: observaciones.trim(),
      }
      if (editando) {
        await updateDoc(doc(db, 'informes', informeId), { ...campos, actualizadoEn: serverTimestamp() })
        navigate(`/doctor/informes/${informeId}`, { replace: true })
        return
      }
      // Se guardan los datos del doctor y del paciente dentro del informe: así el PDF siempre sale completo.
      const [usuarioSnap, profSnap] = await Promise.all([getDoc(doc(db, 'usuarios', usuario.uid)), getDoc(doc(db, 'profesionales', usuario.uid))])
      const datosUsuario = usuarioSnap.exists() ? usuarioSnap.data() : {}
      const datosProf = profSnap.exists() ? profSnap.data() : {}
      const referencia = await addDoc(collection(db, 'informes'), {
        doctorId: usuario.uid,
        doctorNombre: datosUsuario.nombre ?? '',
        doctorEspecialidad: datosProf.especialidad ?? '',
        doctorCarnet: datosProf.carnet ?? '',
        pacienteId: paciente.id,
        pacienteNombre: paciente.nombre,
        pacienteEdad: paciente.edad ?? null,
        pacienteSexo: paciente.sexo ?? '',
        ...campos,
        creadoEn: serverTimestamp(),
      })
      navigate(`/doctor/informes/${referencia.id}`, { replace: true })
    } catch (err) {
      setError(
        err?.code === 'permission-denied'
          ? 'Firestore rechazó el informe: hay que publicar las reglas de firestore.rules (ver README).'
          : 'No se pudo guardar el informe. Intenta de nuevo.'
      )
      setEnviando(false)
    }
  }

  return (
    <div>
      <span className="back-link" onClick={() => navigate(editando ? `/doctor/informes/${informeId}` : '/doctor/informes')}>← Volver</span>
      <div className="web-h1">{editando ? 'Editar informe médico' : 'Nuevo informe médico'}</div>
      <div className="web-sub">Lo que escribas queda guardado en tu menú de informes, y puedes descargarlo en PDF.</div>

      <form className="card-plain" style={{ maxWidth: 760 }} onSubmit={guardar}>
        <label className="campo-label">Paciente</label>
        <SelectorPaciente valor={paciente} onChange={setPaciente} deshabilitado={editando || enviando} />

        <label className="campo-label" htmlFor="informe-fecha">Fecha de la consulta</label>
        <input id="informe-fecha" type="date" value={fecha} max={hoyInput()} onChange={(e) => setFecha(e.target.value)} style={{ maxWidth: 200 }} required />

        <label className="campo-label" htmlFor="informe-motivo">Motivo de la consulta</label>
        <textarea id="informe-motivo" rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Por qué consultó el paciente?" required />

        <label className="campo-label" htmlFor="informe-diagnostico">Diagnóstico</label>
        <textarea id="informe-diagnostico" rows="3" value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} required />

        <label className="campo-label" htmlFor="informe-tratamiento">Tratamiento e indicaciones</label>
        <textarea id="informe-tratamiento" rows="4" value={tratamiento} onChange={(e) => setTratamiento(e.target.value)} placeholder="Medicamentos, dosis, reposo, controles…" />

        <label className="campo-label" htmlFor="informe-observaciones">Observaciones (opcional)</label>
        <textarea id="informe-observaciones" rows="3" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />

        {error && <div className="registro-error">{error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-outline btn-auto" onClick={() => navigate(editando ? `/doctor/informes/${informeId}` : '/doctor/informes')} disabled={enviando}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-auto" disabled={enviando}>{enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar informe'}</button>
        </div>
      </form>
    </div>
  )
}

// Crea un informe (/doctor/informes/nuevo, opcionalmente con ?paciente=ID ya elegido) o edita uno existente.
export default function InformeForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { usuario } = useAuth()
  const { informe, cargando } = useInforme(id, usuario?.uid)
  const idPaciente = id ? null : params.get('paciente')
  const { paciente, cargando: cargandoPaciente } = usePaciente(idPaciente)

  if (id) {
    if (cargando) return <p className="web-sub">Cargando…</p>
    if (!informe) return <p>No se encontró ese informe.</p>
    return <Formulario key={id} inicial={informe} informeId={id} />
  }
  if (idPaciente && cargandoPaciente) return <p className="web-sub">Cargando…</p>
  const prefijado = idPaciente && paciente?.rol === 'paciente' ? { id: paciente.id, nombre: nombreCompleto(paciente), edad: paciente.edad ?? null, sexo: paciente.sexo ?? '' } : null
  return <Formulario pacientePrefijado={prefijado} />
}

