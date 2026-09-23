const PATRON_CONTRASENA_SEGURA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const AYUDA_CONTRASENA = 'Mínimo 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial (ej. #, %, !).'

export function validarContrasena(contrasena) {
  if (!PATRON_CONTRASENA_SEGURA.test(contrasena)) {
    return 'La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas, números y un carácter especial.'
  }
  return null
}
