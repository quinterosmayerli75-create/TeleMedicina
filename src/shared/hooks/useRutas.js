import { useLocation } from 'react-router-dom'

// Las pantallas de Inicio, Buscar, Favoritos y perfil de un doctor se usan tanto en el panel del paciente
// (/paciente/...) como en el del doctor (/doctor/...), donde el doctor consulta a otros doctores como un
// paciente más. Este hook devuelve las rutas según el panel en el que se está.
export function useRutas() {
  const { pathname } = useLocation()
  const esDoctor = pathname.startsWith('/doctor')
  const base = esDoctor ? '/doctor' : '/paciente'

  return {
    esDoctor,
    base,
    buscar: `${base}/buscar`,
    perfilDoctor: (id) => (esDoctor ? `/doctor/especialista/${id}` : `/paciente/doctor/${id}`),
    mensajesDoctor: (id) => (esDoctor ? `/doctor/mensajes/doctores/${id}` : `/paciente/mensajes/${id}`),
    denuncia: (id) => `${base}/denuncia/${id}`,
    // Un doctor también puede solicitar y hacer seguimiento a sus propias consultas (como
    // paciente de otro doctor). Usa una ruta aparte de "Mis consultas" (esa es su cola de
    // pacientes como profesional) para no mezclarlas.
    solicitarConsulta: (id) => `${base}/solicitar/${id}`,
    misCitas: esDoctor ? '/doctor/mis-citas' : '/paciente/consultas',
    cita: (id) => (esDoctor ? `/doctor/mis-citas/${id}` : `/paciente/consultas/${id}`),
  }
}
