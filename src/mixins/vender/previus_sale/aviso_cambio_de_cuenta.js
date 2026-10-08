/**
 * Aviso de CAMBIO DE CUENTA CORRIENTE al actualizar una venta guardada (mision
 * edicion-completa-ventas-presupuestos, 8/10/2026; decision 1 de Lucas).
 *
 * POR QUE EXISTE. Una venta que iba a la cuenta corriente ahora se puede pasar a otro cliente
 * (stage-1/SelectClient.vue) o a otra moneda (total-previus-sales/Moneda.vue). En los dos casos la
 * API saca el debito de la cuenta en la que estaba y lo crea en la nueva: la cuenta corriente esta
 * partida por cliente Y por moneda, asi que cambiar la moneda tambien es cambiar de cuenta
 * (SaleHelper::updateCurrentAcountsAndCommissions + CurrentAcountFromSaleHelper).
 *
 * Lo que cobro el cliente original NO se mueve con la venta (decision 1 de Lucas): el pago queda en
 * su cuenta, imputado a otra deuda suya o como saldo a favor, y la venta entra en la cuenta nueva
 * como pendiente. Eso es plata que cambia de lugar sin que nadie la toque, asi que:
 *   - si el debito de la venta tenia cobros, ANTES de guardar se pide confirmacion diciendo cuanto
 *     queda en la cuenta original (cambio_de_cuenta_confirmar_y_guardar, lo llama BtnGuardar.vue);
 *   - si no tenia cobros, se guarda sin preguntar y, cuando el PUT sale bien, un aviso dice de que
 *     cuenta a que cuenta paso (cambio_de_cuenta_avisar_al_guardar, lo llama updateSale() en
 *     previus_sale/index.js). El aviso sale con lo que DEVOLVIO el servidor, no con lo que se mando:
 *     una API vieja que ignora la moneda no puede hacer decir "paso a la cuenta en dolares".
 *
 * La regla vive en funciones puras exportadas (abajo) para poder probarlas sin Vue; los metodos del
 * mixin solo leen el store y muestran los carteles.
 *
 * 🔴 Todos los metodos llevan el prefijo `cambio_de_cuenta_`: un metodo de mixin con el mismo nombre
 * que uno global de la SPA lo pisa en silencio (paso el 30/9/2026 con check_cotizacion_dolar, que
 * bloqueo TODAS las ventas). Este mixin entra en previus_sale/index.js, que lo mezclan una docena de
 * componentes: por eso tampoco tiene data() (el freno de doble cartel es de modulo, abajo).
 */

/*
	Hay un cartel de confirmacion abierto. Es de modulo y no de data(): este mixin entra en todos los
	componentes que mezclan previus_sale/index.js, y lo unico que tiene que frenar es que el atajo de
	teclado de guardar (keyboard_shortcuts.js, que hace click en el boton) abra un segundo cartel
	encima del primero. Hay un solo VENDER a la vez, igual que en deteccion_combos.js.
*/
let confirmando_cambio_de_cuenta = false

// Moneda dolar, la misma constante que usa la API (CotizacionDeVentaHelper::MONEDA_DOLAR).
const MONEDA_DOLAR = 2

/**
 * La moneda como la guarda la API (CotizacionDeVentaHelper::normalizar_moneda_id): un id mayor que
 * cero es esa moneda; cualquier otra cosa (null, 0, '' o texto) es pesos.
 *
 * @param {*} moneda_id
 * @returns {Number}
 */
export function moneda_de_cuenta_normalizada(moneda_id) {
	let numero = Number(moneda_id)

	if (isFinite(numero) && numero >= 1) {
		return Math.floor(numero)
	}

	return 1
}

/**
 * Si la venta, tal como esta GUARDADA, va a la cuenta corriente: tiene cliente y no esta omitida.
 * Es la misma regla con la que la API decide si crea el debito, y la misma que usaba
 * checkear_metodos_de_pago_en_previus_sale() para no pedir metodo de pago.
 *
 * Number() y no la verdad del valor a secas: un "0" serializado como string seria truthy.
 *
 * @param {Object} venta La venta guardada (`previus_sale`).
 * @returns {Boolean}
 */
export function venta_iba_a_cuenta_corriente(venta) {
	return Boolean(
		venta
		&& Number(venta.client_id) > 0
		&& !Number(venta.omitir_en_cuenta_corriente)
	)
}

/**
 * Cuanto tenia cobrado el debito de la venta en la cuenta corriente.
 *
 * `current_acount` es la relacion hasOne de Sale (viene en el withAll de
 * `previus-next-by-id/sale/{id}`): una fila de `current_acounts` con `debe`, `haber`, `status` y
 * `pagandose`. Lo cobrado sale del ESTADO del debito, que es lo que mantiene la API al imputar pagos
 * (CurrentAcountHelper::saldarCurrentAcount):
 *   - `pagado`    -> la venta entera (`debe`);
 *   - `pagandose` -> lo imputado hasta ahora (`pagandose`, con tope en `debe`);
 *   - `sin_pagar` -> nada.
 *
 * Si la relacion trajo otra fila que no es el debito (hasOne no ordena: con una nota de credito de
 * la misma venta puede venir esa, que tiene `haber` y no `debe`) devuelve 0: no se sabe cuanto se
 * cobro, y esa venta igual la rechaza la API al cambiarla de cuenta (422 por la nota de credito).
 *
 * @param {Object|null} current_acount
 * @returns {Number}
 */
export function cobrado_del_debito_de_la_venta(current_acount) {
	if (!current_acount) {
		return 0
	}

	let debe = Number(current_acount.debe)

	if (!(debe > 0)) {
		return 0
	}

	if (current_acount.status == 'pagado') {
		return debe
	}

	if (current_acount.status == 'pagandose') {
		let pagandose = Number(current_acount.pagandose)

		if (!(pagandose > 0)) {
			return 0
		}

		return Math.min(pagandose, debe)
	}

	return 0
}

/**
 * Si la venta cambia de cuenta corriente y como. Devuelve null si no cambia de cuenta:
 *   - la venta guardada no iba a la cuenta corriente (de contado u omitida), o
 *   - no queda cliente (sacarlo no se permite desde VENDER, ver SelectClient.vue::clearSelected), o
 *   - quedan el mismo cliente y la misma moneda.
 *
 * Una moneda que queda en null o vacia es "no se toca" (el contrato del PUT: sin `moneda_id` la API
 * no cambia ni la moneda ni la cotizacion), asi que no cuenta como cambio.
 *
 * @param {Object} venta_original   La venta guardada (`previus_sale`, con `client` y `current_acount`).
 * @param {Object|null} cliente_que_queda {id, name}: el elegido en VENDER, o el que devolvio el PUT.
 * @param {*} moneda_que_queda       La moneda elegida en VENDER, o la que devolvio el PUT.
 * @returns {Object|null} { cliente_original, cliente_nuevo, moneda_original, moneda_nueva,
 *                          cambia_cliente, cambia_moneda, cobrado }
 */
export function analizar_cambio_de_cuenta_de_la_venta(venta_original, cliente_que_queda, moneda_que_queda) {

	if (!venta_iba_a_cuenta_corriente(venta_original)) {
		return null
	}

	if (!cliente_que_queda || !(Number(cliente_que_queda.id) > 0)) {
		return null
	}

	let moneda_original = moneda_de_cuenta_normalizada(venta_original.moneda_id)

	let moneda_nueva = moneda_original

	if (
		moneda_que_queda !== null
		&& typeof moneda_que_queda != 'undefined'
		&& moneda_que_queda !== ''
	) {
		moneda_nueva = moneda_de_cuenta_normalizada(moneda_que_queda)
	}

	let cambia_cliente = Number(cliente_que_queda.id) !== Number(venta_original.client_id)

	let cambia_moneda = moneda_nueva !== moneda_original

	if (!cambia_cliente && !cambia_moneda) {
		return null
	}

	return {
		cliente_original: venta_original.client ? venta_original.client : { id: venta_original.client_id, name: null },
		cliente_nuevo: cliente_que_queda,
		moneda_original: moneda_original,
		moneda_nueva: moneda_nueva,
		cambia_cliente: cambia_cliente,
		cambia_moneda: cambia_moneda,
		cobrado: cobrado_del_debito_de_la_venta(venta_original.current_acount),
	}
}

/**
 * "la cuenta de <cliente>", y la moneda si lo que cambia es la moneda (con el mismo cliente, sin la
 * moneda las dos cuentas se leerian igual).
 *
 * @param {Object} cliente {id, name}
 * @param {Number} moneda_id
 * @param {Boolean} con_moneda
 * @returns {String}
 */
export function texto_de_la_cuenta_corriente(cliente, moneda_id, con_moneda) {
	let nombre = cliente && cliente.name ? cliente.name : ('el cliente N° ' + (cliente ? cliente.id : ''))

	let texto = 'la cuenta de ' + nombre

	if (con_moneda) {
		texto += moneda_id == MONEDA_DOLAR ? ' en dólares' : ' en pesos'
	}

	return texto
}

/**
 * Los dos textos del cambio: la pregunta de antes de guardar (solo si hubo cobros) y el aviso de
 * despues.
 *
 * @param {Object} cambio Lo que devolvio analizar_cambio_de_cuenta_de_la_venta().
 * @param {Function} formatear_importe (importe, moneda_id) => String. Se recibe de afuera para que
 *        esta funcion no dependa de Vue (en el mixin es this.price con "USD " adelante en dolares).
 * @returns {Object} { confirmacion, aviso }
 */
export function textos_del_cambio_de_cuenta(cambio, formatear_importe) {
	let cuenta_original = texto_de_la_cuenta_corriente(cambio.cliente_original, cambio.moneda_original, cambio.cambia_moneda)

	let cuenta_nueva = texto_de_la_cuenta_corriente(cambio.cliente_nuevo, cambio.moneda_nueva, cambio.cambia_moneda)

	let confirmacion = 'La venta tenía ' + formatear_importe(cambio.cobrado, cambio.moneda_original) + ' cobrados en ' + cuenta_original + '. '
		+ 'Ese cobro queda en ' + cuenta_original + ' (se aplica a otra deuda suya o queda a su favor) '
		+ 'y la venta pasa a ' + cuenta_nueva + ' como pendiente.'

	let aviso = 'La venta pasó de ' + cuenta_original + ' a ' + cuenta_nueva + '.'

	return {
		confirmacion: confirmacion,
		aviso: aviso,
	}
}

export default {
	methods: {
		/**
		 * El importe con su moneda, como lo muestra la cuenta corriente (current_acount_simbolo_moneda).
		 *
		 * @param {Number} importe
		 * @param {Number} moneda_id
		 * @returns {String}
		 */
		cambio_de_cuenta_formatear_importe(importe, moneda_id) {
			if (moneda_id == MONEDA_DOLAR) {
				return 'USD ' + this.price(importe)
			}

			return this.price(importe)
		},

		/**
		 * Guarda la venta guardada que se esta editando, preguntando antes si cambia de cuenta
		 * corriente con cobros (decision 1 de Lucas). Sin cambio de cuenta, o sin cobros, llama a
		 * `guardar` derecho.
		 *
		 * Solo un `true` guarda: msgBoxConfirm de bootstrap-vue RESUELVE con null cuando el cartel se
		 * cierra sin contestar (Escape, click afuera, la X), y eso es "no guardes", igual que Cancelar
		 * (ver deteccion_combos.js).
		 *
		 * @param {Function} guardar Lo que guarda (BtnGuardar.vue le pasa updateSale).
		 * @returns {void}
		 */
		cambio_de_cuenta_confirmar_y_guardar(guardar) {

			let cambio = analizar_cambio_de_cuenta_de_la_venta(
				this.$store.state.vender.previus_sales.previus_sale,
				this.$store.state.vender.client,
				this.$store.state.vender.moneda_id
			)

			if (!cambio || !(cambio.cobrado > 0)) {
				guardar()
				return
			}

			if (confirmando_cambio_de_cuenta) {
				return
			}

			confirmando_cambio_de_cuenta = true

			let textos = textos_del_cambio_de_cuenta(cambio, (importe, moneda_id) => {
				return this.cambio_de_cuenta_formatear_importe(importe, moneda_id)
			})

			this.$bvModal.msgBoxConfirm(textos.confirmacion, {
				title: 'La venta cambia de cuenta corriente',
				okTitle: 'Guardar igual',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(confirmado => {
				confirmando_cambio_de_cuenta = false

				if (confirmado === true) {
					guardar()
				}
			})
			.catch(err => {
				// Un error de verdad al abrir el cartel (un cierre sin contestar no pasa por aca).
				confirmando_cambio_de_cuenta = false
				console.log(err)
			})
		},

		/**
		 * Despues de un PUT exitoso: si la venta cambio de cuenta corriente, lo dice. Compara la venta
		 * ORIGINAL (previus_sale, que todavia esta en el store cuando corre el .then de updateSale)
		 * con la que DEVOLVIO el servidor.
		 *
		 * @param {Object} venta_original
		 * @param {Object} venta_guardada `res.data.model` del PUT.
		 * @returns {void}
		 */
		cambio_de_cuenta_avisar_al_guardar(venta_original, venta_guardada) {

			if (!venta_original || !venta_guardada) {
				return
			}

			/*
				El cliente con su nombre: el que trae la respuesta (fullModel con withAll); si no lo
				trae, el elegido en VENDER cuando es el mismo id.
			*/
			let cliente_guardado = venta_guardada.client ? venta_guardada.client : null

			if (!cliente_guardado && Number(venta_guardada.client_id) > 0) {
				let elegido = this.$store.state.vender.client
				cliente_guardado = elegido && Number(elegido.id) === Number(venta_guardada.client_id) ? elegido : { id: venta_guardada.client_id, name: null }
			}

			let cambio = analizar_cambio_de_cuenta_de_la_venta(venta_original, cliente_guardado, venta_guardada.moneda_id)

			if (!cambio) {
				return
			}

			let textos = textos_del_cambio_de_cuenta(cambio, (importe, moneda_id) => {
				return this.cambio_de_cuenta_formatear_importe(importe, moneda_id)
			})

			this.$toast.info(textos.aviso, {
				duration: 8000,
			})
		},
	},
}
