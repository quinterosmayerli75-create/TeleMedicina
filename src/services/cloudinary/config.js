// Cloudinary se usa en vez de Firebase Storage para subir fotos y adjuntos, porque su plan
// gratuito no pide tarjeta (a diferencia del plan Blaze de Firebase, necesario para Storage).
// El "upload preset" sin firmar permite subir archivos desde el navegador sin exponer la API
// secret de la cuenta — se crea a mano en Cloudinary Console → Settings → Upload → Upload presets.
export const CLOUDINARY_CLOUD_NAME = 'islvzur3'
export const CLOUDINARY_UPLOAD_PRESET = 'telemedicina_sinsigned'
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`
