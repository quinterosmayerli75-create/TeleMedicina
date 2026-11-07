// Colores y marca de DocTop para los PDF descargables (comprobante, informes, currículum, reporte).
// Mismo verde azulado que el resto de la app (--oro / --admin-accent) y la misma marca "dt+" que
// se ve en la barra lateral, pero dibujada con las formas de jsPDF (no hay un logo en imagen).
export const TEAL = [22, 169, 116]
export const TEAL_CLARO = [95, 227, 179]
const INSIGNIA_FONDO = [228, 235, 202]
const INSIGNIA_TEXTO = [60, 93, 55]
const INSIGNIA_BORDE = [18, 46, 42]

/**
 * Dibuja la marca "dt+" (cuadrado redondeado + insignia) centrada verticalmente en yCentro.
 * @returns la posición X donde debería empezar el texto "DOCTOP" que la acompaña.
 */
export function logoDocTop(pdf, x, yCentro, { lado = 9 } = {}) {
  const y = yCentro - lado / 2
  pdf.setFillColor(...TEAL)
  pdf.roundedRect(x, y, lado, lado, 2, 2, 'F')
  pdf.setFont('times', 'bolditalic')
  pdf.setFontSize(lado * 1.05)
  pdf.setTextColor(255, 255, 255)
  pdf.text('dt', x + lado / 2, y + lado / 2 + lado * 0.18, { align: 'center' })

  const insigniaX = x + lado - 0.5
  const insigniaY = y + 0.5
  const radio = lado * 0.2
  pdf.setFillColor(...INSIGNIA_FONDO)
  pdf.circle(insigniaX, insigniaY, radio, 'F')
  pdf.setDrawColor(...INSIGNIA_BORDE)
  pdf.setLineWidth(0.25)
  pdf.circle(insigniaX, insigniaY, radio, 'S')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(lado * 0.55)
  pdf.setTextColor(...INSIGNIA_TEXTO)
  pdf.text('+', insigniaX, insigniaY + radio * 0.55, { align: 'center' })

  return x + lado + 4
}
