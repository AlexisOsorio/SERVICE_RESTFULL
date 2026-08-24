const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database/ecommerce.sqlite',
  logging: false
});

const User = sequelize.define('User', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false }
});

const Product = sequelize.define('Product', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.STRING, allowNull: true },
  precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});

const Order = sequelize.define('Order', {
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'),
    allowNull: false,
    defaultValue: 'PENDIENTE'
  }
});

const OrderItem = sequelize.define('OrderItem', {
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  precioUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});

User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

async function seed() {
  if ((await User.count()) === 0) {
    const password = await bcrypt.hash('Admin123*', 10);
    await User.create({
      nombre: 'Administrador',
      email: 'admin@ecommerce.ec',
      password
    });
  }

  if ((await Product.count()) === 0) {
    await Product.bulkCreate([
      { nombre: 'Laptop Lenovo', descripcion: 'Laptop para trabajo y estudio', precio: 799.99, stock: 10, activo: true },
      { nombre: 'Mouse inalámbrico', descripcion: 'Mouse USB inalámbrico', precio: 24.90, stock: 30, activo: true },
      { nombre: 'Teclado mecánico', descripcion: 'Teclado mecánico RGB', precio: 69.99, stock: 15, activo: true },
      { nombre: 'Monitor 24 pulgadas', descripcion: 'Monitor Full HD', precio: 149.99, stock: 12, activo: true }
    ]);
  }
}

module.exports = { sequelize, User, Product, Order, OrderItem, seed };
