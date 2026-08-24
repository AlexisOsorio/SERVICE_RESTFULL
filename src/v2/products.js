const express = require('express');
const { Product } = require('../db');
const auth = require('../middleware/auth');
const rateLimitV2 = require('./rateLimit');
const { errorResponse, parseId, validateProductInput } = require('../utils');

const router = express.Router();
router.use(rateLimitV2);

function setRateHeaders(res) {
  res.set('X-RateLimit-Limit', String(Number(process.env.V2_RATE_LIMIT_MAX || 5)));
}

router.get('/', auth, async (req, res) => {
  setRateHeaders(res);
  const products = await Product.findAll({ where: { activo: true }, order: [['id', 'ASC']] });
  return res.status(200).json({
    data: products,
    meta: {
      version: 'v2',
      total: products.length,
      rateLimit: { limit: Number(process.env.V2_RATE_LIMIT_MAX || 5) }
    }
  });
});

router.post('/', auth, async (req, res) => {
  setRateHeaders(res);
  const errors = validateProductInput(req.body, false);
  if (errors.length) return errorResponse(res, 422, 'VALIDATION_ERROR', 'Datos del producto inválidos.', errors);

  const product = await Product.create({
    nombre: String(req.body.nombre).trim(),
    descripcion: req.body.descripcion,
    precio: req.body.precio,
    stock: req.body.stock,
    activo: req.body.activo
  });

  return res.status(201).set('Location', `/api/v2/productos/${product.id}`).json({
    data: product,
    meta: {
      id: product.id,
      creado: product.createdAt,
      actualizado: product.updatedAt,
      version: 'v2',
      rateLimit: { limit: Number(process.env.V2_RATE_LIMIT_MAX || 5) }
    }
  });
});

router.get('/:id', auth, async (req, res) => {
  setRateHeaders(res);
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const product = await Product.findByPk(id);
  if (!product) return errorResponse(res, 404, 'NOT_FOUND', 'Producto no encontrado.');
  return res.status(200).json({ data: product, meta: { version: 'v2' } });
});

router.put('/:id', auth, async (req, res) => {
  setRateHeaders(res);
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const product = await Product.findByPk(id);
  if (!product) return errorResponse(res, 404, 'NOT_FOUND', 'Producto no encontrado.');
  const errors = validateProductInput(req.body, false);
  if (errors.length) return errorResponse(res, 422, 'VALIDATION_ERROR', 'Datos del producto inválidos.', errors);
  await product.update(req.body);
  return res.status(200).json({ data: product, meta: { actualizado: product.updatedAt, version: 'v2' } });
});

router.patch('/:id', auth, async (req, res) => {
  setRateHeaders(res);
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const product = await Product.findByPk(id);
  if (!product) return errorResponse(res, 404, 'NOT_FOUND', 'Producto no encontrado.');
  const errors = validateProductInput(req.body, true);
  if (errors.length) return errorResponse(res, 422, 'VALIDATION_ERROR', 'Datos del producto inválidos.', errors);
  const allowed = ['nombre', 'descripcion', 'precio', 'stock', 'activo'];
  const changes = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
  if (!Object.keys(changes).length) return errorResponse(res, 422, 'VALIDATION_ERROR', 'No se recibieron campos para modificar.');
  await product.update(changes);
  return res.status(200).json({ data: product, meta: { actualizado: product.updatedAt, version: 'v2' } });
});

router.delete('/:id', auth, async (req, res) => {
  setRateHeaders(res);
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const product = await Product.findByPk(id);
  if (!product) return errorResponse(res, 404, 'NOT_FOUND', 'Producto no encontrado.');
  await product.update({ activo: false });
  return res.status(204).send();
});

module.exports = router;
