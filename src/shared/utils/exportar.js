// Exporta listas a CSV (Excel lo abre directo) desde el admin. Sin librerías nuevas: un CSV bien
// armado (con BOM para que Excel respete las tildes) es toda la "exportación a Excel" que hace falta.
function celda(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** columnas: [{ clave, etiqueta }]; filas: array de objetos (se lee fila[clave]). */
export function descargarCSV(nombreArchivo, columnas, filas) {
  const encabezado = columnas.map((c) => celda(c.etiqueta)).join(';')
  const cuerpo = filas.map((fila) => columnas.map((c) => celda(fila[c.clave])).join(';')).join('\n')
  const csv = `${encabezado}\n${cuerpo}`
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo.endsWith('.csv') ? nombreArchivo : `${nombreArchivo}.csv`
  enlace.click()
  URL.revokeObjectURL(url)
}
