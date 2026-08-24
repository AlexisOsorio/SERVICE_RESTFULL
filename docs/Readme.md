1. Descripción del proyecto

    Proyecto académico desarrollado para la asignatura Ingeniería de Servicios, basado en el caso de estudio:

    Plataforma de e-commerce y gestión de pedidos con integración futura a servicios de facturación electrónica.

    El proyecto demuestra el diseño y consumo de una API RESTful aplicando:

    Arquitectura REST.
    Métodos HTTP y semántica CRUD.
    JSON.
    OpenAPI 3.0 / Swagger.
    Autenticación mediante JWT.
    Versionamiento de API.
    Rate Limiting.
    Código de estado HTTP.
    Colección de pruebas en Postman.
2. Tecnologías utilizadas
    Node.js
    Express.js
    SQLite
    Sequelize
    JSON Web Token (JWT)
    bcryptjs
    Swagger UI
    OpenAPI 3.0
    Postman
    express-rate-limit
3. Requisitos

    Instalar previamente:

    Node.js 18 o superior.
    npm.
    Postman.

    Verificar:

    node -v
    npm -v
4. Instalación

    Clonar el repositorio:

    git clone URL_DEL_REPOSITORIO

    Entrar al proyecto:

    servicios-RestFull

4. Instalar dependencias:

    npm install

    Crear el archivo .env a partir de .env.example.

    Windows
    copy .env.example .env
    Linux / macOS
    cp .env.example .env

    Ejecutar el proyecto:

    npm run dev

    También puede ejecutarse con:

    npm start

5. Configuración

    El archivo .env debe contener:

    PORT=3000

    JWT_SECRET=CAMBIAR_ESTA_CLAVE
    JWT_EXPIRES_IN=2h

    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX=100

    V2_RATE_LIMIT_WINDOW_MS=60000
    V2_RATE_LIMIT_MAX=5

6. URLs principales

    Una vez iniciado el servidor:

    API principal
    http://localhost:3000
    Health Check
    http://localhost:3000/health
    Swagger UI
    http://localhost:3000/docs
    API versión 1
    http://localhost:3000/api/v1
    API versión 2
    http://localhost:3000/api/v2

7. Credenciales de prueba

    El sistema crea automáticamente un usuario administrador para las pruebas:

    Email: admin@ecommerce.ec
    Password: Admin123*
    