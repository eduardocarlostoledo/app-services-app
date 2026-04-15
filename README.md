# Servicios Argentina

**Plataforma on-demand de servicios a domicilio** — el Uber de los oficios. Conecta clientes que necesitan electricistas, plomeros, gasistas, cerrajeros, pintores y todo tipo de profesionales con operarios verificados en tiempo real.

El usuario abre la app, publica lo que necesita, y en minutos un profesional acepta el trabajo, se desplaza con tracking GPS en vivo, ejecuta el servicio, y cobra al instante por MercadoPago o efectivo. Sin intermediarios, sin llamar a 10 números. Un flujo completo de principio a fin.

---

## Problema que resuelve

En Argentina no existe una plataforma unificada para contratar servicios domésticos de forma segura, rastreable y con pago garantizado. El mercado opera con recomendaciones boca a boca, WhatsApp y efectivo sin respaldo. Esto genera:

- **Para el cliente**: incertidumbre sobre disponibilidad, precio, tiempo de llegada y calidad del trabajo.
- **Para el profesional**: dificultad para conseguir clientes de forma constante, cobrar digitalmente, y construir reputación verificable.
- **Para ambos**: cero trazabilidad, sin mecanismo de disputa, y sin garantía de pago.

Servicios Argentina elimina esa fricción con un sistema que gestiona el ciclo completo: **descubrimiento → contratación → tracking → pago → calificación → arbitraje**.

---

## Arquitectura del sistema

El proyecto es un **monorepo** con tres aplicaciones independientes que comparten un único backend:

```
servicios-argentina/
├── backend/                          # API REST + WebSockets (Node.js + Express)
│   ├── config/                       # Configuración por entorno
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── models/               # 15+ modelos Sequelize (User, Provider, Service, Transaction...)
│   │   │   └── migrations/           # Migraciones versionadas
│   │   ├── external/                 # Integraciones de terceros
│   │   │   ├── mercadopago.service   # Checkout Pro, webhooks HMAC, split de pagos, reembolsos
│   │   │   ├── cloudinary.service    # Upload de imágenes y documentos
│   │   │   ├── whatsapp.service      # Notificaciones por WhatsApp (Twilio)
│   │   │   ├── nodemailer.service    # Emails transaccionales
│   │   │   └── afip.service          # Validación de CUIT/CUIL (compliance fiscal AR)
│   │   ├── http/
│   │   │   ├── controllers/          # Auth, Service, Payment, Provider, Admin, Category
│   │   │   ├── middlewares/          # JWT, CORS, rate limiting, sanitización XSS, HPP
│   │   │   └── routes/              # 12 módulos de rutas versionadas (/api/v1/*)
│   │   └── sockets/                 # Socket.IO server (3 namespaces: client/provider/admin)
│   └── shared/                       # Logger (Winston + rotación diaria)
│
├── frontend/                         # App mobile (React Native + Expo SDK 55)
│   ├── app/                          # Screens (Expo Router — file-based routing)
│   │   ├── index.tsx                 # Home / búsqueda de servicios
│   │   ├── login.tsx                 # Auth (email + SMS OTP + Google OAuth)
│   │   ├── publish.tsx               # Publicar solicitud de servicio
│   │   ├── notifications.tsx         # Centro de notificaciones real-time
│   │   ├── payment-methods.tsx       # MercadoPago + efectivo
│   │   ├── verify-identity.tsx       # KYC (foto DNI + selfie)
│   │   └── role-select.tsx           # Cliente / Operario
│   ├── store/                        # Estado global (Zustand)
│   └── socket.service.js             # Cliente Socket.IO con reconexión automática
│
└── admin-web/                        # Dashboard administrativo (React + TypeScript + Vite)
    ├── src/
    │   ├── pages/                    # 14 vistas de gestión
    │   │   ├── DashboardPage         # KPIs, métricas de plataforma
    │   │   ├── UsersPage             # CRUD usuarios, ban, roles
    │   │   ├── ProvidersPage         # Gestión de operarios, verificación
    │   │   ├── ServicesPage          # Monitor de servicios activos
    │   │   ├── PaymentsPage          # Transacciones, comisiones, split
    │   │   ├── DisputesPage          # Arbitraje de conflictos
    │   │   ├── KycQueuePage          # Cola de verificación de identidad
    │   │   ├── CreditsPage           # Sistema de créditos/pauta
    │   │   ├── MonitoringPage        # Health del sistema
    │   │   └── ...                   # Categories, Reviews, Notifications, Settings
    │   ├── features/                 # Redux Toolkit slices (11 módulos)
    │   ├── components/               # Layout, tablas, KPI grids, status tags
    │   └── lib/api/                  # Cliente HTTP tipado (Axios + interceptors)
    └── vite.config.ts
```

---

## Stack tecnologico

| Capa | Tecnología |
|------|-----------|
| **Mobile app** | React Native 0.83, Expo SDK 55, Expo Router, Zustand, Socket.IO Client, React Native Maps |
| **Admin dashboard** | React 19, TypeScript, Vite, Redux Toolkit, Ant Design 5, React Router 7 |
| **Backend API** | Node.js 18+, Express 4, Sequelize 6 (ORM), Socket.IO 4 |
| **Base de datos** | PostgreSQL (relacional, transaccional) |
| **Pagos** | MercadoPago SDK v2 (Checkout Pro, webhooks HMAC-SHA256, OAuth para split, reembolsos) |
| **Autenticación** | JWT + refresh tokens, SMS OTP (Twilio), Google OAuth |
| **Archivos** | Cloudinary (imágenes, documentos KYC) |
| **Notificaciones** | Socket.IO (real-time), Nodemailer (email), Twilio (WhatsApp + SMS) |
| **Seguridad** | Helmet, CORS configurado, rate limiting (Redis-backed), HPP, XSS sanitization, input validation (express-validator), mongo-sanitize |
| **Observabilidad** | Winston (structured logging) + Daily Rotate File |
| **Deploy target** | Railway (backend + DB), Netlify (admin-web) |

---

## Features principales

### App mobile (cliente y operario)

- **Registro dual**: selección de rol (cliente / operario) con flujo de verificación diferenciado
- **Autenticación multi-factor**: email + contraseña, SMS OTP, Google Sign-In
- **Verificación de identidad (KYC)**: foto de DNI + selfie, validación CUIT/CUIL contra AFIP
- **Publicación de servicios**: el cliente describe lo que necesita, selecciona categoría, zona y presupuesto
- **Matching en tiempo real**: los operarios disponibles en la zona reciben la solicitud vía WebSocket
- **Ofertas y contraofertas**: el operario puede aceptar, rechazar, o proponer un precio diferente
- **Tracking GPS en vivo**: el cliente ve al operario acercarse en mapa (stream cada 5 segundos)
- **Chat integrado**: mensajería real-time con indicador de escritura y adjuntos
- **Pagos**: MercadoPago (Checkout Pro) o efectivo con confirmación manual
- **Notificaciones push in-app**: eventos de servicio, pagos, mensajes
- **Sistema de calificación**: reviews bidireccionales post-servicio

### Dashboard administrativo

- **KPIs en tiempo real**: usuarios, servicios, ingresos, comisiones
- **Gestión de usuarios**: CRUD, activación/desactivación, asignación de roles
- **Gestión de operarios**: aprobación, verificación de documentos, estado de cuenta MP
- **Monitor de servicios**: estado en vivo de todos los servicios activos
- **Panel de pagos**: transacciones, comisiones de plataforma (5%), split operario/plataforma
- **Sistema de créditos**: paquetes de pauta para que operarios destaquen su perfil
- **Cola de KYC**: revisión y aprobación de documentos de identidad
- **Centro de disputas**: arbitraje con historial de mensajes entre las partes
- **Broadcast de notificaciones**: envío masivo segmentado
- **Monitoreo**: health checks del sistema

### Backend (nivel fintech)

- **Flujo transaccional completo**: `requested → accepted → paid → in_progress → work_finished → completed`
- **Split de pagos**: comisión automática plataforma (5%) + pago al operario, con OAuth de MercadoPago para recibir pagos en nombre del profesional
- **Webhooks seguros**: validación HMAC-SHA256 con `timingSafeEqual`, idempotencia por `payment_id`
- **Reembolsos**: parciales y totales desde admin
- **Transacciones atómicas**: todas las operaciones de pago dentro de `sequelize.transaction()`
- **Sistema de créditos**: paquetes de 100 a 1000 créditos para destaque de operarios, con acreditación automática post-pago
- **Rate limiting**: protección contra abuso con Redis como store
- **Sanitización**: XSS, HPP, mongo-sanitize en todas las rutas
- **Logging estructurado**: Winston con niveles info/warn/error/security, rotación diaria
- **Migraciones versionadas**: esquema de DB evolucionable sin downtime

---

## Flujo de un servicio (end-to-end)

```
1. Cliente publica → "Necesito un electricista en Palermo, presupuesto $15.000"
2. Backend emite service:requested a operarios de la zona vía Socket.IO
3. Operario acepta → service:accepted → cliente ve al operario en el mapa
4. Operario llega → service:in_progress
5. Cliente paga por MercadoPago → webhook HMAC → transacción atómica
6. Operario trabaja → service:work_finished
7. Cliente confirma → service:completed → se habilitan reviews
8. Plataforma retiene 5%, operario recibe 95% en su cuenta MP conectada por OAuth
```

En caso de conflicto, cualquier parte abre una disputa y el equipo de operaciones arbitra desde el dashboard.

---

## Modelo de negocio

| Fuente de ingreso | Detalle |
|---|---|
| **Comisión por transacción** | 5% sobre cada servicio pagado por MercadoPago |
| **Créditos de pauta** | Operarios compran créditos para destacar su perfil (desde $1.500 por 100 créditos / 7 días de destaque) |
| **Escalabilidad** | El modelo no requiere empleados operativos por servicio — la plataforma es el intermediario tecnológico |

---

## Seguridad (OWASP Top 10)

- **Inyección**: input sanitization con `express-validator` + `xss-clean` + `express-mongo-sanitize`
- **Autenticación rota**: JWT con expiración, refresh tokens, rate limiting en login, SMS OTP
- **Exposición de datos**: Helmet headers, CORS restrictivo, no se exponen stack traces en producción
- **Rate limiting**: `express-rate-limit` con Redis store para endpoints sensibles
- **CSRF/XSS**: sanitización de inputs, cookie-parser con opciones seguras
- **Logging de seguridad**: eventos de autenticación fallida, webhooks inválidos, y accesos sospechosos registrados con nivel `security`

---

## Requisitos

- Node.js >= 18
- PostgreSQL
- Redis (para rate limiting en producción)
- Expo CLI (para la app mobile)
- Cuentas: MercadoPago (con credenciales OAuth), Twilio, Cloudinary, Nodemailer SMTP

## Instalacion

```bash
# Backend
cd backend
cp .env.example .env    # Configurar variables de entorno
npm install
npm run migrate
npm run dev

# Mobile app
cd frontend
cp .env.example .env
npm install
npx expo start

# Admin dashboard
cd admin-web
npm install
npm run dev
```

## Deploy

| Servicio | Plataforma | Directorio |
|----------|-----------|------------|
| Backend API | Railway | `backend/` |
| PostgreSQL | Railway | — |
| Admin Web | Netlify / Vercel | `admin-web/` |
| Mobile | Expo EAS Build | `frontend/` |

---

## Desarrollador

**Eduardo Toledo** — Full-stack developer & founder de Toledo Consultora IT.

Diseño, arquitectura e implementacion completa del sistema: desde el modelado de datos y la logica transaccional de pagos hasta las interfaces mobile y el dashboard de operaciones. Integracion con APIs de terceros (MercadoPago OAuth + HMAC, Twilio, Cloudinary, AFIP), seguridad a nivel OWASP, y WebSockets para comunicacion real-time.

---

## Licencia

Proyecto privado. Todos los derechos reservados.
