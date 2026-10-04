import { arrayUnion, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './config'

// Crea (o reinicia) la llamada entre esta pareja de paciente y doctor; el id del documento es el
// mismo que el de su conversación, así que solo hay una llamada "vigente" a la vez entre los dos.
export function crearLlamada(convId, { pacienteId, doctorId, llamanteId, tipo }) {
  return setDoc(doc(db, 'llamadas', convId), {
    pacienteId,
    doctorId,
    participantes: [pacienteId, doctorId],
    tipo,
    estado: 'llamando',
    llamanteId,
    oferta: null,
    respuesta: null,
    candidatosLlamante: [],
    candidatosReceptor: [],
    iniciadaEn: serverTimestamp(),
  })
}

export function enviarOferta(convId, oferta) {
  return updateDoc(doc(db, 'llamadas', convId), { oferta })
}

export function enviarRespuesta(convId, respuesta) {
  return updateDoc(doc(db, 'llamadas', convId), { respuesta, estado: 'conectada' })
}

export function agregarCandidato(convId, campo, candidato) {
  return updateDoc(doc(db, 'llamadas', convId), { [campo]: arrayUnion(candidato) })
}

export function finalizarLlamada(convId) {
  return updateDoc(doc(db, 'llamadas', convId), { estado: 'finalizada' })
}

export function rechazarLlamada(convId) {
  return updateDoc(doc(db, 'llamadas', convId), { estado: 'rechazada' })
}
