/**
 * Normalización del teléfono para el módulo de WhatsApp.
 *
 * Es el único lugar del sistema donde se decide qué es "el teléfono" de un contacto para
 * WhatsApp. Existía duplicado inline en dos lados (el link del comprobante de Ventas y el
 * salto a wa.me de Compradores); los enganches nuevos del sidebar habrían sido la tercera
 * copia del mismo `replace`.
 */

/**
 * Devuelve el teléfono como SOLO DÍGITOS.
 *
 * 🔴 A propósito NO antepone `54` ni `549`, por más que casi todos los números del sistema
 * sean argentinos. El contrato con el backend —`WhatsappPhoneHelper::normalize()` de
 * `empresa-api`, que hace exactamente el mismo `preg_replace('/\D+/', '', $raw)`— es
 * "mandá dígitos y dejá que él matchee": `matches($a, $b)` compara los ÚLTIMOS 10 DÍGITOS,
 * y así resuelve solo las cuatro variantes que conviven en la base (el `54` de país, el `9`
 * de celular, el `0` de larga distancia y el `15`).
 *
 * O sea que el prefijo que agregáramos "para ayudar" no mejora nada, y si el número ya lo
 * traía cargado lo duplicaríamos, empujando dígitos reales fuera de esa ventana de 10 y
 * rompiendo el matcheo con un chat que ya existía. Si algún día hay que agregar prefijo, se
 * agrega del lado del backend, que es el que tiene el número del negocio para saber qué país es.
 *
 * @param {String|Number|null} raw Teléfono como lo trae el modelo (con guiones, espacios, +, paréntesis).
 * @returns {String} Solo dígitos. Cadena vacía si no había ninguno.
 */
export function normalizar_telefono(raw) {
	return String(raw || '').replace(/\D/g, '')
}
