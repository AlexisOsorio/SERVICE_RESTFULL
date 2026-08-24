require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapi = require('../openapi/openapi.json');
const { sequelize, seed } = require('./db');
const routesV1 = require('./routesV1');
const routesProductsV2 = require('./v2/products');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.status(200).json({
  service: 'Service  - API RESTFULL',
  version: '2.1.0',
  versions: {
    v1: '/api/v1',
    v2: '/api/v2'
  },
  docs: '/docs',
  health: '/health'
}));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', version: '2.1.0' }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api/v1', routesV1);
app.use('/api/v2/productos', routesProductsV2);

app.use((req, res) => res.status(404).json({
  error: {
    code: 'NOT_FOUND',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    details: []
  }
}));

const PORT = Number(process.env.PORT || 3000);

(async () => {
  try {
    await sequelize.sync();
    await seed();
    app.listen(PORT, () => {
      console.log(`API se ejecuta en http://localhost:${PORT}`);
      console.log(`Swagger UI: http://localhost:${PORT}/docs`);
      console.log(`v1: http://localhost:${PORT}/api/v1`);
      console.log(`v2 productos: http://localhost:${PORT}/api/v2/productos`);
    });
  } catch (error) {
    console.error('Error al iniciar:', error);
    process.exit(1);
  }
})();

module.exports = app;
