// Lectura de los reportes contables.
//
// Los usan los dos circuitos que llegan hasta la factura: el de compra
// (compra-costeo-facturacion.spec.js, que mide el IVA CREDITO y las percepciones y retenciones
// sufridas) y el de venta (circuito-devolucion-afip.spec.js, que mide el IVA DEBITO y como lo baja
// una nota de credito). Son las dos caras del mismo reporte y conviene que las lea el mismo codigo.

const { expect } = require('@playwright/test')

/**
 * Lee los renglones de Posicion Fiscal por su data-monto (el valor crudo que devolvio la API).
 *
 * No se lee el texto del renglon: `formatear()` recorta los dos decimales, asi que una retencion de
 * 1795,50 se imprime "$1.795" y no habria forma de verificar el numero. Ver el comentario del
 * template de components/reportes/components/posicion-fiscal/Index.vue.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Object<string, number>>} renglon (sin el prefijo "posicion-fiscal-") -> monto.
 */
async function leer_posicion_fiscal(page) {
	// La aparicion del primer renglon es la señal de que el reporte ya respondio: hasta entonces
	// el componente muestra el skeleton y ningun data-testid existe.
	await expect(page.locator('[data-testid="posicion-fiscal-iva-credito"]')).toBeVisible()

	return page.evaluate(() => {
		const renglones = {}
		document.querySelectorAll('[data-testid^="posicion-fiscal-"]').forEach(elemento => {
			const nombre = elemento.dataset.testid.replace('posicion-fiscal-', '')
			renglones[nombre] = Number(elemento.dataset.monto)
			// Los renglones de saldo publican ademas si es a pagar o a favor. Se guarda con el
			// sufijo "__tipo" para no perderlo: el monto viene siempre positivo (ver
			// PosicionFiscalHelper::signo_y_monto) y sin el tipo no se pueden restar dos mediciones.
			if (typeof elemento.dataset.tipo !== 'undefined') {
				renglones[nombre + '__tipo'] = elemento.dataset.tipo
			}
		})
		return renglones
	})
}

module.exports = {
	leer_posicion_fiscal,
}
