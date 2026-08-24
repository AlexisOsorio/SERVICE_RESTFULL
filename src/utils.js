function errorResponse(res, status, code, message, details = []) {
  return res.status(status).json({ error: { code, message, details } });
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateProductInput(body, partial = false) {
  const errors = [];
  if (!partial && !body?.nombre) errors.push('nombre es obligatorio.');
  if (!partial && body?.precio === undefined) errors.push('precio es obligatorio.');
  if (!partial && body?.stock === undefined) errors.push('stock es obligatorio.');
  if (!partial && body?.activo === undefined) errors.push('activo es obligatorio.');

  if (body?.precio !== undefined && (!Number.isFinite(Number(body.precio)) || Number(body.precio) < 0)) {
    errors.push('precio debe ser un número mayor o igual a 0.');
  }
  if (body?.stock !== undefined && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) {
    errors.push('stock debe ser un entero mayor o igual a 0.');
  }

  return errors;
}

module.exports = { errorResponse, parseId, validateProductInput };
