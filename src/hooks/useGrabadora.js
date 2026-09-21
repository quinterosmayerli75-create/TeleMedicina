import { useCallback, useEffect, useRef, useState } from 'react'

const TIPOS_PREFERIDOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

// Grabación de notas de voz con el micrófono (MediaRecorder).
//   iniciar()  -> pide permiso y empieza a grabar (lanza un Error con mensaje en español si no se puede)
//   detener()  -> termina y devuelve un File de audio (o null si no se grabó nada)
//   cancelar() -> descarta la grabación
export function useGrabadora() {
  const [grabando, setGrabando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const grabadoraRef = useRef(null)
  const flujoRef = useRef(null)
  const trozosRef = useRef([])
  const temporizadorRef = useRef(null)

  const limpiar = useCallback(() => {
    clearInterval(temporizadorRef.current)
    flujoRef.current?.getTracks().forEach((pista) => pista.stop())
    flujoRef.current = null
    grabadoraRef.current = null
    trozosRef.current = []
    setGrabando(false)
    setSegundos(0)
  }, [])

  useEffect(() => limpiar, [limpiar])

  async function iniciar() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('Este navegador no permite grabar audio.')
    }
    let flujo
    try {
      flujo = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      throw new Error(
        err?.name === 'NotFoundError'
          ? 'No se encontró un micrófono.'
          : 'No hay permiso para usar el micrófono. Permítalo en el navegador e intente de nuevo.'
      )
    }
    const tipo = TIPOS_PREFERIDOS.find((t) => MediaRecorder.isTypeSupported?.(t))
    const grabadora = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined)
    trozosRef.current = []
    grabadora.ondataavailable = (e) => e.data.size > 0 && trozosRef.current.push(e.data)
    grabadora.start()
    flujoRef.current = flujo
    grabadoraRef.current = grabadora
    setSegundos(0)
    setGrabando(true)
    temporizadorRef.current = setInterval(() => setSegundos((s) => s + 1), 1000)
  }

  function detener() {
    const grabadora = grabadoraRef.current
    if (!grabadora) return Promise.resolve(null)
    const duracion = segundos
    return new Promise((resolver) => {
      grabadora.onstop = () => {
        const tipo = (grabadora.mimeType || 'audio/webm').split(';')[0]
        const extension = tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(trozosRef.current, { type: tipo })
        limpiar()
        resolver(blob.size > 0 ? Object.assign(new File([blob], `nota-de-voz-${Date.now()}.${extension}`, { type: tipo }), { duracion }) : null)
      }
      grabadora.stop()
    })
  }

  function cancelar() {
    const grabadora = grabadoraRef.current
    if (grabadora && grabadora.state !== 'inactive') {
      grabadora.onstop = null
      grabadora.stop()
    }
    limpiar()
  }

  return { grabando, segundos, iniciar, detener, cancelar }
}
