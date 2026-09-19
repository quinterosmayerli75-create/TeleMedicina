# DocTop — Plataforma de Telemedicina

Plataforma de telemedicina 100% virtual que conecta pacientes con profesionales de la salud
verificados, para consultas por chat, llamada de voz o videollamada.

Proyecto de Sistemas I — Grupo 3 (Mayerli Quinteros Silva, Carlos Roberto Herrera).

## Stack

- **Frontend web**: React 19 + Vite, React Router.
- **Backend**: Firebase (Authentication + Cloud Firestore + Storage). No hay servidor propio: toda
  la lógica vive en el cliente, protegida por las reglas de seguridad de Firestore.
- La configuración de Firebase (`firebaseConfig`) está en `src/firebase/config.js` — es pública por
  diseño, la seguridad real la dan `firestore.rules`.

## Cómo correr el proyecto

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Como el `firebaseConfig` ya está en el código, se conecta directo a
la base de datos compartida del proyecto — no hace falta configurar nada más para desarrollar.

## Reglas de seguridad de Firestore

El archivo `firestore.rules` en la raíz del repo es la fuente de verdad. Si lo modificas, publícalo
manualmente en **Firebase Console → Firestore → Reglas** (no hay despliegue automático configurado
todavía).

## Estructura de rutas

- `/` — Landing pública (sin sesión).
- `/acceso` — Login compartido para los 3 roles (el sistema detecta el rol automáticamente).
- `/registro/paciente`, `/registro/profesional` — Registro público.
- `/paciente/*`, `/doctor/*`, `/admin/*` — Paneles protegidos por rol (ver `src/router/AppRouter.jsx`).

## Colecciones de Firestore

- `usuarios/{uid}` — Perfil común a los 3 roles (`rol`: paciente | profesional | administrador;
  `estado`: activo | pendiente | bloqueado | etc.). El `id` del documento siempre es el UID de
  Firebase Authentication.
- `profesionales/{uid}` — Datos extendidos del profesional (especialidad, costo de consulta,
  modalidades, disponibilidad, verificación). Mismo `uid` que su documento en `usuarios`.
- `tiposProfesion` — Catálogo de especialidades, administrado desde el panel admin.
- `reportes` — Denuncias entre usuarios.
- `calificaciones`, `consultas`, `favoritos`, `mensajes`, `notificaciones` — Colecciones ya creadas
  en la base de datos pero **aún no conectadas** al frontend (ver estado por sprint más abajo).

## Estado del proyecto por sprint

**Sprint 1 — completo**, incluyendo extras fuera del alcance original:
registro/login de los 3 roles, roles y permisos, configuración de cuenta, tipos de profesionales,
registro y verificación de profesionales, perfil/lista/búsqueda/filtros de profesionales,
disponibilidad del profesional.

Además, ya están construidas piezas que originalmente estaban en el Sprint 3: favoritos,
panel del profesional/paciente/administrativo, dashboard y estadísticas, y reportes/denuncias.
También se agregó una landing page pública y funciones de administración (alta/edición/baja de
doctores y pacientes desde el panel admin) que no estaban en el alcance inicial.

**Pendiente — Sprint 2**: solicitud de consulta, pago por QR, registro y validación de
comprobantes, habilitación de consulta, chat de texto, llamada de audio, videollamada. El chat que
se ve hoy en la app es solo de ejemplo (datos de prueba, no persiste en Firestore).

**Sprint 3 restante** (historial de consultas, estado de consulta, finalización, calificaciones
persistidas, comprobante de consulta, agenda de consultas) **depende del Sprint 2**: todas esas
funciones necesitan que exista una "consulta" real en la colección `consultas`, y esa colección
recién se empieza a llenar cuando se construya el flujo de solicitud/pago del Sprint 2.

## Cuentas de prueba

Hay cuentas de prueba con correos `@doctop.test` para administrador, superadmin y doctor. Pide las
contraseñas por chat directo (no están en este repositorio ni en el historial de commits).
