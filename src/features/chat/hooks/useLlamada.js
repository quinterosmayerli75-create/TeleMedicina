import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { agregarCandidato, crearLlamada, enviarOferta, enviarRespuesta, finalizarLlamada, rechazarLlamada } from '../services/llamadas'

const CONFIG_ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }

function mensajeErrorMedios(err) {
  if (err?.name === 'NotAllowedError') return 'Debes dar permiso para usar la cámara y/o el micrófono.'
  if (err?.name === 'NotFoundError') return 'No se encontró cámara o micrófono en este dispositivo.'
  return 'No se pudo iniciar la llamada. Revisa tu conexión e intenta de nuevo.'
}

// Llamada de audio o video 1 a 1 entre paciente y doctor, conectada directo entre los dos navegadores
// (WebRTC); Firestore solo se usa para "presentarlos" (intercambiar oferta, respuesta y candidatos ICE).
export function useLlamada({ convId, pacienteId, doctorId, miUid }) {
  const [llamada, setLlamada] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [error, setError] = useState('')
  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const candidatosVistos = useRef(new Set())

  const soyLlamante = llamada?.llamanteId === miUid
  const campoCandidatosOtro = soyLlamante ? 'candidatosReceptor' : 'candidatosLlamante'

  useEffect(() => {
    if (!convId) return undefined
    return onSnapshot(doc(db, 'llamadas', convId), (snap) => setLlamada(snap.exists() ? snap.data() : null))
  }, [convId])

  const limpiar = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    candidatosVistos.current = new Set()
  }, [])

  // "comoLlamante" se pasa explícito (no se puede confiar en el estado "llamada" reactivo aquí: justo
  // al iniciar una llamada, Firestore todavía no avisó el nuevo documento, así que "soyLlamante" seguiría
  // en false un instante y los candidatos ICE del llamante se guardarían en el campo equivocado).
  function crearConexion(comoLlamante) {
    const campoCandidatos = comoLlamante ? 'candidatosLlamante' : 'candidatosReceptor'
    const pc = new RTCPeerConnection(CONFIG_ICE)
    pc.onicecandidate = (e) => {
      if (e.candidate) agregarCandidato(convId, campoCandidatos, e.candidate.toJSON()).catch(() => {})
    }
    pc.ontrack = (e) => setRemoteStream(e.streams[0])
    pcRef.current = pc
    return pc
  }

  async function obtenerMedios(tipo) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: tipo === 'video' })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }

  // Quien llama: pide cámara/mic, crea la oferta y avisa en Firestore.
  async function iniciar(tipo) {
    setError('')
    try {
      const stream = await obtenerMedios(tipo)
      await crearLlamada(convId, { pacienteId, doctorId, llamanteId: miUid, tipo })
      const pc = crearConexion(true)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      const oferta = await pc.createOffer()
      await pc.setLocalDescription(oferta)
      await enviarOferta(convId, { sdp: oferta.sdp, type: oferta.type })
    } catch (err) {
      setError(mensajeErrorMedios(err))
      limpiar()
    }
  }

  // Quien recibe: pide cámara/mic, crea la respuesta a partir de la oferta.
  async function aceptar() {
    if (!llamada?.oferta) return
    setError('')
    try {
      const stream = await obtenerMedios(llamada.tipo)
      const pc = crearConexion(false)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      await pc.setRemoteDescription(new RTCSessionDescription(llamada.oferta))
      const respuesta = await pc.createAnswer()
      await pc.setLocalDescription(respuesta)
      await enviarRespuesta(convId, { sdp: respuesta.sdp, type: respuesta.type })
    } catch (err) {
      setError(mensajeErrorMedios(err))
      rechazar()
    }
  }

  function rechazar() {
    rechazarLlamada(convId).catch(() => {})
    limpiar()
  }

  function colgar() {
    finalizarLlamada(convId).catch(() => {})
    limpiar()
  }

  // El llamante fija la respuesta cuando llega.
  useEffect(() => {
    const pc = pcRef.current
    if (!pc || !llamada || !soyLlamante) return
    if (llamada.respuesta && pc.signalingState === 'have-local-offer') {
      pc.setRemoteDescription(new RTCSessionDescription(llamada.respuesta)).catch(() => {})
    }
  }, [llamada, soyLlamante])

  // Agrega los candidatos ICE nuevos que publicó la otra persona.
  useEffect(() => {
    const pc = pcRef.current
    if (!pc || !llamada) return
    const candidatos = llamada[campoCandidatosOtro] ?? []
    candidatos.forEach((c, i) => {
      const clave = `${campoCandidatosOtro}-${i}`
      if (candidatosVistos.current.has(clave)) return
      candidatosVistos.current.add(clave)
      pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
    })
  }, [llamada, campoCandidatosOtro])

  // Si la otra persona cuelga o rechaza, se cierra la conexión de este lado también.
  useEffect(() => {
    if (llamada && ['finalizada', 'rechazada'].includes(llamada.estado) && pcRef.current) {
      limpiar()
    }
  }, [llamada, limpiar])

  useEffect(() => () => limpiar(), [limpiar])

  const llamadaActiva = llamada && !['finalizada', 'rechazada'].includes(llamada.estado) ? llamada : null

  return { llamada: llamadaActiva, soyLlamante, localStream, remoteStream, error, iniciar, aceptar, rechazar, colgar }
}
