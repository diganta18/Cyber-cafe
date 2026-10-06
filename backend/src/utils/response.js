'use strict';

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {number} [statusCode=200]
 */
function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

/**
 * Send a failure response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=400]
 * @param {Array} [errors]
 */
function fail(res, message, statusCode = 400, errors) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

module.exports = { ok, fail };
