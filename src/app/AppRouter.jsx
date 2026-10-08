import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import InicioPublico from '@/features/landing/pages/InicioPublico'
import Acceso from '@/features/auth/pages/Acceso'
import RegistroPaciente from '@/features/auth/pages/RegistroPaciente'
import RegistroProfesional from '@/features/auth/pages/RegistroProfesional'

import PacienteLayout from './layouts/PacienteLayout'
import Inicio from '@/features/profesionales/pages/Inicio'
import Buscar from '@/features/profesionales/pages/Buscar'
import PerfilDoctor from '@/features/profesionales/pages/PerfilDoctor'
import Favoritos from '@/features/profesionales/pages/Favoritos'
import MensajesPaciente from '@/features/chat/pages/paciente/Mensajes'
import MiPerfil from '@/features/perfil/pages/paciente/MiPerfil'
import ConfiguracionPaciente from '@/features/perfil/pages/paciente/Configuracion'
import DenunciaPaciente from '@/features/denuncias/pages/paciente/Denuncia'
import SolicitarConsulta from '@/features/consultas/pages/paciente/SolicitarConsulta'
import Consulta from '@/features/consultas/pages/paciente/Consulta'
import MisConsultasPaciente from '@/features/consultas/pages/paciente/MisConsultas'

import DoctorLayout from './layouts/DoctorLayout'
import Panel from '@/features/profesionales/pages/Panel'
import MensajesDoctor from '@/features/chat/pages/doctor/Mensajes'
import MensajesInterconsulta from '@/features/chat/pages/doctor/MensajesInterconsulta'
import PerfilPaciente from '@/features/pacientes/pages/PerfilPaciente'
import Informes from '@/features/informes/pages/Informes'
import InformeForm from '@/features/informes/pages/InformeForm'
import InformeDetalle from '@/features/informes/pages/InformeDetalle'
import ConfiguracionDoctor from '@/features/perfil/pages/doctor/Configuracion'
import DenunciaDoctor from '@/features/denuncias/pages/doctor/Denuncia'
import MisConsultasDoctor from '@/features/consultas/pages/doctor/MisConsultas'
import ConsultaDetalleDoctor from '@/features/consultas/pages/doctor/ConsultaDetalle'
import AgendaDoctor from '@/features/consultas/pages/doctor/Agenda'
import SuscripcionDoctor from '@/features/consultas/pages/doctor/Suscripcion'
import ValidacionPagosDoctor from '@/features/consultas/pages/doctor/ValidacionPagos'

import AdminLayout from './layouts/AdminLayout'
import InicioEstadisticas from '@/features/admin/pages/InicioEstadisticas'
import Solicitudes from '@/features/admin/pages/Solicitudes'
import Categorias from '@/features/admin/pages/Categorias'
import NuevaCategoria from '@/features/admin/pages/NuevaCategoria'
import Doctores from '@/features/admin/pages/Doctores'
import Usuarios from '@/features/admin/pages/Usuarios'
import Denuncias from '@/features/denuncias/pages/admin/Denuncias'
import Roles from '@/features/admin/pages/Roles'
import ConfiguracionAdmin from '@/features/perfil/pages/admin/Configuracion'
import ValidacionPagos from '@/features/consultas/pages/admin/ValidacionPagos'
import ValidacionSuscripciones from '@/features/consultas/pages/admin/ValidacionSuscripciones'

function RutaProtegida({ rolPermitido, children }) {
  const { usuario, rol, cargando } = useAuth()

  if (cargando) return null
  if (!usuario) return <Navigate to="/acceso" replace />
  if (rol !== rolPermitido) return <Navigate to="/acceso" replace />

  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InicioPublico />} />
        <Route path="/acceso" element={<Acceso />} />
        <Route path="/registro/paciente" element={<RegistroPaciente />} />
        <Route path="/registro/profesional" element={<RegistroProfesional />} />

        <Route
          path="/paciente"
          element={
            <RutaProtegida rolPermitido="paciente">
              <PacienteLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="inicio" replace />} />
          <Route path="inicio" element={<Inicio />} />
          <Route path="buscar" element={<Buscar />} />
          <Route path="doctor/:id" element={<PerfilDoctor />} />
          <Route path="favoritos" element={<Favoritos />} />
          <Route path="mensajes" element={<MensajesPaciente />} />
          <Route path="mensajes/:id" element={<MensajesPaciente />} />
          <Route path="perfil" element={<MiPerfil />} />
          <Route path="configuracion" element={<ConfiguracionPaciente />} />
          <Route path="denuncia/:id" element={<DenunciaPaciente />} />
          <Route path="solicitar/:id" element={<SolicitarConsulta />} />
          <Route path="consultas" element={<MisConsultasPaciente />} />
          <Route path="consultas/:id" element={<Consulta />} />
        </Route>

        <Route
          path="/doctor"
          element={
            <RutaProtegida rolPermitido="profesional">
              <DoctorLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="panel" replace />} />
          <Route path="panel" element={<Panel />} />
          <Route path="inicio" element={<Inicio />} />
          <Route path="buscar" element={<Buscar />} />
          <Route path="favoritos" element={<Favoritos />} />
          <Route path="especialista/:id" element={<PerfilDoctor />} />
          <Route path="mensajes" element={<MensajesDoctor />} />
          <Route path="mensajes/doctores" element={<MensajesInterconsulta />} />
          <Route path="mensajes/doctores/:id" element={<MensajesInterconsulta />} />
          <Route path="mensajes/:id" element={<MensajesDoctor />} />
          <Route path="paciente/:id" element={<PerfilPaciente />} />
          <Route path="informes" element={<Informes />} />
          <Route path="informes/nuevo" element={<InformeForm />} />
          <Route path="informes/:id" element={<InformeDetalle />} />
          <Route path="informes/:id/editar" element={<InformeForm />} />
          <Route path="configuracion" element={<ConfiguracionDoctor />} />
          <Route path="denuncia/:id" element={<DenunciaDoctor />} />
          <Route path="agenda" element={<AgendaDoctor />} />
          <Route path="consultas" element={<MisConsultasDoctor />} />
          <Route path="consultas/:id" element={<ConsultaDetalleDoctor />} />
          <Route path="suscripcion" element={<SuscripcionDoctor />} />
          <Route path="validacion-pagos" element={<ValidacionPagosDoctor />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RutaProtegida rolPermitido="administrador">
              <AdminLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="inicio" replace />} />
          <Route path="inicio" element={<InicioEstadisticas />} />
          <Route path="dashboard" element={<Navigate to="/admin/inicio" replace />} />
          <Route path="solicitudes" element={<Solicitudes />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="categorias/nueva" element={<NuevaCategoria />} />
          <Route path="doctores" element={<Doctores />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="denuncias" element={<Denuncias />} />
          <Route path="roles" element={<Roles />} />
          <Route path="pagos" element={<ValidacionPagos />} />
          <Route path="suscripciones" element={<ValidacionSuscripciones />} />
          <Route path="configuracion" element={<ConfiguracionAdmin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
