// Normaliza texto para comparar/buscar sin importar mayúsculas ni tildes: "Cardiología" y
// "cardiologia" deben encontrarse entre sí. Sin esto, buscar sin tilde (lo más común al
// escribir rápido) no encontraba nada aunque la palabra sí existiera.
export function normalizarTexto(texto) {
  return (texto ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita los acentos (diacríticos)
    .toLowerCase()
}

// Atajo para el caso más común: ¿"texto" contiene "busqueda", sin importar tildes/mayúsculas?
export function coincideTexto(texto, busqueda) {
  if (!busqueda) return true
  return normalizarTexto(texto).includes(normalizarTexto(busqueda))
}
