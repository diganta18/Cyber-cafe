'use strict';
const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

/**
 * Run after express-validator chains.
 * If there are errors, respond with 400 and the list of messages.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(
      res,
      'Validation failed',
      400,
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
}

module.exports = validate;
