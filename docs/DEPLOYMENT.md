# Guía Paso a Paso de Despliegue en Producción (Zero-Cost Stack)

Esta guía documenta el procedimiento secuencial para desplegar la arquitectura completa de **Centris (`centris-app`)** utilizando capas gratuitas de alta confiabilidad:

1. **Base de Datos**: [Neon](https://neon.tech) (PostgreSQL Serverless con soporte completo de RLS forzado y extensiones).
2. **Backend API**: [Render](https://render.com) (Web Service Node.js / NestJS con compilación monorepo pnpm).
3. **Frontend Web**: [Vercel](https://vercel.com) (Next.js 15 App Router con Server Actions y sesión JWT).

> [!NOTE]
> **Ambientes de Producción Activos**:
> - **Frontend Web**: [https://centris-app.vercel.app](https://centris-app.vercel.app)
> - **Backend API**: [https://centris-app.onrender.com/api/salud](https://centris-app.onrender.com/api/salud)
> - **Base de Datos**: Neon Serverless Postgres (`centris-db`, AWS `us-east-1`)

```mermaid
flowchart LR
    Browser["Navegador del Usuario"] --> Vercel["Vercel (Next.js 15 Web)"]
    Vercel -- "Server Actions / API Calls" --> Render["Render (NestJS API)"]
    Render -- "Drizzle ORM (RLS Forzado)" --> Neon["Neon (PostgreSQL Serverless)"]
```

---

## Orden de Despliegue

El orden es estrictamente dependiente:

```mermaid
flowchart TD
    Paso1["Paso 1: Neon (Postgres)"] -->|Obtener DATABASE_URL| Paso2["Paso 2: Migraciones y Seed (CLI)"]
    Paso2 --> Paso3["Paso 3: Render (NestJS API)"]
    Paso3 -->|Obtener API URL| Paso4["Paso 4: Vercel (Next.js Web)"]
    Paso4 -->|Obtener Web URL| Paso5["Paso 5: Ajustar CORS en Render"]
```

---

## Paso 0: Subir la rama de CD a GitHub

Desde tu terminal local, publicá la rama `chore/cd-deployment-setup` que ya cuenta con los adaptadores de despliegue (`render.yaml`, escucha en `0.0.0.0`, CORS dinámico y soporte SSL para Postgres remoto):

```bash
git push -u origin chore/cd-deployment-setup
```

> [!NOTE]
> Podés conectar los servicios directamente a esta rama para probar el primer despliegue, y una vez validado crear el Pull Request hacia `main`.

---

## Paso 1: Configurar la Base de Datos en Neon

### 1.1. Crear cuenta y proyecto en Neon
1. Ingresá a [neon.tech](https://neon.tech) e iniciá sesión con tu cuenta de GitHub.
2. Hacé clic en **"Create Project"**.
3. Completá los campos:
   - **Name**: `centris-db`
   - **Postgres version**: `16` o `17` (recomendado 16/17)
   - **Region**: `AWS / us-east-2 (Ohio)` o `us-east-1 (N. Virginia)` *(es clave elegir US East para tener la menor latencia posible con Render y Vercel)*.
4. Hacé clic en **"Create project"**.

### 1.2. Obtener la cadena de conexión (`DATABASE_URL`)
1. En el Dashboard del proyecto Neon, verás la sección **Connection Details**.
2. Asegurate de seleccionar:
   - Branch: `main`
   - Database: `neondb`
   - User: `neondb_owner` (o el usuario default)
   - Mode: **Pooled** o **Direct** (recomendamos el connection string estándar con `sslmode=require`).
3. Copiá la URL de conexión. Tendrá una estructura similar a:
   ```text
   postgresql://neondb_owner:npg_AbCdEf123456@ep-cool-dawn-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 1.3. Ejecutar Migraciones y Seed desde tu consola local
Con la URL de Neon copiada, ejecutá las migraciones y los datos de prueba iniciales directamente desde tu terminal local hacia Neon:

```bash
# 1. Aplicar las migraciones (creación de tablas, RLS forzado y extensiones pgcrypto/uuid-ossp)
MIGRATION_DATABASE_URL="postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require" pnpm db:migrate

# 2. Cargar los datos maestros iniciales (Boxes Norte y Sur, planes y usuarios demo)
MIGRATION_DATABASE_URL="postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require" pnpm db:seed
```

> [!TIP]
> Podés entrar a la solapa **SQL Editor** en Neon y ejecutar:
> ```sql
> SELECT slug, nombre FROM boxes;
> SELECT email, nombre FROM usuarios;
> ```
> Verificará que `Box Centris Norte`, `Box Centris Sur` y los 7 usuarios del seed ya están creados.

---

## Paso 2: Desplegar el Backend en Render

### 2.1. Crear Web Service en Render
1. Ingresá a [render.com](https://render.com) e iniciá sesión con GitHub.
2. En el Dashboard, hacé clic en **New +** $\rightarrow$ **Web Service**.
3. Seleccioná **"Build and deploy from a Git repository"** y vinculá tu repositorio `centris-app`.
4. Configurá las propiedades del servicio:
   - **Name**: `centris-api`
   - **Region**: `Ohio (US East)` *(misma región que Neon)*
   - **Branch**: `chore/cd-deployment-setup` (o `main`)
   - **Root Directory**: *(dejar en blanco)*
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm --filter @centris/api start`
   - **Instance Type**: `Free` ($0/mes)

### 2.2. Configurar Variables de Entorno en Render
En la solapa **Environment** de Render, agregá las siguientes variables:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Activa modo producción en NestJS |
| `PORT` | `10000` | Puerto asignado por Render (default en su infraestructura) |
| `DATABASE_URL` | `postgresql://neondb_owner:...@ep-...neon.tech/neondb?sslmode=require` | Cadena de conexión copiada de Neon |
| `JWT_SECRET` | *(generar con comando abajo)* | Secreto para firmar tokens JWT |
| `CORS_ORIGIN` | `*` *(temporal, se ajustará en el Paso 4)* | Orígenes habilitados |

> [!NOTE]
> Para generar un `JWT_SECRET` seguro podés correr en tu terminal:
> ```bash
> openssl rand -base64 32
> ```

### 2.3. Health Check
En la sección **Advanced** de la configuración de Render:
- **Health Check Path**: `/api/salud`

Hacé clic en **"Create Web Service"**.
Render iniciará el clonado, la instalación con `pnpm`, la compilación monorepo con `turbo` y el arranque de NestJS.

Una vez que figure en verde (**Live**), probá en tu navegador la URL pública que te da Render:
```text
https://centris-api.onrender.com/api/salud
```
Debe responder con JSON indicando estado `OK`, rol activo y RLS sin bypass.

---

## Paso 3: Desplegar el Frontend en Vercel

### 3.1. Importar el Monorepo en Vercel
1. Ingresá a [vercel.com](https://vercel.com) e iniciá sesión con GitHub.
2. Hacé clic en **Add New...** $\rightarrow$ **Project**.
3. Seleccioná el repositorio `centris-app` y hacé clic en **Import**.

### 3.2. Configuración de Directorio y Build
1. En **Configure Project**:
   - **Project Name**: `centris-app` o `centris-web`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Hacé clic en **Edit** y seleccioná `apps/web`.
     *(Asegurate de que la opción "Include source files outside of the Root Directory in the Build Step" esté activada para que Vercel pueda acceder al paquete `@centris/shared`)*.
   - **Build and Output Settings**: Dejar por defecto (Vercel detecta automáticamente `next build`).

### 3.3. Configurar Variables de Entorno en Vercel
En la sección **Environment Variables**, agregá:

| Variable | Valor |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://centris-api.onrender.com/api` *(la URL pública de tu API en Render terminada en `/api`)* |
| `AUTH_SECRET` | *(misma clave aleatoria de 32 chars o una nueva generada con `openssl rand -base64 32`)* |
| `AUTH_TRUST_HOST` | `true` |

3. Hacé clic en **Deploy**.
Vercel instalará las dependencias y desplegará la interfaz de Next.js 15 en pocos segundos.

---

## Paso 4: Cierre del Circuito y Ajuste de CORS

1. Una vez desplegado el frontend en Vercel, copiá el dominio asignado (por ejemplo: `https://centris-web.vercel.app`).
2. Volvé a [Render Dashboard](https://dashboard.render.com) $\rightarrow$ tu servicio `centris-api` $\rightarrow$ **Environment**.
3. Editá la variable `CORS_ORIGIN`:
   ```text
   https://centris-web.vercel.app,http://localhost:3000
   ```
4. Guardá los cambios (Render reiniciará el servicio automáticamente en 30 segundos).

---

## Paso 5: Prueba de Humo E2E en Producción

Ingresá a tu dominio de Vercel (`https://centris-web.vercel.app`):
1. **Login**: Iniciá sesión con `admin@centris.dev` y contraseña `Centris123!`.
2. **Selector de Box**: Seleccioná **Box Centris Norte**.
3. **Planes**: Navegá a `/planes`, comprobá la lista de planes existentes y creá uno nuevo de prueba.
4. **Atletas**: Navegá a `/atletas`, comprobá el listado de atletas y la ficha de uno de ellos.

> [!NOTE]
> En la capa gratuita de Render, si no hay peticiones durante 15 minutos, la instancia entra en suspensión temporal (*idle*). La primera petición posterior tardará aproximadamente 30 segundos en despertar (*cold start*). Neon, por su parte, mantiene la persistencia intacta de forma permanente.
