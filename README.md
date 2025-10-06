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

- **Backend**: Node.js + Express
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

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

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