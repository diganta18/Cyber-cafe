'use strict';

/**
 * Round to 2 decimal places.
 * @param {number} n
 * @returns {number}
 */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute billed minutes based on elapsed time and block size.
 * billedMinutes = max(blockMinutes, ceil(elapsed / blockMinutes) * blockMinutes)
 *
 * @param {number} elapsedMinutes - decimal minutes elapsed
 * @param {number} blockMinutes - billing block in minutes (default 15)
 * @returns {number} billed minutes
 */
function getBilledMinutes(elapsedMinutes, blockMinutes) {
  const blocks = Math.ceil(elapsedMinutes / blockMinutes);
  return Math.max(blockMinutes, blocks * blockMinutes);
}

/**
 * Compute time charge.
 * @param {number} billedMinutes
 * @param {number} hourlyRate - in INR per hour
 * @returns {number}
 */
function getTimeCharge(billedMinutes, hourlyRate) {
  return round2((billedMinutes * hourlyRate) / 60);
}

/**
 * Compute service charge from session_services rows.
 * @param {Array<{quantity: number, unit_price: number}>} services
 * @returns {number}
 */
function getServiceCharge(services) {
  const total = services.reduce((sum, s) => sum + s.quantity * s.unit_price, 0);
  return round2(total);
}

/**
 * Clamp discount and compute total.
 * @param {number} timeCharge
 * @param {number} serviceCharge
 * @param {number} discount
 * @returns {{ discount: number, total: number }}
 */
function computeTotal(timeCharge, serviceCharge, discount) {
  const max = round2(timeCharge + serviceCharge);
  const clampedDiscount = round2(Math.min(Math.max(0, discount || 0), max));
  const total = round2(max - clampedDiscount);
  return { discount: clampedDiscount, total };
}

/**
 * Full bill calculation.
 * @param {Date|string} startTime
 * @param {Date|string} endTime
 * @param {number} hourlyRate
 * @param {Array<{quantity: number, unit_price: number}>} services
 * @param {number} [discount=0]
 * @param {number} [blockMinutes=15]
 * @returns {{ elapsedMinutes, billedMinutes, timeCharge, serviceCharge, discount, total }}
 */
function calculateBill(startTime, endTime, hourlyRate, services, discount = 0, blockMinutes = 15) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const elapsedMinutes = (end - start) / 60000; // ms -> minutes
  const billedMinutes = getBilledMinutes(elapsedMinutes, blockMinutes);
  const timeCharge = getTimeCharge(billedMinutes, hourlyRate);
  const serviceCharge = getServiceCharge(services);
  const { discount: clampedDiscount, total } = computeTotal(timeCharge, serviceCharge, discount);

  return {
    elapsedMinutes,
    billedMinutes,
    timeCharge,
    serviceCharge,
    discount: clampedDiscount,
    total,
  };
}

module.exports = { round2, getBilledMinutes, getTimeCharge, getServiceCharge, computeTotal, calculateBill };
