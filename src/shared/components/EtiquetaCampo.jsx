// Etiqueta de un campo de formulario que marca si es obligatorio (asterisco rojo) u opcional
// (texto "(opcional)"), para que el usuario sepa de un vistazo qué debe llenar sí o sí.
export default function EtiquetaCampo({ htmlFor, children, opcional = false }) {
  return (
    <label className="campo-label" htmlFor={htmlFor}>
      {children}
      {opcional
        ? <span style={{ color: 'var(--gris)', fontWeight: 400 }}> (opcional)</span>
        : <span style={{ color: 'var(--alerta)', fontSize: '1.6em', fontWeight: 800, verticalAlign: 'middle', lineHeight: 0 }} aria-hidden="true"> *</span>}
    </label>
  )
}
