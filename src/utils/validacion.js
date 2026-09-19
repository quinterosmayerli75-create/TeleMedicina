const PATRON_CONTRASENA_SEGURA = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export function validarContrasena(contrasena) {
  if (!PATRON_CONTRASENA_SEGURA.test(contrasena)) {
    return 'La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.'
  }
  return null
}
