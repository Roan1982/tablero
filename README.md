# Tablero - Aplicación tipo Trello

Una aplicación web de gestión de proyectos similar a Trello, construida con Node.js, Express y SQLite.

## Características

- ✅ Creación y gestión de tableros
- ✅ Creación de listas y tarjetas
- ✅ Sistema de autenticación con JWT
- ✅ Base de datos SQLite persistente
- ✅ Interfaz drag & drop
- ✅ Asignación de usuarios a tarjetas
- ✅ Estados de tarjetas (To Do, In Progress, Done)
- ✅ **Personalización completa del tablero**
  - Fondos personalizables (colores, gradientes, patrones)
  - Colores personalizados para listas
  - Selector de colores integrado
  - Persistencia automática de configuraciones
  - Interfaz responsiva para móviles
- ✅ **Perfil de usuario completo**
  - Cambio de contraseña segura
  - Subida de avatar (almacenado como BLOB)
  - Actualización de información personal
  - Visualización de avatar en la interfaz
  - Gestión completa del perfil
- ✅ **Colaboración en tiempo real**
  - Actualizaciones instantáneas de tarjetas y listas
  - Indicadores visuales cuando alguien está editando
  - Sincronización automática entre usuarios
  - WebSockets para comunicación en tiempo real
  - Feedback visual de actividad colaborativa

## Personalización del Tablero

La aplicación incluye un sistema completo de personalización que permite a los usuarios adaptar la apariencia de sus tableros según sus preferencias.

### Cómo usar la personalización

1. **Acceder al panel**: Haz clic en el botón 🎨 "Personalizar tablero" en la barra superior
2. **Seleccionar tipo de fondo**:
   - **Color**: Fondo sólido con un color personalizado
   - **Gradiente**: Transición suave entre dos colores
   - **Patrón**: Fondos con texturas o diseños
   - **Imagen**: (Próximamente) Fondos con imágenes personalizadas
3. **Elegir colores**:
   - Usa los colores predefinidos haciendo clic en las opciones
   - O selecciona colores personalizados con el selector de color
4. **Personalizar listas**: Cambia el color de las listas para organizar mejor tus proyectos
5. **Guardar cambios**: Los cambios se aplican inmediatamente y se guardan automáticamente

### Características técnicas

- **Persistencia**: Todas las configuraciones se guardan automáticamente en el navegador
- **Responsive**: El panel de personalización funciona perfectamente en dispositivos móviles
- **Temas**: Compatible con el sistema de temas claro/oscuro existente
- **Performance**: Cambios aplicados con CSS custom properties para máxima eficiencia

## Perfil de Usuario

La aplicación incluye un sistema completo de gestión de perfil de usuario que permite a los usuarios personalizar su experiencia y mantener su información actualizada.

### Funcionalidades del perfil

1. **Información Personal**
   - Actualización de nombre y email
   - Validación de datos en tiempo real

2. **Cambio de Contraseña**
   - Verificación de contraseña actual
   - Confirmación de nueva contraseña
   - Validación de seguridad (mínimo 6 caracteres)

3. **Avatar de Usuario**
   - Subida de imágenes personalizadas
   - Almacenamiento como BLOB en base de datos
   - Validación de tipo y tamaño de archivo (máx. 2MB)
   - Visualización en la interfaz principal
   - Opción de eliminar avatar

### Cómo acceder al perfil

1. **Botón de perfil**: Haz clic en el botón 👤 "Mi perfil" en la barra superior
2. **Panel completo**: Accede a todas las opciones de configuración
3. **Actualizaciones en tiempo real**: Los cambios se reflejan inmediatamente en la interfaz

### Almacenamiento de avatares

- **Formato**: Las imágenes se almacenan como datos binarios (BLOB) en SQLite
- **Validación**: Solo se aceptan archivos de imagen (JPEG, PNG, GIF, etc.)
- **Límite de tamaño**: Máximo 2MB por archivo
- **Privacidad**: Los avatares son privados y solo visibles para el usuario propietario

## Colaboración en Tiempo Real

La aplicación incluye un sistema avanzado de colaboración en tiempo real que permite a múltiples usuarios trabajar simultáneamente en el mismo tablero sin conflictos.

### Funcionalidades en tiempo real

1. **Actualizaciones Instantáneas**
   - Creación, edición y eliminación de tarjetas se refleja inmediatamente
   - Cambios en listas aparecen al instante para todos los usuarios
   - Movimiento de tarjetas entre listas se sincroniza automáticamente

2. **Indicadores de Edición**
   - Muestra quién está editando qué elemento
   - Indicadores visuales con animación de pulso
   - Feedback claro sobre actividad colaborativa

3. **Sincronización Automática**
   - No se requiere refrescar la página
   - Los cambios se propagan automáticamente a todos los usuarios conectados
   - Estado consistente entre todas las sesiones activas

### Cómo funciona la colaboración

1. **Conexión WebSocket**: Al entrar a un tablero, el usuario se conecta automáticamente
2. **Salas de Tablero**: Cada tablero tiene su propia "sala" para optimizar el rendimiento
3. **Eventos en Tiempo Real**: Todas las modificaciones generan eventos que se envían a otros usuarios
4. **Actualización UI**: La interfaz se actualiza automáticamente al recibir eventos

### Eventos soportados

- **Tarjetas**: Creación, edición, eliminación y movimiento
- **Listas**: Creación, edición, eliminación y reordenamiento
- **Asignaciones**: Adición y eliminación de usuarios en tarjetas
- **Edición**: Indicadores cuando alguien está escribiendo

### Beneficios para equipos

- **Productividad**: Eliminación de conflictos y necesidad de refrescar
- **Transparencia**: Visibilidad completa de la actividad del equipo
- **Colaboración**: Trabajo simultáneo sin interferencias
- **Experiencia**: Interfaz fluida y moderna como aplicaciones profesionales

### Tecnologías utilizadas

- **Socket.IO**: Biblioteca para WebSockets en tiempo real
- **Salas**: Optimización del rendimiento mediante segmentación
- **Eventos**: Sistema de eventos personalizado para cada tipo de cambio
- **UI Reactiva**: Actualizaciones automáticas de la interfaz de usuario
- **Base de datos**: SQLite
- **Frontend**: Vanilla JavaScript
- **Autenticación**: JWT
- **Contenedor**: Docker + Docker Compose

## Instalación y Ejecución

### Opción 1: Docker Compose (Recomendado)

```bash
# Construir y ejecutar la aplicación
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener la aplicación
docker-compose down
```

La aplicación estará disponible en `http://localhost:3000`

### Opción 2: Docker Manual

```bash
# Construir la imagen
docker build -t tablero-app .

# Ejecutar el contenedor
docker run -d -p 3000:3000 \
  -v "$(pwd)/server.js:/app/server.js" \
  -v "$(pwd)/public:/app/public" \
  -v "tablero_data:/app/data" \
  tablero-app
```

### Opción 3: Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar la aplicación
npm start
```

## Persistencia de Datos

La base de datos SQLite se almacena en un **volumen nombrado de Docker** llamado `tablero_data`. Esto significa que:

- ✅ Los datos persisten entre reinicios del contenedor
- ✅ Los datos sobreviven a actualizaciones de la aplicación
- ✅ Puedes eliminar el contenedor sin perder datos
- ✅ No hay archivos de base de datos en el sistema de archivos local

**No se requiere** un directorio `data` local - todo se maneja automáticamente con Docker.

## Estructura del Proyecto

```
tablero/
├── server.js          # Servidor Express y API
├── public/
│   ├── index.html     # Interfaz de usuario
│   ├── app.js         # Lógica del frontend
│   └── styles.css     # Estilos CSS
├── Dockerfile         # Configuración de Docker
├── docker-compose.yml # Orquestación con Docker Compose
└── package.json       # Dependencias de Node.js
```

**Nota**: La base de datos SQLite se almacena en un volumen nombrado de Docker (`tablero_data`) y no requiere un directorio `data` local.

## Tecnologías Utilizadas

- **Backend**: Node.js + Express + Socket.IO
- **Base de datos**: SQLite con BLOB para avatares
- **Frontend**: Vanilla JavaScript + Socket.IO Client
- **Autenticación**: JWT (JSON Web Tokens)
- **Tiempo Real**: WebSockets con Socket.IO
- **Contenedor**: Docker + Docker Compose
- **Persistencia**: Volúmenes nombrados de Docker
- **Estilos**: CSS con variables personalizadas y temas

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### Perfil de Usuario
- `GET /api/me` - Obtener información del usuario actual
- `PUT /api/me` - Actualizar información del perfil (nombre, email)
- `PUT /api/me/password` - Cambiar contraseña
- `POST /api/me/avatar` - Subir avatar (base64)
- `GET /api/me/avatar` - Obtener avatar del usuario
- `DELETE /api/me/avatar` - Eliminar avatar

### Tableros
- `GET /api/boards` - Obtener tableros del usuario
- `POST /api/boards` - Crear nuevo tablero
- `GET /api/boards/:id` - Obtener tablero específico
- `PUT /api/boards/:id` - Actualizar tablero
- `DELETE /api/boards/:id` - Eliminar tablero

### Listas
- `POST /api/boards/:boardId/lists` - Crear lista
- `PUT /api/boards/:boardId/lists/:listId` - Actualizar lista
- `DELETE /api/boards/:boardId/lists/:listId` - Eliminar lista

### Tarjetas
- `POST /api/boards/:boardId/lists/:listId/cards` - Crear tarjeta
- `PUT /api/boards/:boardId/lists/:listId/cards/:cardId` - Actualizar tarjeta
- `DELETE /api/boards/:boardId/lists/:listId/cards/:cardId` - Eliminar tarjeta

## Eventos WebSocket

La aplicación utiliza WebSockets para comunicación en tiempo real. Los eventos se emiten automáticamente cuando ocurren cambios.

### Eventos de Conexión
- `join-board` - Unirse a la sala de un tablero
- `leave-board` - Salir de la sala de un tablero

### Eventos de Edición
- `start-editing` - Usuario comienza a editar un elemento
- `stop-editing` - Usuario termina de editar un elemento

### Eventos de Tarjetas
- `card-created` - Nueva tarjeta creada
- `card-updated` - Tarjeta modificada
- `card-deleted` - Tarjeta eliminada
- `card-moved` - Tarjeta movida entre listas
- `card-assignee-added` - Usuario asignado a tarjeta
- `card-assignee-removed` - Usuario desasignado de tarjeta

### Eventos de Listas
- `list-created` - Nueva lista creada
- `list-updated` - Lista modificada
- `list-deleted` - Lista eliminada
- `lists-reordered` - Listas reordenadas

### Eventos Recibidos
- `user-editing` - Otro usuario está editando un elemento

## Desarrollo

Para desarrollo local, modifica los archivos y reinicia el servidor. Con Docker Compose, los cambios en `server.js` y `public/` se reflejan automáticamente.

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.