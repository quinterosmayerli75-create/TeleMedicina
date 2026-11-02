export function grupoDelContacto(contacto) {
  if (contacto?.rol === 'profesional') return 'doctores'
  if (contacto?.rol === 'paciente') return 'pacientes'
  return null
}

// El rol de la persona, no su posición en una consulta, determina su pestaña.
export function organizarConversaciones({ filas, contactos, id = null, grupo = null, esPaciente = false }) {
  const grupoActivo = grupoDelContacto(contactos[id]) ?? (grupo === 'doctores' ? 'doctores' : 'pacientes')
  const filasGrupo = esPaciente ? filas : filas.filter(fila => grupoDelContacto(contactos[fila.otroId]) === grupoActivo)
  const contadores = { pacientes: 0, doctores: 0 }
  filas.forEach(fila => {
    const categoria = grupoDelContacto(contactos[fila.otroId])
    if (categoria && !fila.nueva) contadores[categoria] += 1
  })
  return { grupoActivo, filasGrupo, contadores, idActivo: id ?? filasGrupo[0]?.otroId ?? null }
}
