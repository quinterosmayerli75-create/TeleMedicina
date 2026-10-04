// Fotos de verificación de un doctor (documento de "profesionales").
//   titulos                -> fotos de sus títulos (se pueden agregar varias, también después del registro)
//   documentosVerificacion -> [título, carnet] del registro original (lo revisa el admin)
// Los doctores registrados antes de existir `titulos` solo tienen `documentosVerificacion`; en ese caso
// el tipo de cada foto se deduce del nombre del archivo en Storage (`titulo-…` / `carnet-…`).

function rutaLegible(url) {
  try {
    return decodeURIComponent(url)
  } catch {
    return url
  }
}

const esTitulo = (url) => rutaLegible(url).includes('/titulo-')
const esCarnet = (url) => rutaLegible(url).includes('/carnet-')

function sinRepetidos(lista) {
  return [...new Set(lista.filter(Boolean))]
}

// Fotos de títulos: lo único que ve el paciente en el perfil público del doctor.
export function obtenerTitulos(prof) {
  return sinRepetidos([...(prof?.titulos ?? []), ...(prof?.documentosVerificacion ?? []).filter(esTitulo)])
}

// Todas las fotos de verificación con su etiqueta (para el admin y el currículum en PDF).
export function obtenerDocumentosEtiquetados(prof) {
  const titulos = obtenerTitulos(prof)
  const otros = sinRepetidos(prof?.documentosVerificacion ?? []).filter((url) => !titulos.includes(url))
  let contadorOtros = 0
  return [
    ...titulos.map((url, i) => ({
      url,
      tipo: 'titulo',
      etiqueta: titulos.length > 1 ? `Título profesional ${i + 1}` : 'Título profesional',
    })),
    ...otros.map((url) => {
      if (esCarnet(url)) return { url, tipo: 'carnet', etiqueta: 'Carnet profesional' }
      contadorOtros += 1
      return { url, tipo: 'otro', etiqueta: `Documento ${contadorOtros}` }
    }),
  ]
}
