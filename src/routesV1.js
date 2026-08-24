const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, User, Product, Order, OrderItem } = require('./db');
const auth = require('./middleware/auth');
const { errorResponse, parseId, validateProductInput } = require('./utils');

const router = express.Router();

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return errorResponse(res, 422, 'VALIDATION_ERROR', 'Email y contraseña son obligatorios.');

    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Credenciales incorrectas.');
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, nombre: user.nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
    );

    return res.status(200).json({
      token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '2h'
    });
  } catch (error) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'No se pudo procesar el login.');
  }
});

router.get('/productos', auth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const search = String(req.query.search || '').trim();
    const where = { activo: true };
    if (search) where.nombre = { [Op.like]: `%${search}%` };

    const { count, rows } = await Product.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['id', 'ASC']]
    });

    return res.status(200).json({
      data: rows,
      meta: { page, limit, total: count, totalPages: Math.ceil(count / limit), version: 'v1' }
    });
  } catch (error) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'No se pudieron consultar los productos.');
  }
});

router.post('/productos', auth, async (req, res) => {
  try {
    const errors = validateProductInput(req.body, false);
    if (errors.length) return errorResponse(res, 422, 'VALIDATION_ERROR', 'Datos del producto inválidos.', errors);

    const product = await Product.create({
      nombre: String(req.body.nombre).trim(),
      descripcion: req.body.descripcion,
      precio: req.body.precio,
      stock: req.body.stock,
      activo: req.body.activo
    });

    return res.status(201).set('Location', `/api/v1/productos/${product.id}`).json({
      data: product,
      meta: { id: product.id, creado: product.createdAt, actualizado: product.updatedAt, version: 'v1' }
    });
  } catch (error) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'No se pudo crear el producto.');
  }
});

router.get('/productos/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const product = await Product.findByPk(id);
  if (!product) return errorResponse(res, 404, 'NOT_FOUND', 'Producto no encontrado.');
  return res.status(200).json({ data: product, meta: { version: 'v1' } });
});

router.put('/productos/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const product = await Product.findByPk(id);
  if (!product) return errorResponse(res, 404, 'NOT_FOUND', 'Producto no encontrado.');

  const errors = validateProductInput(req.body, false);
  if (errors.length) return errorResponse(res, 422, 'VALIDATION_ERROR', 'Datos del producto inválidos.', errors);

  await product.update(req.body);
  return res.status(200).json({ data: product, meta: { actualizado: product.updatedAt, version: 'v1' } });
});

router.patch('/productos/:id', auth, async (req, res) => {
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
  return res.status(200).json({ data: product, meta: { actualizado: product.updatedAt, version: 'v1' } });
});

router.delete('/productos/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const product = await Product.findByPk(id);
  if (!product) return errorResponse(res, 404, 'NOT_FOUND', 'Producto no encontrado.');
  await product.update({ activo: false });
  return res.status(204).send();
});

const includeItems = [{ model: OrderItem, as: 'items', include: [Product] }];

router.get('/pedidos', auth, async (req, res) => {
  const orders = await Order.findAll({ where: { userId: req.user.sub }, include: includeItems, order: [['createdAt', 'DESC']] });
  return res.status(200).json({ data: orders, meta: { total: orders.length, version: 'v1' } });
});

router.post('/pedidos', auth, async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || !items.length) return errorResponse(res, 422, 'VALIDATION_ERROR', 'El pedido debe contener al menos un ítem.');

  const transaction = await sequelize.transaction();
  try {
    const order = await Order.create({ userId: req.user.sub, total: 0, estado: 'PENDIENTE' }, { transaction });
    let total = 0;

    for (const item of items) {
      const productId = parseId(item.productId);
      const cantidad = Number(item.cantidad);
      if (!productId || !Number.isInteger(cantidad) || cantidad <= 0) throw new Error('Cada ítem requiere productId y cantidad entera mayor a cero.');

      const product = await Product.findByPk(productId, { transaction });
      if (!product || !product.activo) throw new Error(`Producto ${productId} no existe o está inactivo.`);
      if (product.stock < cantidad) throw new Error(`Stock insuficiente para ${product.nombre}. Disponible: ${product.stock}.`);

      const subtotal = Number(product.precio) * cantidad;
      total += subtotal;
      await OrderItem.create({ orderId: order.id, productId, cantidad, precioUnitario: product.precio, subtotal }, { transaction });
      await product.update({ stock: product.stock - cantidad }, { transaction });
    }

    await order.update({ total }, { transaction });
    await transaction.commit();
    const created = await Order.findByPk(order.id, { include: includeItems });

    return res.status(201).set('Location', `/api/v1/pedidos/${order.id}`).json({
      data: created,
      meta: { id: order.id, creado: order.createdAt, actualizado: order.updatedAt, version: 'v1' }
    });
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, 422, 'BUSINESS_VALIDATION_ERROR', error.message);
  }
});

router.get('/pedidos/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const order = await Order.findOne({ where: { id, userId: req.user.sub }, include: includeItems });
  if (!order) return errorResponse(res, 404, 'NOT_FOUND', 'Pedido no encontrado.');
  return res.status(200).json({ data: order, meta: { version: 'v1' } });
});

router.put('/pedidos/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const order = await Order.findOne({ where: { id, userId: req.user.sub } });
  if (!order) return errorResponse(res, 404, 'NOT_FOUND', 'Pedido no encontrado.');
  const valid = ['PENDIENTE', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
  if (!valid.includes(req.body?.estado)) return errorResponse(res, 422, 'VALIDATION_ERROR', 'Estado de pedido inválido.');
  await order.update({ estado: req.body.estado });
  return res.status(200).json({ data: order, meta: { version: 'v1' } });
});

router.patch('/pedidos/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const order = await Order.findOne({ where: { id, userId: req.user.sub } });
  if (!order) return errorResponse(res, 404, 'NOT_FOUND', 'Pedido no encontrado.');
  const valid = ['PENDIENTE', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
  if (!valid.includes(req.body?.estado)) return errorResponse(res, 422, 'VALIDATION_ERROR', 'Estado de pedido inválido.');
  await order.update({ estado: req.body.estado });
  return res.status(200).json({ data: order, meta: { version: 'v1' } });
});

router.delete('/pedidos/:id', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const order = await Order.findOne({ where: { id, userId: req.user.sub } });
  if (!order) return errorResponse(res, 404, 'NOT_FOUND', 'Pedido no encontrado.');
  await order.update({ estado: 'CANCELADO' });
  return res.status(204).send();
});

router.get('/pedidos/:id/items', auth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return errorResponse(res, 400, 'INVALID_ID', 'El id debe ser un entero positivo.');
  const order = await Order.findOne({ where: { id, userId: req.user.sub } });
  if (!order) return errorResponse(res, 404, 'NOT_FOUND', 'Pedido no encontrado.');
  const items = await OrderItem.findAll({ where: { orderId: id }, include: [Product], order: [['id', 'ASC']] });
  return res.status(200).json({ data: items, meta: { total: items.length, version: 'v1' } });
});

module.exports = router;
