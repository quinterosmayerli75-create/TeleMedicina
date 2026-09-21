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

## Reglas de Firebase Storage (fotos, títulos, evidencias y adjuntos del chat)

El archivo `storage.rules` en la raíz del repo define quién puede subir qué. Publícalo en
**Firebase Console → Storage → Reglas**. Sin estas reglas las subidas de fotos y adjuntos fallan y la app
muestra un mensaje que apunta a este paso. Resumen:

- `usuarios/{uid}/…` — foto de perfil (solo el dueño escribe, imágenes de hasta 5 MB).
- `profesionales/{uid}/…` — foto, títulos y carnet del doctor (solo el dueño escribe, imágenes de hasta 5 MB).
- `denuncias/{uid}/…` — fotos de evidencia de una denuncia (imágenes de hasta 5 MB).
- `chats/{conversacionId}/{uid}/…` — archivos, documentos, fotos, videos y audios del chat (solo los
  participantes, hasta 25 MB por archivo).

Cualquier usuario con sesión iniciada puede leer los archivos (así el paciente ve los títulos del doctor).

## CORS de Firebase Storage (necesario para el PDF del doctor)

El botón **Descargar PDF con fotos** del detalle de un doctor (Admin → Solicitudes y Admin → Doctores) arma un currículum con las fotos que
el doctor subió (perfil, títulos y carnet). Para poder incrustar esas fotos, el navegador debe poder leerlas, y
eso solo funciona si el bucket de Storage tiene CORS habilitado. Es un paso único, con la CLI de Google Cloud:

```bash
gsutil cors set cors.json gs://telemedicina-81c89.firebasestorage.app
```

Sin este paso el PDF se descarga igual, pero sin las fotos incrustadas: en su lugar deja un enlace por cada foto y el panel avisa
cuáles no se pudieron incluir. (Las fotos sí se ven siempre en pantalla, dentro del detalle del doctor.)

## Estructura de rutas

- `/` — Landing pública (sin sesión).
- `/acceso` — Login compartido para los 3 roles (el sistema detecta el rol automáticamente).
- `/registro/paciente`, `/registro/profesional` — Registro público.
- `/paciente/*`, `/doctor/*`, `/admin/*` — Paneles protegidos por rol (ver `src/router/AppRouter.jsx`).
  `/admin/*` es el mismo panel para las cuentas administrador y superadmin (ambas tienen `rol: 'administrador'`).

## Colecciones de Firestore

- `usuarios/{uid}` — Perfil común a los 3 roles (`rol`: paciente | profesional | administrador;
  `estado`: activo | pendiente | bloqueado | bloqueado_temporal | rechazado_temporal | rechazado_definitivo). El `id` del documento
  siempre es el UID de Firebase Authentication.
  - **Super admin**: es un administrador con el campo `superadmin: true` (booleano). Es distinto del administrador normal y es el
    **único** que puede crear cuentas de administrador (Admin → Roles y permisos → «Crear cuenta de administrador») o quitarles el acceso.
    Ese campo se marca **a mano** en Firebase Console (Firestore → `usuarios/<uid del super admin>` → agregar campo `superadmin` = `true`);
    `firestore.rules` impide que alguien se lo ponga desde la app. Mientras ninguna cuenta lo tenga, nadie puede crear administradores
    y la pantalla Roles avisa cómo habilitarlo.
  - **Bloqueos** (los aplica un admin desde Denuncias, Doctores o Usuarios): `estado` pasa a `bloqueado_temporal` (con `bloqueadoHasta`) o
    `bloqueado` (permanente), y se guardan `motivoBloqueo`, `bloqueadoEn`, `bloqueadoPor` y `estadoPrevio`. La persona bloqueada ve una
    pantalla con el motivo (y hasta cuándo) y puede enviar una apelación; los doctores bloqueados desaparecen de la búsqueda de pacientes.
    El bloqueo temporal termina solo al cumplirse `bloqueadoHasta`. Los ve un admin en Inicio y estadísticas (doctores bloqueados
    temporal / permanentemente), en Denuncias (pestañas de bloqueos), en Doctores y en Usuarios, y desde ahí mismo se levanta.
  - **Fotos obligatorias**: al registrarse, el paciente debe subir su foto de perfil y el profesional su foto de perfil, al menos una foto de sus
    títulos y la foto de su carnet; cada campo lo indica con el aviso «La foto es obligatoria».
  - **Datos personales del doctor**: `usuarios.edad` (número, 18 o más), `usuarios.estatura` y `usuarios.peso` (texto libre, por ejemplo
    «1.72 m» y «70 kg»). Son obligatorios en el registro del profesional y el doctor los edita desde Configuración → «Mis datos»;
    el admin los ve en el detalle de Solicitudes y de Doctores.
- `profesionales/{uid}` — Datos extendidos del profesional (especialidad, costo de consulta,
  modalidades, disponibilidad, verificación). Mismo `uid` que su documento en `usuarios`.
- `tiposProfesion` — Catálogo de especialidades, administrado desde el panel admin.
- `reportes` — Denuncias entre usuarios.
- `apelaciones` — Apelaciones de usuarios bloqueados (`usuarioId`, `mensaje`, `estado`: pendiente | aceptada | rechazada,
  `fecha`). El admin las resuelve desde Denuncias → Apelaciones. Requiere publicar las reglas nuevas de `firestore.rules`.
  La persona bloqueada las envía desde la pantalla de bloqueo que ve al entrar.
- `conversaciones/{pacienteId_doctorId}` — Chat real entre un paciente y un doctor, **construido pero desconectado por ahora**
  (la app usa el chat de ejemplo de antes, ver más abajo). Guarda `participantes`, `ultimoMensaje`, `ultimoDe`,
  `ultimaFecha` y la subcolección `mensajes` con `de`, `tipo` (texto | imagen | video | audio | documento), `texto`,
  `archivo` (`url`, `nombre`, `tamano`, `mime`) y `fecha`. Para activarlo: en `src/router/AppRouter.jsx` cambia los
  imports `../pages/paciente/Mensajes` y `../pages/doctor/Mensajes` por `.../MensajesReal` y publica `firestore.rules`
  y `storage.rules`.
- `calificaciones/{doctorId_pacienteId}` — Calificación de un paciente a un doctor (`doctorId`, `pacienteId`, `estrellas` de 1 a 5,
  `comentario` opcional, `fecha`). Hay una por paciente y doctor: si el paciente vuelve a calificar, se actualiza la suya. Cada vez que
  se guarda una, la app recalcula `profesionales.calificacionPromedio` y `profesionales.totalCalificaciones`, que usan las tarjetas, el
  filtro por estrellas y el ranking del admin. Requiere publicar `firestore.rules`.
- `reportes` incluye `evidencias`: lista de URLs de las fotos que adjuntó quien denuncia (el admin las ve en el detalle).
- `profesionales.titulos` — lista de URLs de las fotos de títulos y certificados. Se muestran completas en el perfil
  público del doctor (el carnet, el correo y el teléfono no son públicos). El doctor agrega más desde Configuración.
- `usuarios.fotoUrl` — foto de perfil. Se sube al registrarse y se cambia desde Configuración (paciente y doctor) o Mi perfil (paciente).
- `informes/{id}` — Informes médicos que redacta el doctor desde su menú **Informes médicos** (`doctorId`, `pacienteId`, y una copia de los
  datos que salen en el PDF: `doctorNombre`, `doctorEspecialidad`, `doctorCarnet`, `pacienteNombre`, `pacienteEdad`, `pacienteSexo`; más `fecha` de la
  consulta, `motivo`, `diagnostico`, `tratamiento`, `observaciones`). Cada doctor solo ve y edita los suyos; el paciente no los ve. Nota: la regla
  final de `firestore.rules` (colección no listada = solo admin) también le permite leerlos a las cuentas de administrador. Requiere publicar `firestore.rules`.
- **Panel del doctor** (`/doctor/*`): Panel principal, **Inicio**, **Buscar doctores** y **Favoritos** (son las mismas pantallas del paciente,
  para buscar a otro especialista y hacer una interconsulta; el doctor no aparece en su propia lista y no puede calificar a otros doctores porque
  las reglas solo dejan calificar a pacientes), **Mensajes**, Informes médicos y Configuración. Mensajes tiene dos pestañas: «Chats con
  pacientes» y «Chats con doctores», ambas con conversaciones de ejemplo que no se guardan. El botón «Mensaje» del perfil de otro doctor abre
  una conversación vacía en «Chats con doctores».
- **Descarga de informes médicos** (Informes médicos): botón «PDF» en cada informe de la lista, «Descargar PDF» dentro del detalle y
  «Descargar los filtrados / todos en PDF (N)» arriba de la lista.
- `profesionales.disponibilidad` — Días y horarios de atención que el doctor elige en su Panel principal:
  `{ lunes: { activo, franjas: [{ desde: "08:00", hasta: "12:00" }] }, martes: {…}, … }` (varias franjas por día). Se muestran en su perfil público.
- `consultas`, `favoritos`, `notificaciones` — Colecciones ya creadas
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
comprobantes, habilitación de consulta, llamada de audio, videollamada (los botones 📞 y 🎥 todavía no
hacen nada). El chat que se ve hoy en la app es de ejemplo (datos de prueba, no persiste en Firestore y sus
botones 📎 📷 🎤 son decorativos). El chat real ya está hecho y guardado (texto, archivos, documentos, fotos, videos y
notas de voz con Firestore + Storage): solo hay que activarlo como se explica en la colección `conversaciones`.

**Sprint 3 restante** (historial de consultas, estado de consulta, finalización, calificaciones
persistidas, comprobante de consulta, agenda de consultas) **depende del Sprint 2**: todas esas
funciones necesitan que exista una "consulta" real en la colección `consultas`, y esa colección
recién se empieza a llenar cuando se construya el flujo de solicitud/pago del Sprint 2.

## Cuentas de prueba

Hay cuentas de prueba con correos `@doctop.test` para administrador, superadmin y doctor. Pide las
contraseñas por chat directo (no están en este repositorio ni en el historial de commits).
