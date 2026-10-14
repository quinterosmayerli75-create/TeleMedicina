import DatePicker, { registerLocale } from 'react-datepicker'
import { es } from 'date-fns/locale/es'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('es', es)

function aFechaLocal(valor) {
  if (!valor) return null
  const [anio, mes, dia] = valor.split('-').map(Number)
  if (!anio || !mes || !dia) return null
  return new Date(anio, mes - 1, dia)
}

function aTexto(fecha) {
  if (!fecha) return ''
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

// Selector de fecha con calendario visual (reemplaza el input type="date" nativo del navegador,
// que no se puede re-pintar). Acepta value/onChange como un <input> normal: value es un string
// "aaaa-mm-dd" y onChange recibe un evento con target.value en ese mismo formato, para no tener
// que tocar los `actualizarCampo('fechaNacimiento')` que ya usan los formularios de registro.
export default function CampoFecha({ id, value, onChange, max, min, placeholder = 'dd/mm/aaaa' }) {
  return (
    <DatePicker
      id={id}
      selected={aFechaLocal(value)}
      onChange={(fecha) => onChange({ target: { value: aTexto(fecha) } })}
      maxDate={max ? aFechaLocal(max) : undefined}
      minDate={min ? aFechaLocal(min) : undefined}
      locale="es"
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      isClearable
      autoComplete="off"
      wrapperClassName="campo-fecha-wrapper"
      className="campo-fecha-input"
      calendarClassName="campo-fecha-calendario"
    />
  )
}
