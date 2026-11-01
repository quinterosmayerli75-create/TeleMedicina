// Países disponibles en el selector de teléfono. Cada uno define cuántos dígitos espera y, si
// aplica, con qué dígito debe empezar un celular — así el mensaje de error es específico y no un
// genérico "número inválido". Bolivia tiene la regla exacta que pidió el cliente: 8 dígitos,
// empezando con 6 o 7. Los demás países validan solo la cantidad de dígitos (no tenemos una regla
// de prefijo celular confirmada para ellos todavía); se puede afinar cuando haga falta.
export const PAISES_TELEFONO = [
  { codigo: 'BO', prefijo: '+591', nombre: 'Bolivia', digitos: 8, prefijoCelular: /^[67]/ },
  { codigo: 'AR', prefijo: '+54', nombre: 'Argentina', digitos: 10 },
  { codigo: 'PE', prefijo: '+51', nombre: 'Perú', digitos: 9 },
  { codigo: 'CL', prefijo: '+56', nombre: 'Chile', digitos: 9 },
  { codigo: 'CO', prefijo: '+57', nombre: 'Colombia', digitos: 10 },
  { codigo: 'BR', prefijo: '+55', nombre: 'Brasil', digitos: 11 },
  { codigo: 'ES', prefijo: '+34', nombre: 'España', digitos: 9 },
  { codigo: 'US', prefijo: '+1', nombre: 'Estados Unidos', digitos: 10 },
]

export function paisPorCodigo(codigo) {
  return PAISES_TELEFONO.find((p) => p.codigo === codigo) ?? PAISES_TELEFONO[0]
}

// Valida el número (ya sin el prefijo de país) según las reglas de ese país.
export function validarTelefono(codigoPais, numero) {
  const pais = paisPorCodigo(codigoPais)
  if (numero.length !== pais.digitos) {
    return `El celular de ${pais.nombre} debe tener ${pais.digitos} dígitos.`
  }
  if (pais.prefijoCelular && !pais.prefijoCelular.test(numero)) {
    return `El celular de ${pais.nombre} debe empezar con ${pais.codigo === 'BO' ? '6 o 7' : 'un dígito válido'}.`
  }
  return null
}
