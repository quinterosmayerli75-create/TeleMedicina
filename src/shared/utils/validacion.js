const PATRON_CONTRASENA_SEGURA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const AYUDA_CONTRASENA = 'Mínimo 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial (ej. #, %, !).'

export function validarContrasena(contrasena) {
  if (!PATRON_CONTRASENA_SEGURA.test(contrasena)) {
    return 'La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial.'
  }
  return null
}

// Solo letras (con tildes y ñ) y espacios — nada de números ni símbolos en nombres/apellidos.
const PATRON_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚÑÜáéíóúñü\s]+$/

export function validarNombre(texto) {
  if (!PATRON_SOLO_LETRAS.test(texto.trim())) {
    return 'Solo se permiten letras y espacios, sin números ni símbolos.'
  }
  return null
}

// Formato general de correo: usuario@dominio.extensión. No limita a dominios específicos
// (gmail.com, outlook.com, etc.) porque cualquier dominio válido debe poder registrarse.
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarCorreo(correo) {
  if (!PATRON_CORREO.test(correo.trim())) {
    return 'Ingrese un correo válido (ej. nombre@gmail.com).'
  }
  return null
}
