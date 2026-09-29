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

/*
	El evento con el que Vender lleva el foco a un campo, este en la etapa que este del diseño en
	uso. Se importa y no se copia el texto: si alguna vez cambia, el tour no puede quedar gritando
	un evento que nadie escucha (es justo lo que paso con el evento viejo que solo sabia abrir la
	etapa 1 cuando llegaron los diseños de Vender, mision diseno-vender-configurable, 28/9/2026).
*/
import { EVENTO_ENFOCAR_ELEMENTO } from '@/mixins/vender/diseno_de_vender'

/** Apertura de la etapa que tiene el campo (con el diseño predeterminado, la 1) + su `scrollIntoView` suave. Medido. */
const ESPERA_CAMPO_DE_VENDER = 450

/**
 * Igual que el anterior más los ocho reintentos de foco del select de método de pago
 * (8 × 80 ms = 640 ms) y el reflow que provoca al convertirlo en listbox.
 */
const ESPERA_METODO_DE_PAGO = 700

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
 * Lleva Vender hasta un campo: abre la etapa donde lo tiene el diseño de Vender en uso, lo trae a
 * la vista y lo enfoca.
 *
 * 🔴 Sin esto, la mitad de los pasos de Vender apuntan a algo invisible. Las etapas 1 y 3 **se
 * pliegan**: la 1 sola en cuanto la venta tiene ítems, cliente o está en edición (created() de
 * `vender/components/stage-1/Index.vue`), y la 3 arranca plegada. Ahí viven el selector de
 * cliente, el de método de pago, el de punto de venta de ARCA y la lista de precios. Con la venta
 * ya armada —que es justo el estado en el que arrancan los clips 2.2, 2.3 y 2.4— el elemento
 * existe en el DOM pero dentro de un `v-show` en false: driver.js lo resalta en 0x0 y el lead ve
 * un recuadro vacío.
 *
 * Hasta los diseños de Vender esto emitía un evento que solo sabía abrir la etapa 1, con cuatro
 * claves propias. Ahora cada campo puede estar en cualquier etapa, así que se pide el
 * campo por su key del catálogo (`components/vender/layout/elementos.js`) y lo resuelve la etapa
 * que lo dibuja (`mixins/vender/diseno_de_vender.js`). Si el diseño en uso sacó el campo, no pasa
 * nada y el motor saltea el paso solo, porque el ancla no aparece.
 *
 * Se emite directo en `root` y no con `enfocar_elemento_de_vender()` del mixin a propósito: ese
 * helper avisa con un toast cuando el campo no está en el diseño, y en el medio de un tour ese
 * cartel no le dice nada al lead.
 *
 * @param {Object} contexto
 * @param {String} key key del catálogo ('cliente', 'metodo_de_pago', 'facturacion', 'lista_de_precios')
 * @returns {Promise}
 */
function llevar_al_campo_de_vender(contexto, key) {
	if (!contexto || !contexto.root) {
		return Promise.resolve()
	}

	contexto.root.$emit(EVENTO_ENFOCAR_ELEMENTO, key, {})

	return esperar(key === 'metodo_de_pago' ? ESPERA_METODO_DE_PAGO : ESPERA_CAMPO_DE_VENDER)
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

/*
	Los nombres `abrir_etapa_1_*` son los de siempre y NO se cambian: los guiones
	(guiones/s2-vender.js) los referencian por nombre en `antes`. Desde los diseños de Vender ya no
	abren necesariamente la etapa 1: abren la que tenga el campo en el diseño en uso (con el
	predeterminado, la 1). El que desplegaba la etapa 1 sin foco (`abrir_etapa_1`) se saco: ningun
	guion lo usaba, y "la etapa 1" ya no es un lugar fijo.
*/
export default {
	/** El selector de cliente de Vender. */
	abrir_etapa_1_cliente: function (contexto) {
		return llevar_al_campo_de_vender(contexto, 'cliente')
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
		return llevar_al_campo_de_vender(contexto, 'metodo_de_pago')
	},

	/**
	 * El selector de punto de venta de ARCA: el campo `facturacion` del diseño. Hasta los diseños
	 * de Vender se iba a la sucursal, que era el campo de al lado con un `ref` para scrollear; ahora
	 * se va directo al punto de venta, que es lo que el paso señala.
	 */
	abrir_etapa_1_punto_venta: function (contexto) {
		return llevar_al_campo_de_vender(contexto, 'facturacion')
	},

	/** La lista de precios. */
	abrir_etapa_1_lista_precios: function (contexto) {
		return llevar_al_campo_de_vender(contexto, 'lista_de_precios')
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
