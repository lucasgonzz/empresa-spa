/**
 * Código de barras tal como se busca en VENDER: sin espacios y siempre como texto.
 *
 * Existe porque `getBarCode` hacía `bar_code.replace(...)` a secas y tiraba «Cannot read properties of
 * undefined (reading 'replace')» cuando el campo no tenía valor: con un artículo pendiente de cantidad, el
 * item de la cabecera es el artículo (no trae la clave `codigo`) y un Enter en «Cod barras» mandaba
 * `undefined` (misión prueba-defectos-asistente-y-vender, 4/11/2026). Un código numérico también se busca.
 *
 * @param {*} valor Lo que haya en el campo (texto, número, undefined o null).
 * @returns {string} El código sin espacios, o '' si no hay nada que buscar.
 */
export function codigo_escaneado(valor) {
	if (valor === undefined || valor === null) {
		return ''
	}

	return String(valor).replace(/\s+/g, '')
}
