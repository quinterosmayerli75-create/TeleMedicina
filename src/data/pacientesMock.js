// Datos de ejemplo mientras se conecta la colección "usuarios" filtrada por rol paciente.
export const pacientesMock = [
  {
    id: 'camila-rojas',
    nombre: 'Camila Rojas Peña',
    foto: 'https://i.pravatar.cc/150?img=47',
    enLinea: true,
    edad: 29,
    sexo: 'Femenino',
    carnet: '7845213 CB',
    estatura: '1.63 m',
    peso: '58 kg',
    telefono: '+591 71234567',
    lugar: 'Quillacollo, Cochabamba',
    consultasConmigo: 3,
    primeraConsulta: '12/04/2026',
  },
  {
    id: 'jorge-aguilar',
    nombre: 'Jorge Aguilar',
    foto: 'https://i.pravatar.cc/150?img=25',
    enLinea: false,
    edad: 41,
    sexo: 'Masculino',
    carnet: '5521098 CB',
    estatura: '1.75 m',
    peso: '80 kg',
    telefono: '+591 76541230',
    lugar: 'Cercado, Cochabamba',
    consultasConmigo: 1,
    primeraConsulta: '02/08/2026',
  },
]

export function obtenerPaciente(id) {
  return pacientesMock.find((p) => p.id === id)
}
