import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../firebase/config'

export const MB = 1024 * 1024
export const LIMITE_FOTO_MB = 5
export const LIMITE_ADJUNTO_MB = 25

const EXTENSIONES = {
  imagen: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'avif'],
  video: ['mp4', 'mov', 'webm', 'mkv', 'avi', '3gp', 'm4v'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'weba', 'amr', 'flac'],
}

function extension(nombre = '') {
  const punto = nombre.lastIndexOf('.')
  return punto >= 0 ? nombre.slice(punto + 1).toLowerCase() : ''
}

// 'imagen' | 'video' | 'audio' | 'documento', según el tipo MIME (o la extensión si el navegador no da MIME).
export function tipoDeArchivo(archivo) {
  const mime = archivo.type ?? ''
  if (mime.startsWith('image/')) return 'imagen'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  const ext = extension(archivo.name)
  const encontrado = Object.entries(EXTENSIONES).find(([, lista]) => lista.includes(ext))
  return encontrado ? encontrado[0] : 'documento'
}

export function formatearTamano(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

// Nombre apto para una ruta de Storage: sin tildes ni caracteres raros, conservando la extensión.
export function nombreSeguro(nombre = 'archivo') {
  const ext = extension(nombre)
  const base = (ext ? nombre.slice(0, -(ext.length + 1)) : nombre)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
  return `${base || 'archivo'}${ext ? `.${ext.replace(/[^a-z0-9]/g, '')}` : ''}`
}

// Devuelve un mensaje de error en español, o null si el archivo es válido.
export function validarArchivo(archivo, { solo, maxMB }) {
  if (solo && tipoDeArchivo(archivo) !== solo) {
    return `"${archivo.name}" no es una imagen. Elige una foto (JPG, PNG…).`
  }
  if (archivo.size > maxMB * MB) {
    return `"${archivo.name}" pesa ${formatearTamano(archivo.size)} y el máximo es ${maxMB} MB.`
  }
  if (archivo.size === 0) return `"${archivo.name}" está vacío.`
  return null
}

// Sube un archivo a Firebase Storage y devuelve su URL de descarga.
export function subirArchivo(ruta, archivo, onProgreso) {
  return new Promise((resolve, reject) => {
    const archivoRef = ref(storage, ruta)
    const tarea = uploadBytesResumable(archivoRef, archivo, archivo.type ? { contentType: archivo.type } : undefined)
    tarea.on(
      'state_changed',
      (instantanea) => onProgreso?.(instantanea.totalBytes ? instantanea.bytesTransferred / instantanea.totalBytes : 0),
      reject,
      async () => {
        try {
          const url = await getDownloadURL(tarea.snapshot.ref)
          resolve({ url, nombre: archivo.name, tamano: archivo.size, mime: archivo.type || '' })
        } catch (err) {
          reject(err)
        }
      }
    )
  })
}

// Sube las fotos de evidencia de una denuncia y devuelve la lista de URLs.
export async function subirEvidencias(uid, fotos) {
  const marca = Date.now()
  const resultados = await Promise.all(
    fotos.map((foto, i) => subirArchivo(`denuncias/${uid}/${marca}-${i}-${nombreSeguro(foto.name)}`, foto))
  )
  return resultados.map((r) => r.url)
}

export function mensajeErrorSubida(err) {
  switch (err?.code) {
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      return 'Firebase Storage rechazó la subida: hay que publicar las reglas de storage.rules (ver README).'
    case 'storage/quota-exceeded':
      return 'Se agotó el espacio de Firebase Storage.'
    case 'storage/canceled':
      return 'La subida se canceló.'
    default:
      return 'No se pudo subir el archivo. Revisa tu conexión e intenta de nuevo.'
  }
}
