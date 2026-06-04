/**
 * Utilidades de precisión matemática para cálculos monetarios.
 * Previene errores de precisión inherentes al punto flotante IEEE 754 de JavaScript.
 */

/**
 * Redondea un número a 2 decimales usando EPSILON para mitigar errores de precisión.
 * @param {number} num - Número a redondear.
 * @returns {number} Número redondeado a 2 decimales.
 */
export const round2 = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Suma un array de números de forma acumulativa y redondea el resultado final.
 * @param {number[]} arr - Array de números a sumar.
 * @returns {number} Resultado redondeado.
 */
export const sumR = (arr) => {
  if (!Array.isArray(arr)) return 0;
  const total = arr.reduce((acc, val) => {
    const cleanVal = typeof val === 'number' && !isNaN(val) ? val : Number(val) || 0;
    return acc + cleanVal;
  }, 0);
  return round2(total);
};

/**
 * Resta dos números y redondea el resultado.
 * @param {number} a - Minuendo.
 * @param {number} b - Sustraendo.
 * @returns {number} Resultado redondeado.
 */
export const subR = (a, b) => {
  const cleanA = typeof a === 'number' && !isNaN(a) ? a : Number(a) || 0;
  const cleanB = typeof b === 'number' && !isNaN(b) ? b : Number(b) || 0;
  return round2(cleanA - cleanB);
};

/**
 * Multiplica dos números y redondea el resultado.
 * @param {number} a - Multiplicando.
 * @param {number} b - Multiplicador.
 * @returns {number} Resultado redondeado.
 */
export const mulR = (a, b) => {
  const cleanA = typeof a === 'number' && !isNaN(a) ? a : Number(a) || 0;
  const cleanB = typeof b === 'number' && !isNaN(b) ? b : Number(b) || 0;
  return round2(cleanA * cleanB);
};

/**
 * Divide un número por otro y redondea el resultado.
 * Si el divisor es 0, retorna 0 de forma segura.
 * @param {number} a - Dividendo.
 * @param {number} b - Divisor.
 * @returns {number} Resultado redondeado.
 */
export const divR = (a, b) => {
  const cleanA = typeof a === 'number' && !isNaN(a) ? a : Number(a) || 0;
  const cleanB = typeof b === 'number' && !isNaN(b) ? b : Number(b) || 0;
  if (cleanB === 0) return 0;
  return round2(cleanA / cleanB);
};
