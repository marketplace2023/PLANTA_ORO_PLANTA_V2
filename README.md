# Panel de Planta · Ecosistema FUR

Tablero de gestión de una planta de beneficio de oro. Consume la API de `../planta_beneficio_oro` y respeta el diseño original
(`docs/design.md`: navy + gold, Inter / JetBrains Mono, estados con icono + texto + color).

**Pantallas y qué se puede hacer en cada una** (según el permiso del usuario en la planta):

| Pantalla | Gestión |
|---|---|
| Resumen | KPIs, alertas, flujo de proceso, OT vencidas, stock bajo mínimo |
| Mantenimiento | Crear/editar órdenes de trabajo, cambiar su estado, registrar repuestos y costos, solicitar compra; crear/editar planes y generar OT |
| Inventario | Crear/editar ítems, ingresos, salidas, transferencias y ajustes; almacenes y ubicaciones; solicitar reposición |
| Compras | Crear/editar requisiciones, enviar, aprobar/rechazar, pedir cotizaciones (RFQ), adjudicar, recibir |
| Presupuestos | Proyectos, presupuestos (capítulos, partidas), APU, libro de precios, escenarios y valorizaciones (editores en `/budgets/:id` y `/budgets/apus/:id`) |
| Activos | Crear, editar y dar de baja |
| Documentos | Subir, nueva versión, editar, archivar y descargar |
| Equipo | Asignar y retirar roles |
| Procesos | Mapa de etapas, conexiones y redes (lectura) |

**Fuera de alcance:** Marketplace, Proveedores, Servicios Profesionales y Cursos.

## Registro y acceso

Hay **una sola cuenta para todos los portales**: se crea desde «Crea una» en el login (nombre, apellido, correo y contraseña de al menos 10 caracteres) y esa misma credencial entra a los demás portales. Crear la cuenta no da acceso a nada por sí sola: al entrar por primera vez sin ninguna planta asignada, la persona **pide acceso a una planta** (de las que ya puede ver) y el administrador del ecosistema la aprueba eligiendo el rol (Administración → Solicitudes de acceso). Puede retirar sus solicitudes pendientes. Mientras la solicitud esté pendiente se puede preparar el perfil, pero no operar. La política de seguridad definitiva está por analizar.

## Ejecutar

```bash
# En ../planta_beneficio_oro
npm run db:local        # Postgres local (:54320)
npm run dev:api         # API en :3000

# En esta carpeta
npm install
npm run dev             # http://localhost:5174
```

En desarrollo, Vite reenvía `/api` a `http://localhost:3000` (ver `vite.config.ts`): no hay que configurar CORS.
Usuarios de demo (contraseña `fur-local-2026`): `gerente@fur.local`, `mantenimiento@fur.local`, `almacen@fur.local`, `compras@fur.local`…

Verificación: `npm run lint && npm test && npm run build`.
