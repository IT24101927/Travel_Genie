const { errorResponse } = require('../utils/helpers');

function badRequest(res, message) {
  return res.status(400).json(errorResponse(message));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function positiveIntParam(paramName, label = paramName) {
  return (req, res, next) => {
    const value = parseInt(req.params[paramName], 10);
    if (!Number.isInteger(value) || value <= 0) {
      return badRequest(res, `${label} must be a positive integer`);
    }
    next();
  };
}

function requireFields(fields) {
  return (req, res, next) => {
    if (!isPlainObject(req.body)) {
      return badRequest(res, 'Request body must be a JSON object');
    }

    const missing = fields.filter((field) => {
      const value = req.body[field];
      if (value === undefined || value === null) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    });

    if (missing.length) {
      return badRequest(res, `Missing required fields: ${missing.join(', ')}`);
    }

    next();
  };
}

function requireAtLeastOneField(fields) {
  return (req, res, next) => {
    if (!isPlainObject(req.body)) {
      return badRequest(res, 'Request body must be a JSON object');
    }

    const hasAtLeastOne = fields.some((field) => Object.prototype.hasOwnProperty.call(req.body, field));
    if (!hasAtLeastOne) {
      return badRequest(res, `At least one updatable field is required: ${fields.join(', ')}`);
    }

    next();
  };
}

function enumField(field, allowedValues, { required = false } = {}) {
  const allowed = new Set(allowedValues);

  return (req, res, next) => {
    const value = req.body?.[field];

    if (value === undefined || value === null || value === '') {
      if (required) {
        return badRequest(res, `${field} is required`);
      }
      return next();
    }

    if (!allowed.has(value)) {
      return badRequest(res, `${field} must be one of: ${allowedValues.join(', ')}`);
    }

    next();
  };
}

function numberField(field, { integer = false, min, max, required = false } = {}) {
  return (req, res, next) => {
    const raw = req.body?.[field];

    if (raw === undefined || raw === null || raw === '') {
      if (required) {
        return badRequest(res, `${field} is required`);
      }
      return next();
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return badRequest(res, `${field} must be a valid number`);
    }

    if (integer && !Number.isInteger(value)) {
      return badRequest(res, `${field} must be an integer`);
    }

    if (min !== undefined && value < min) {
      return badRequest(res, `${field} must be greater than or equal to ${min}`);
    }

    if (max !== undefined && value > max) {
      return badRequest(res, `${field} must be less than or equal to ${max}`);
    }

    next();
  };
}

module.exports = {
  positiveIntParam,
  requireFields,
  requireAtLeastOneField,
  enumField,
  numberField,
};
