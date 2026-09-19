import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import InicioPublico from '../pages/inicio/InicioPublico'
import Acceso from '../pages/acceso/Acceso'
import RegistroPaciente from '../pages/paciente/RegistroPaciente'
import RegistroProfesional from '../pages/doctor/RegistroProfesional'

import PacienteLayout from '../pages/paciente/PacienteLayout'
import Inicio from '../pages/paciente/Inicio'
import Buscar from '../pages/paciente/Buscar'
import PerfilDoctor from '../pages/paciente/PerfilDoctor'
import Favoritos from '../pages/paciente/Favoritos'
import MensajesPaciente from '../pages/paciente/Mensajes'
import MiPerfil from '../pages/paciente/MiPerfil'
import ConfiguracionPaciente from '../pages/paciente/Configuracion'
import DenunciaPaciente from '../pages/paciente/Denuncia'

import DoctorLayout from '../pages/doctor/DoctorLayout'
import Panel from '../pages/doctor/Panel'
import MensajesDoctor from '../pages/doctor/Mensajes'
import PerfilPaciente from '../pages/doctor/PerfilPaciente'
import ConfiguracionDoctor from '../pages/doctor/Configuracion'
import DenunciaDoctor from '../pages/doctor/Denuncia'

import AdminLayout from '../pages/admin/AdminLayout'
import Dashboard from '../pages/admin/Dashboard'
import Solicitudes from '../pages/admin/Solicitudes'
import Categorias from '../pages/admin/Categorias'
import NuevaCategoria from '../pages/admin/NuevaCategoria'
import Doctores from '../pages/admin/Doctores'
import Usuarios from '../pages/admin/Usuarios'
import Denuncias from '../pages/admin/Denuncias'
import Roles from '../pages/admin/Roles'
import ConfiguracionAdmin from '../pages/admin/Configuracion'

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
          <Route path="mensajes" element={<MensajesDoctor />} />
          <Route path="mensajes/:id" element={<MensajesDoctor />} />
          <Route path="paciente/:id" element={<PerfilPaciente />} />
          <Route path="configuracion" element={<ConfiguracionDoctor />} />
          <Route path="denuncia/:id" element={<DenunciaDoctor />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RutaProtegida rolPermitido="administrador">
              <AdminLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="solicitudes" element={<Solicitudes />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="categorias/nueva" element={<NuevaCategoria />} />
          <Route path="doctores" element={<Doctores />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="denuncias" element={<Denuncias />} />
          <Route path="roles" element={<Roles />} />
          <Route path="configuracion" element={<ConfiguracionAdmin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
