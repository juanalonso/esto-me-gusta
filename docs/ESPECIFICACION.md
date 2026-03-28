# Especificación de Requisitos — "Esto me gusta"

## 1. Descripción general

Aplicación web mobile-first para catalogar productos (principalmente alimentación) indicando si gustan o no. El usuario escanea el código de barras de un producto con el móvil; si ya está registrado, se muestra su ficha; si no, se crea una nueva ficha consultando Open Food Facts. Desde un dashboard de escritorio se gestionan todos los productos.

La web estará íntegramente en **español de España**.

Monousuario. Las operaciones de escritura están protegidas con contraseña.

---

## 2. Modelo de datos

### Producto

| Campo             | Tipo          | Notas                                                                 |
|-------------------|---------------|-----------------------------------------------------------------------|
| id                | Autonumérico  | Clave primaria                                                        |
| codigo_barras     | Texto         | Código EAN/UPC. Editable desde el dashboard                           |
| nombre            | Texto         | Obtenido de Open Food Facts o introducido manualmente                 |
| foto              | Archivo local | Descargada de Open Food Facts o subida manualmente. Puede ser nula    |
| valoracion        | Enumerado     | "me_gusta", "pse", "no_me_gusta"                                     |
| notas             | Texto largo   | Opcional. Comentarios libres del usuario                              |
| fecha_alta        | Fecha/hora    | Asignada automáticamente al crear el registro                         |
| pendiente_revision| Booleano      | `true` al crear. Se pone a `false` manualmente desde el dashboard     |
| eliminado         | Booleano      | Soft delete. `false` por defecto                                      |

---

## 3. Flujo móvil (escaneo)

### 3.1 Captura del código de barras

1. El usuario abre la web en el móvil.
2. Pulsa un botón para activar la cámara y apuntar al código de barras.
3. Una librería JavaScript decodifica el código de barras en el cliente.
   - Se priorizará una librería JS potente del lado del cliente (tipo ZXing-js o QuaggaJS) para evitar el envío de imágenes al servidor.
4. El código decodificado se envía al servidor.

### 3.2 Producto existente

1. El servidor busca el código de barras en la base de datos entre los productos **no eliminados**.
2. Si existe, devuelve la ficha del producto.
3. Se muestra en modo **solo lectura**: nombre, foto, valoración, notas y fecha de alta.
4. No se puede modificar nada desde el móvil en este caso.

> **Nota:** Los productos en la papelera (eliminados) se ignoran en la búsqueda. Si se escanea un código de barras cuyo producto está eliminado, se trata como producto nuevo.

### 3.3 Producto nuevo

1. El servidor no encuentra el código en la base de datos.
2. El servidor consulta **Open Food Facts** con ese código de barras.
   - Si hay datos: se recuperan nombre y foto (lo que esté disponible).
   - Si no hay datos o el producto no existe en OFF: la ficha se crea solo con el código de barras.
3. Se muestra al usuario una ficha con los datos obtenidos (o vacía salvo el código).
4. El usuario **debe** indicar su valoración: "Me gusta", "Psé" o "No me gusta".
5. El usuario **puede** escribir una nota.
6. Pulsa **"Guardar"**.
7. Se crea el registro con `pendiente_revision = true`.

---

## 4. Dashboard (escritorio)

### 4.1 Vista de listado

Accesible sin contraseña. Muestra todos los productos **no eliminados** en formato tabla o tarjetas.

**Ordenación:**
- Por nombre (A-Z, Z-A)
- Por fecha de alta (más recientes primero, más antiguos primero)

**Filtros:**
- Por valoración: Me gusta / Psé / No me gusta / Todos
- Por estado de revisión: Pendientes / Revisados / Todos

**Búsqueda:**
- Por nombre del producto (texto libre)

### 4.2 Edición de producto (protegida)

Campos editables desde el dashboard:

- **Nombre**
- **Código de barras**
- **Valoración** (Me gusta / Psé / No me gusta)
- **Notas**
- **Foto**: subir nueva, eliminar la existente
- **Pendiente de revisión**: marcar como revisado

### 4.3 Eliminación de producto (protegida)

- Soft delete: marca el producto como `eliminado = true`.
- El producto desaparece del listado principal.

### 4.4 Papelera (protegida)

- Vista separada (pestaña o sección) que muestra los productos eliminados.
- Acciones disponibles:
  - **Restaurar** un producto individual (vuelve al listado principal).
  - **Vaciar papelera**: elimina definitivamente todos los productos de la papelera. Pide confirmación antes de ejecutar.

---

## 5. Protección por contraseña

- **Contraseña hardcodeada** en la configuración del servidor.
- Protege: edición, eliminación, restauración y vaciado de papelera.
- **No protege**: la visualización del listado ni la consulta de fichas.
- **Flujo:**
  1. Al acceder al dashboard, se muestra un campo de contraseña (puede ser discreto, tipo botón "Administrar").
  2. Si la contraseña es correcta, se establece una sesión válida durante **24 horas** y se muestran los botones de edición, borrado y vaciar papelera.
  3. Si la contraseña es incorrecta, **no se muestra ningún mensaje de error**. Los botones de escritura simplemente no aparecen.

---

## 6. Gestión de fotos

- Las fotos obtenidas de Open Food Facts se **descargan y almacenan en el servidor**, no se enlazan como URL externa.
- Desde el dashboard se puede **subir una foto nueva** (que sustituye a la existente) o **eliminar** la foto actual.
- Las fotos subidas se **comprimen en el cliente** antes de enviarlas al servidor, usando una librería JavaScript de compresión (tipo browser-image-compression o Compressor.js), buscando reducir tamaño sin pérdida perceptible de calidad.

---

## 7. Requisitos no funcionales

- **Mobile first**: la interfaz principal (escaneo) está optimizada para móviles.
- **Diseño claro y atractivo**: interfaz limpia, tipografía legible, buen uso del espacio.
- **Código legible y mantenible**: proyecto pensado para perdurar. Código claro, bien estructurado y comentado donde sea necesario. Sin frameworks JS de frontend (vanilla JS).
- **Idioma**: toda la interfaz en español de España.
- **Despliegue**: servicio cloud, idealmente gratuito o de bajo coste.
- **Conexión**: se asume conexión a internet en todo momento. No se contempla modo offline.

---

## 8. Integraciones externas

### Open Food Facts

- **API pública y gratuita**.
- Se consulta al dar de alta un producto nuevo (por código de barras).
- Se extrae: nombre del producto y URL de la foto (que se descarga al servidor).
- Si la API no devuelve datos o devuelve datos parciales, se crea la ficha con lo disponible.

---

## 9. Decisiones técnicas

| Decisión                        | Elección                          | Notas                                                |
|---------------------------------|-----------------------------------|------------------------------------------------------|
| Servidor                        | Node.js + Express                 | Framework minimalista, equivalente a Flask            |
| Base de datos                   | SQLite (better-sqlite3)           | Un solo archivo, sin servidor, ideal para monousuario |
| Librería de escaneo de códigos  | html5-qrcode                      | Buena UX móvil con mínima configuración              |
| Librería de compresión de fotos | browser-image-compression         | API basada en promesas, bien mantenida               |
| Despliegue en desarrollo        | Render Free                       | Para desarrollo y pruebas                            |
| Despliegue en producción        | Render Starter (7 $/mes)          | Instancia siempre activa + disco persistente         |

---

## 10. Fuera de alcance (versión 1)

- Multiusuario y gestión de cuentas.
- Categorías o etiquetas de productos.
- Modo offline / PWA.
- Histórico de cambios en las fichas.
- Exportación/importación de datos.
