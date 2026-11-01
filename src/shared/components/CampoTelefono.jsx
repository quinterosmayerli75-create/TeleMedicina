import { PAISES_TELEFONO } from '@/shared/utils/telefonos'

// Selector de código de país + número. `value` es un objeto { pais, numero } (pais = código de 2
// letras, ej. "BO"; numero = solo dígitos, sin el prefijo). `onChange` recibe el objeto completo
// actualizado, para que el formulario que lo usa guarde ambos datos juntos.
export default function CampoTelefono({ id, value, onChange, disabled }) {
  const pais = PAISES_TELEFONO.find((p) => p.codigo === value.pais) ?? PAISES_TELEFONO[0]

  function cambiarPais(e) {
    onChange({ pais: e.target.value, numero: '' })
  }

  function cambiarNumero(e) {
    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, pais.digitos)
    onChange({ ...value, numero: soloNumeros })
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select
        aria-label="Código de país"
        value={value.pais}
        onChange={cambiarPais}
        disabled={disabled}
        style={{ flex: '0 0 130px' }}
      >
        {PAISES_TELEFONO.map((p) => (
          <option key={p.codigo} value={p.codigo}>{p.prefijo} {p.codigo}</option>
        ))}
      </select>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={pais.codigo === 'BO' ? '7XXXXXXX' : `${pais.digitos} dígitos`}
        value={value.numero}
        onChange={cambiarNumero}
        disabled={disabled}
        style={{ flex: 1 }}
      />
    </div>
  )
}
