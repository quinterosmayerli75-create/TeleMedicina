// Lista de palabras prohibidas en comentarios/calificaciones. Aparte en su propio archivo (no
// hardcodeada dentro del componente) para poder ampliarla fácil más adelante, sin tocar la
// pantalla que la usa. Todo en minúsculas y sin tildes: `contieneVulgaridad` normaliza el texto
// del usuario de la misma forma antes de comparar, así "Puta", "PUTA" o "pútá" también se detectan.
export const PALABRAS_PROHIBIDAS = [
  'puta', 'puto', 'putita', 'putito',
  'mierda', 'mierdero',
  'verga', 'pendejo', 'pendeja',
  'perra', 'perro de mierda',
  'cabron', 'cabrona',
  'pinche',
  'imbecil', 'idiota', 'estupido', 'estupida',
  'maldito', 'maldita',
  'carajo',
  'joder', 'jodido', 'jodida',
  'culero', 'culera', 'culo',
  'marica', 'maricon',
  'zorra',
  'concha de tu madre', 'ctm',
  'hijo de puta', 'hdp',
  'pelotudo', 'pelotuda',
  'boludo', 'boluda',
  'coño',
]

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes: "pútá" -> "puta"
}

// true si el texto contiene alguna palabra de la lista (como palabra completa, no como parte de
// otra palabra — ej. "pendejo" sí, pero no bloquea "concha" dentro de "conchabado").
export function contieneVulgaridad(texto) {
  const limpio = normalizar(texto)
  return PALABRAS_PROHIBIDAS.some((palabra) => {
    const patron = new RegExp(`\\b${palabra.replace(/\s+/g, '\\s+')}\\b`)
    return patron.test(limpio)
  })
}
