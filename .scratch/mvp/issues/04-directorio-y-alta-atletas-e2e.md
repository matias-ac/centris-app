# 04: Alta y Directorio de Atletas por Recepción y Administración E2E

**Épica:** Épica 2 — Gestión de Catálogo, Membresías y Caja Inmutable (E2E)
**Paralelización:** **Ejecutable en PARALELO** con `03` (Catálogo de Planes) y con `07` (Tipos de Clase y Horarios de la Épica 3).

**What to build:**
Permitir al `Recepcionista` y al `Administrador` registrar nuevos `Atletas` en su Box y consultar el directorio y ficha individual de Atletas de punta a punta (BD $\rightarrow$ NestJS $\rightarrow$ Next.js + `shadcn/ui`). Si el email ingresado ya corresponde a un `Usuario` global de la plataforma, se crea únicamente la `Afiliación` al Box actual con rol `['atleta']` sin revelar que el usuario participa en otros Boxes; si no existe, se aprovisiona la identidad global `Usuario` y su `Afiliación` en una misma operación.

**Blocked by:** 02: Identidad Global, Autenticación, Selector de Box y Guard de 4 Roles Componibles E2E

**Status:** ready-for-agent

## Acceptance Criteria (TDD / BDD)

- [ ] **Alta de Atleta con vinculación transparente de Usuario global y `password_hash` nullable**: **Given** un `Recepcionista` o `Administrador` en la pantalla de Directorio de Atletas, **When** da de alta a una persona por nombre y email (validados con Zod), **Then** el sistema crea su `Usuario` con `password_hash = NULL` (si el email no existía, para que el Atleta defina su contraseña en su primer ingreso) o reutiliza el `Usuario` existente (sin tocar su `password_hash`) y crea su `Afiliación` con `roles = ['atleta']` en el Box activo, devolviendo una respuesta idéntica sin filtrar información ni credenciales de otros Boxes.
- [ ] **Afiliación ya existente en el mismo Box**: **Given** un Usuario que ya es `Coach` en el mismo Box (`roles = ['coach']`), **When** Recepción lo da de alta como `Atleta`, **Then** se agrega `'atleta'` a su array de roles en la `Afiliación` existente (`['coach', 'atleta']`) sin duplicar la fila de Afiliación (`UNIQUE (box_id, usuario_id)`).
- [ ] **Buscador, ficha y Soft Delete**: **Given** el listado de Atletas del Box en `apps/web`, **When** el `Recepcionista` o `Administrador` busca por nombre o email, **Then** visualiza únicamente los Atletas afiliados al Box activo (y nunca credenciales ni datos de otros Boxes), pudiendo editar datos operativos o desactivar la Afiliación (`deleted_at`).
- [ ] **Restricción para Coach y Atleta**: **Given** un usuario con rol exclusivo de `Coach` o `Atleta`, **When** intenta acceder al endpoint o pantalla de alta/directorio general de Atletas, **Then** recibe `403 Forbidden`.
