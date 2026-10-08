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
 * como pendiente (o pagada con el saldo a favor que esa cuenta tuviera). Eso es plata que cambia de
 * lugar sin que nadie la toque, asi que:
 *   - si el debito de la venta tenia cobros, ANTES de guardar se pide confirmacion diciendo cuanto
 *     queda en la cuenta original (cambio_de_cuenta_confirmar_y_guardar, lo llama BtnGuardar.vue);
 *   - si no tenia cobros, se guarda sin preguntar y, cuando el PUT sale bien, un aviso dice de que
 *     cuenta a que cuenta paso (cambio_de_cuenta_avisar_al_guardar, lo llama updateSale() en
 *     previus_sale/index.js). El aviso sale con lo que DEVOLVIO el servidor, no con lo que se mando:
 *     una API vieja que ignora la moneda no puede hacer decir "paso a la cuenta en dolares".
 * Los dos solo hablan de una mudanza que de verdad pasa: la venta tenia su debito y lo sigue
 * teniendo despues del PUT (venta_iba_a_cuenta_corriente, que espeja la regla de la API). Una venta
 * "para checkear" con cliente, por ejemplo, no tiene debito: cambiarle el cliente no mueve nada.
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
 * Si la venta es A CUENTA CORRIENTE en sentido amplio, o sea que NO es de contado: tiene cliente y no
 * esta omitida. Es la regla con la que checkear_metodos_de_pago_en_previus_sale() deja de pedir
 * metodo de pago, y la que usa SelectClient.vue para "cambiar si, sacar no": sacarle el cliente a una
 * venta asi la pasaria a contado.
 *
 * OJO: no dice que la venta tenga hoy un debito en la cuenta corriente. Una venta "para checkear"
 * (to_check / checked) o guardada con `save_current_acount` en 0 (extension "guardar en la cuenta
 * corriente despues de facturar") todavia no lo tiene: entra cuando se checkea o se factura. Para eso
 * esta venta_iba_a_cuenta_corriente(), abajo.
 *
 * Number() y no la verdad del valor a secas: un "0" serializado como string seria truthy.
 *
 * @param {Object} venta La venta (guardada, o como queda en VENDER).
 * @returns {Boolean}
 */
export function venta_es_a_cuenta_corriente(venta) {
	return Boolean(
		venta
		&& Number(venta.client_id) > 0
		&& !Number(venta.omitir_en_cuenta_corriente)
	)
}

/**
 * Si la venta TIENE (o va a tener al guardar) su debito en la cuenta corriente del cliente. Espeja la
 * regla de la API, que es la que decide si el debito existe y si se muda
 * (CambioDeCuentaDeVentaHelper::va_a_quedar_en_la_cuenta_corriente y el_debito_se_muda, y
 * SaleHelper::va_a_volver_a_la_cuenta_corriente):
 *   - tiene cliente y no esta omitida (venta_es_a_cuenta_corriente);
 *   - `save_current_acount` prendido (update() nunca lo reasigna);
 *   - ni `to_check` ni `checked`: SaleController@update solo toca la cuenta corriente sin ellos.
 * Sirve igual para la venta GUARDADA (si tenia debito) y para la que QUEDA despues del PUT (si lo va
 * a tener): una venta para checkear con cliente no tiene debito, y decir que "paso de la cuenta de A
 * a la de B" seria falso porque no se movio nada.
 *
 * @param {Object} venta
 * @returns {Boolean}
 */
export function venta_iba_a_cuenta_corriente(venta) {
	return Boolean(
		venta_es_a_cuenta_corriente(venta)
		&& Number(venta.save_current_acount)
		&& !Number(venta.to_check)
		&& !Number(venta.checked)
	)
}

/**
 * La venta como QUEDA en VENDER al guardar, con las claves que miran venta_iba_a_cuenta_corriente()
 * y analizar_cambio_de_cuenta_de_la_venta(). Es lo que viaja en el PUT: el cliente, la moneda,
 * "omitir", to_check y checked del store. `save_current_acount` no viaja y la API nunca lo
 * reasigna, asi que es el de la venta guardada.
 *
 * @param {Object} vender `state.vender` del store.
 * @param {Object} venta_original La venta guardada (`previus_sale`).
 * @returns {Object}
 */
export function venta_que_queda_segun_vender(vender, venta_original) {
	return {
		client: vender.client ? vender.client : null,
		client_id: vender.client ? vender.client.id : null,
		moneda_id: vender.moneda_id,
		omitir_en_cuenta_corriente: vender.omitir_en_cuenta_corriente,
		to_check: vender.to_check,
		checked: vender.checked,
		save_current_acount: venta_original ? venta_original.save_current_acount : null,
	}
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
 * Si el DEBITO de la venta se muda de cuenta corriente, y como. Devuelve null si no se muda:
 *   - la venta guardada no tenia debito (de contado, omitida, para checkear o con
 *     `save_current_acount` en 0: ver venta_iba_a_cuenta_corriente), o
 *   - la que queda no lo va a tener (sin cliente, omitida, para checkear), o
 *   - quedan el mismo cliente y la misma moneda.
 * Es la misma decision que CambioDeCuentaDeVentaHelper::el_debito_se_muda de la API, mas la
 * condicion de que hubiera un debito que mudar.
 *
 * La moneda que queda se compara NORMALIZADA (null o 0 es pesos): es como viaja en el PUT
 * (moneda_para_el_put_de_la_venta) y como la compara la API.
 *
 * @param {Object} venta_original La venta guardada (`previus_sale`, con `client` y `current_acount`).
 * @param {Object} venta_que_queda La que queda: venta_que_queda_segun_vender() antes de guardar, o la
 *        que devolvio el PUT despues. Necesita client_id (y `client` para el nombre), moneda_id,
 *        omitir_en_cuenta_corriente, to_check, checked y save_current_acount.
 * @returns {Object|null} { cliente_original, cliente_nuevo, moneda_original, moneda_nueva,
 *                          cambia_cliente, cambia_moneda, cobrado }
 */
export function analizar_cambio_de_cuenta_de_la_venta(venta_original, venta_que_queda) {

	if (!venta_iba_a_cuenta_corriente(venta_original)) {
		return null
	}

	if (!venta_iba_a_cuenta_corriente(venta_que_queda)) {
		return null
	}

	let cliente_que_queda = venta_que_queda.client ? venta_que_queda.client : { id: venta_que_queda.client_id, name: null }

	let moneda_original = moneda_de_cuenta_normalizada(venta_original.moneda_id)

	let moneda_nueva = moneda_de_cuenta_normalizada(venta_que_queda.moneda_id)

	let cambia_cliente = Number(venta_que_queda.client_id) !== Number(venta_original.client_id)

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
	let texto = cliente && cliente.name ? 'la cuenta de ' + cliente.name : 'la cuenta del cliente N° ' + (cliente ? cliente.id : '')

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

	/*
		"pasa a la cuenta de B" y no "como pendiente": si esa cuenta tiene saldo a favor, la API se lo
		imputa a la venta al crearla (CurrentAcountFromSaleHelper recalcula la cuenta entera), y la
		venta puede quedar pagada en parte o entera. Lo que se dice tiene que ser cierto en los dos casos.
	*/
	let confirmacion = 'La venta tenía ' + formatear_importe(cambio.cobrado, cambio.moneda_original) + ' cobrados en ' + cuenta_original + '. '
		+ 'Ese cobro queda en ' + cuenta_original + ' (se aplica a otra deuda suya o queda a su favor) '
		+ 'y la venta pasa a ' + cuenta_nueva + ' (si esa cuenta tiene saldo a favor, se le aplica a la venta).'

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

			let venta_original = this.$store.state.vender.previus_sales.previus_sale

			let cambio = analizar_cambio_de_cuenta_de_la_venta(
				venta_original,
				venta_que_queda_segun_vender(this.$store.state.vender, venta_original)
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
				trae, el elegido en VENDER cuando es el mismo id. Se arma una copia: la respuesta es el
				mismo objeto que se commitea en el store de ventas.
			*/
			let venta_que_quedo = Object.assign({}, venta_guardada)

			if (!venta_que_quedo.client && Number(venta_que_quedo.client_id) > 0) {
				let elegido = this.$store.state.vender.client
				venta_que_quedo.client = elegido && Number(elegido.id) === Number(venta_que_quedo.client_id) ? elegido : null
			}

			let cambio = analizar_cambio_de_cuenta_de_la_venta(venta_original, venta_que_quedo)

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
