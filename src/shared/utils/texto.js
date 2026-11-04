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

// Si lo que se escribió en la caja de búsqueda de arriba coincide con el nombre de una sección
// del menú (ej. escribir "mensajes" o "inicio"), devuelve su ruta para ir directo ahí en vez de
// filtrar una lista — la gente espera poder "buscar" una sección igual que busca una persona.
// Primero intenta una coincidencia exacta (por si dos secciones comparten texto, ej. "Mis
// consultas" / "Mis citas"); si no hay ninguna exacta, usa la primera que empiece igual.
export function encontrarSeccion(items, busqueda) {
  const texto = normalizarTexto(busqueda).trim()
  if (!texto) return null
  const exacta = items.find((item) => normalizarTexto(item.label) === texto)
  if (exacta) return exacta.to
  const porPrefijo = items.find((item) => normalizarTexto(item.label).startsWith(texto))
  return porPrefijo ? porPrefijo.to : null
}
