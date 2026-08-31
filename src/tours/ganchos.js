/**
 * Ganchos: las acciones que hay que ejecutar ANTES de poder señalar un elemento.
 *
 * Un paso del catálogo los referencia por nombre (`antes: 'abrir_etapa_1_cliente'`) en vez de
 * llevar la función adentro, para que el catálogo se lea como lo que es: una lista de pasos, no un
 * archivo de código.
 *
 * Cada gancho recibe `(contexto, paso)` y devuelve una promesa o nada. `contexto` trae `router`,
 * `store` y `root` (la instancia raíz de Vue, que es por donde viajan los eventos entre módulos).
 */

/** Colapso de la etapa 1 de Vender + su `scrollIntoView` suave. Medido. */
const ESPERA_ETAPA_1 = 450

/**
 * Igual que el anterior más los ocho reintentos de foco del select de método de pago
 * (8 × 80 ms = 640 ms) y el reflow que provoca al convertirlo en listbox.
 */
const ESPERA_ETAPA_1_PAGO = 700

/**
 * @param {Number} ms
 * @returns {Promise}
 */
function esperar(ms) {
	return new Promise(function (resolver) {
		setTimeout(resolver, ms)
	})
}

/**
 * Despliega la etapa 1 de Vender ("Configuración inicial").
 *
 * 🔴 Sin esto, la mitad de los pasos de Vender apuntan a algo invisible. La etapa 1 **se colapsa
 * sola** en cuanto la venta tiene ítems, cliente o está en edición
 * (`vender/components/stage-1/Index.vue:127-144`), y ahí adentro viven el selector de cliente, el
 * de método de pago, el de punto de venta AFIP y el de sucursal. Con la venta ya armada —que es
 * justo el estado en el que arrancan los clips 2.2, 2.3 y 2.4— el elemento existe en el DOM pero
 * dentro de un `v-show` en false: driver.js lo resalta en 0x0 y el lead ve un recuadro vacío.
 *
 * Las claves que el componente acepta son cuatro (`ref_map`, `stage-1/Index.vue:176-181`):
 * `payment_method`, `client`, `address` y `price_type`. Cualquier otra string abre la etapa igual
 * pero sin hacer scroll ni foco.
 *
 * @param {Object} contexto
 * @param {String} clave
 * @returns {Promise}
 */
function abrir_etapa_1(contexto, clave) {
	if (!contexto || !contexto.root) {
		return Promise.resolve()
	}

	contexto.root.$emit('vender:expand-stage1', clave)

	return esperar(clave === 'payment_method' ? ESPERA_ETAPA_1_PAGO : ESPERA_ETAPA_1)
}

/**
 * Espera a que bootstrap-vue termine de mostrar un modal.
 *
 * Se engancha al evento `bv::modal::shown` en vez de temporizar, porque el fade de Bootstrap 4 son
 * 150 ms más el reflow, y varios modales de este sistema hacen más cosas al abrirse: el de reparto
 * de métodos de pago remonta su contenido con `:key`, y el de pago de cuenta corriente escribe en
 * el DOM con un `setTimeout(500)`.
 *
 * Cae a un temporizador si el evento no llega, para no dejar el tour esperando para siempre.
 *
 * @param {Object} contexto
 * @param {Object} paso
 * @returns {Promise}
 */
function esperar_modal(contexto, paso) {
	if (!contexto || !contexto.root) {
		return esperar(400)
	}

	return new Promise(function (resolver) {
		let resuelto = false

		function al_mostrarse() {
			if (resuelto) {
				return
			}

			resuelto = true
			contexto.root.$off('bv::modal::shown', al_mostrarse)
			/* Un respiro después del `shown`: el contenido del modal se pinta en el tick siguiente. */
			esperar(paso && paso.espera_modal_ms ? paso.espera_modal_ms : 120).then(resolver)
		}

		contexto.root.$on('bv::modal::shown', al_mostrarse)

		setTimeout(function () {
			if (resuelto) {
				return
			}

			resuelto = true
			contexto.root.$off('bv::modal::shown', al_mostrarse)
			resolver()
		}, 2500)
	})
}

export default {
	/** El selector de cliente de Vender. */
	abrir_etapa_1_cliente: function (contexto) {
		return abrir_etapa_1(contexto, 'client')
	},

	/**
	 * El selector de método de pago y el botón de reparto.
	 *
	 * ⚠️ Este gancho deja el select **expandido como listbox** (`focus_payment_method_select` le
	 * pone `select-size`), o sea con otro alto del que tenía. La espera de 700 ms cubre eso; si
	 * driver.js igual mide de menos, el culpable es `on_payment_method_blur`, que lo vuelve a
	 * colapsar 150 ms después de perder el foco.
	 */
	abrir_etapa_1_pago: function (contexto) {
		return abrir_etapa_1(contexto, 'payment_method')
	},

	/** El selector de punto de venta de ARCA vive con el de sucursal. */
	abrir_etapa_1_punto_venta: function (contexto) {
		return abrir_etapa_1(contexto, 'address')
	},

	/** La lista de precios. */
	abrir_etapa_1_lista_precios: function (contexto) {
		return abrir_etapa_1(contexto, 'price_type')
	},

	/** Despliega la etapa 1 sin llevar el foco a ningún campo puntual. */
	abrir_etapa_1: function (contexto) {
		return abrir_etapa_1(contexto, 'ninguno')
	},

	esperar_modal: esperar_modal,

	/**
	 * Espera larga, para los pasos que dependen de algo que corre afuera del navegador.
	 *
	 * Los dos casos medidos: el resumen de imágenes inteligentes llega por Pusher entre 10 y 15
	 * segundos después, y el escaneo de la factura del proveedor tarda alrededor de 30. En los dos
	 * el paso avanza por aparición del elemento, así que esta espera es solo para no medir antes
	 * de tiempo.
	 */
	esperar_proceso_largo: function () {
		return esperar(1200)
	},
}
