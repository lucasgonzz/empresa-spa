import vender_mixin from '@/mixins/vender'
import limpiar_vender from '@/mixins/vender/limpiar_vender'

/*
	Id del cartel "¿Pasar a la cuenta corriente?" (components/vender/modals/budget-cobro/Index.vue).
	Se exporta para que el cartel y quien lo abre usen el mismo y no se desfasen.
*/
export const ID_MODAL_COBRO_DEL_PRESUPUESTO = 'budget-cobro-modal'

/*
	Id del modal de reparto de metodos de pago de Vender, el mismo que abre el boton verde de una
	venta (components/vender/modals/payment-methods/Index.vue).
*/
export const ID_MODAL_REPARTO_DE_PAGOS = 'payment-method-modal'

export default {
	mixins: [vender_mixin, limpiar_vender],
	data() {
		return {
			/*
				Lo que tenia la venta en curso en el instante en que el vendedor contesto el cartel
				"¿Pasar a la cuenta corriente?", antes de que la respuesta lo cambie. null = no hay
				ninguna pregunta en curso.

				Sirve para dos cosas: volver la pantalla a como estaba si el vendedor cancela el
				reparto o si el guardado falla (deshacer_cobro_del_presupuesto), y devolverle la caja
				a la venta siguiente cuando el guardado sale bien (cerrar_cobro_del_presupuesto).

				Vive en la instancia que guarda --el cartel, que se monta UNA sola vez--, no en el
				store: BtnGuardar se monta en mas de un lugar y cada copia de este mixin tiene su
				propio data, pero solo el cartel llega a llenarlo.
			*/
			cobro_previo_al_presupuesto: null,
		}
	},
	computed: {
		client() {
			return this.$store.state.vender.client
		},
		budget() {
			return this.$store.state.vender.budget
		},
		total() {
			return this.$store.state.vender.total
		},
		address_id() {
			return this.$store.state.vender.address_id
		},
		moneda_id() {
			return this.$store.state.vender.moneda_id
		},
		observations() {
			return this.$store.state.vender.observations
		},
		discounts_id() {
			return this.$store.state.vender.discounts_id
		},
		discounts() {
			return this.$store.state.discount.models
		},
		surchages_id() {
			return this.$store.state.vender.surchages_id
		},
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente
		},
		surchages() {
			return this.$store.state.surchage.models
		},
		items() {
			return this.$store.state.vender.items 
		},
		price_type() {
			return this.$store.state.vender.price_type
		},
		valor_dolar() {
			return this.$store.state.vender.valor_dolar
		},
		/* Monto con signo del total forzado (extension forzar_total) */
		forzar_total_monto() {
			return this.$store.state.vender.forzar_total_monto
		},
		articles() {
			return this.items.filter(item => item.is_article)
		},
		services() {
			return this.items.filter(item => item.is_service)
		},
		promocion_vinotecas() {
			return this.items.filter(item => item.is_promocion_vinoteca)
		},
		/*
			🔴 Sin este computed, un combo cargado en VENDER con "Guardar como presupuesto" tildado
			rompia el guardado con un 500. El combo entra igual al remito (el unico chequeo que mira
			guardar_como_presupuesto es el de stock) y SI suma a this.total, que viaja en el payload
			(vender_set_total.js, bucket total_combos). Pero la clave `combos` no se mandaba, asi que
			BudgetHelper::getTotal() recalculaba sin el combo, le daba una diferencia mayor a 3 y
			rechazaba con "El total del presupuesto no corresponde con los productos ingresados".
			O sea que el vendedor no veia "el combo no se guardo": veia un total descuadrado que no
			explicaba nada.
		*/
		combos() {
			return this.items.filter(item => item.is_combo)
		},
	},
	methods: {
		/**
		 * Punto de entrada de "Guardar presupuesto": el boton de la barra inferior y el atajo de
		 * teclado (que hace click sobre ese mismo boton) terminan aca.
		 *
		 * 🔴 YA NO GUARDA: abre el cartel "¿Pasar a la cuenta corriente?" y el guardado de verdad
		 * (guardar_presupuesto_ahora) lo dispara la respuesta. Va aca y no en el boton para que
		 * ningun camino --click, atajo, un llamador futuro-- se salte la pregunta.
		 *
		 * El cartel se monta UNA sola vez, en views/Vender.vue: BtnGuardar se monta en mas de un
		 * lugar (la barra inferior y el bloque del total) y un id de modal repetido rompe.
		 * Este metodo solo le pide que se abra, por id.
		 */
		guardar_presupuesto() {
			this.$bvModal.show(ID_MODAL_COBRO_DEL_PRESUPUESTO)
		},
		/**
		 * Guarda el presupuesto con lo que ya quedo en el store despues de la respuesta del cartel
		 * (omitir en cuenta corriente, reparto de metodos de pago y total). Lo llama el cartel:
		 * directo con "Sí", y con "No" cuando el vendedor termina el reparto ("Listo").
		 */
		guardar_presupuesto_ahora() {
			this.$store.commit('auth/setMessage', 'Guardando Presupuesto')
			this.$store.commit('auth/setLoading', true)
			if (this.budget) {
				this.actualizar()
			} else {
				this.crear()
			}
		},

		/**
		 * Foto de lo que tiene la venta en curso, tomada ANTES de aplicar la respuesta del cartel.
		 * Las referencias se guardan tal cual: el store reemplaza estos arreglos, no los muta.
		 */
		recordar_cobro_previo_al_presupuesto() {
			let vender = this.$store.state.vender

			this.cobro_previo_al_presupuesto = {
				omitir_en_cuenta_corriente: vender.omitir_en_cuenta_corriente,
				current_acount_payment_method_id: vender.current_acount_payment_method_id,
				caja_id: vender.caja_id,
				selected_payment_methods: vender.selected_payment_methods,
				modal_payment_methods: vender.modal_payment_methods,
			}
		},
		/**
		 * Deja la pantalla exactamente como estaba antes de preguntar. Se usa cuando el vendedor
		 * cancela el reparto de metodos de pago (el boton Cancelar o cerrarlo con Esc) y cuando el
		 * guardado falla.
		 *
		 * 🔴 Si no se deshace, lo que la respuesta toco se queda: "omitir en cuenta corriente" en
		 * 1, un reparto a medias y el total con el ajuste de ese reparto. Alcanza con que el
		 * vendedor destilde "Guardar como presupuesto" para que eso se convierta en una VENTA
		 * comun con el cobro de un presupuesto que nunca se guardo.
		 *
		 * Es idempotente: sin foto (no hay pregunta en curso) solo apaga la marca.
		 */
		deshacer_cobro_del_presupuesto() {
			let previo = this.cobro_previo_al_presupuesto

			this.cobro_previo_al_presupuesto = null
			this.$store.commit('vender/set_budget_cobro_pendiente', false)

			if (!previo) {
				return
			}

			this.$store.commit('vender/set_omitir_en_cuenta_corriente', previo.omitir_en_cuenta_corriente)
			this.$store.commit('vender/setCurrentAcountPaymentMethodId', previo.current_acount_payment_method_id)
			this.$store.commit('vender/set_caja_id', previo.caja_id)
			this.$store.commit('vender/setSelectedPaymentMethods', previo.selected_payment_methods)
			this.$store.commit('vender/set_modal_payment_methods', previo.modal_payment_methods)

			// El total vuelve a ser el que se veia: con el ajuste del reparto anterior, si lo habia.
			this.setTotal()
		},
		/**
		 * Cierra la pregunta cuando el guardado salio bien. Va ANTES de limpiar_vender().
		 *
		 * La caja de la venta en curso se devuelve a lo que tenia: la rama "No" la puso en 0 para
		 * que el reparto no heredara una caja del metodo unico, y limpiar_vender() --a proposito--
		 * no toca la caja. Sin esto la venta SIGUIENTE arrancaba sin caja. Tiene que ir antes y no
		 * despues porque set_caja_id marca la venta como inicializada, y la ultima linea de
		 * limpiar_vender() es la que apaga esa marca.
		 *
		 * Todo lo demas (reparto, omitir, metodo de pago, marca) lo deja limpiar_vender().
		 */
		cerrar_cobro_del_presupuesto() {
			let previo = this.cobro_previo_al_presupuesto

			this.cobro_previo_al_presupuesto = null
			this.$store.commit('vender/set_budget_cobro_pendiente', false)

			if (previo) {
				this.$store.commit('vender/set_caja_id', previo.caja_id)
			}
		},

		/**
		 * Las filas del reparto de metodos de pago que viajan con el presupuesto, o [] si va a la
		 * cuenta corriente.
		 *
		 * Las filas conservan TODO lo que traen --incluidos discount_amount y surchage_amount--: la
		 * API deriva de ahi el ajuste del total por metodo de pago y no tiene otra fuente. Solo se
		 * saca el __row_id, que es la identidad de la fila en el modal y no le sirve a nadie mas.
		 *
		 * @returns {Array}
		 */
		get_selected_payment_methods() {
			if (!this.omitir_en_cuenta_corriente) {
				return []
			}

			let filas = []

			this.$store.state.vender.selected_payment_methods.forEach(fila => {
				let copia = Object.assign({}, fila)
				delete copia.__row_id
				filas.push(copia)
			})

			return filas
		},
		/**
		 * ¿Este presupuesto viaja de contado? Es la misma regla que aplica la API: "omitir en
		 * cuenta corriente" prendido Y al menos una fila de reparto. Un omitir en 1 sin reparto es
		 * cuenta corriente para la API, y mandarlo asi dispararia el aviso de "API vieja" de
		 * avisar_si_la_api_no_guardo_el_cobro() por nada.
		 *
		 * @param {Array} filas Lo que devolvio get_selected_payment_methods().
		 * @returns {boolean}
		 */
		viaja_de_contado(filas) {
			return !!this.omitir_en_cuenta_corriente && filas.length > 0
		},
		/**
		 * Avisa cuando se pidio un cobro de contado y el servidor lo guardo a la cuenta corriente.
		 *
		 * Pasa con una API anterior a esta funcion (ignora las claves nuevas y guarda
		 * omitir_en_cuenta_corriente en 0) o con la columna sin migrar. Sin el aviso el vendedor
		 * creeria que el presupuesto quedo para cobrar al confirmar, y al confirmarlo la deuda
		 * aparecería en la cuenta corriente del cliente.
		 *
		 * @param {Object} model El presupuesto que devolvio la API.
		 * @param {boolean} se_pidio_de_contado Si el payload iba de contado.
		 */
		avisar_si_la_api_no_guardo_el_cobro(model, se_pidio_de_contado) {
			if (!se_pidio_de_contado) {
				return
			}

			if (model && Number(model.omitir_en_cuenta_corriente)) {
				return
			}

			this.$toast.warning('El presupuesto se guardó a la cuenta corriente: el servidor todavía no soporta cobrar presupuestos. Al confirmarlo se va a generar la deuda del cliente.', {
				duration: 20000,
			})
		},

		actualizar() {
			// Se calculan una vez y se usan en el payload y en la respuesta: lo que se mando es lo que se compara.
			let selected_payment_methods = this.get_selected_payment_methods()
			let de_contado = this.viaja_de_contado(selected_payment_methods)

			this.$api.put('budget/'+this.budget.id, {
				// Cliente actualmente seleccionado en VENDER (refleja un cambio de cliente hecho
				// en la edición); si por algún motivo no hay cliente en store, se usa el original
				// del presupuesto como resguardo.
				'client_id'                 : this.client ? this.client.id : this.budget.client_id,

				/*
					Viaja tambien al actualizar, no solo al crear. Hasta esta mision el PUT no lo
					mandaba y BudgetController::update() no tocaba price_type_id, asi que un
					presupuesto guardado sin lista (o con una que ya no corresponde) se quedaba asi
					para siempre, y la venta que nace al confirmarlo heredaba ese null. En el back
					la clave ausente preserva lo guardado (SPA vieja) y null explicito en una
					cuenta con listas contesta 422.
				*/
				'price_type_id'				: this.get_price_type_id(),

				'start_at'                  : this.budget.start_at,
				'finish_at'                 : this.budget.finish_at,
				'observations'              : this.observations,
				'total'              		: this.total,
				'address_id'              	: this.address_id,
				'surchages_in_services'		: this.surchages_in_services,
				'discounts_in_services'		: this.discounts_in_services,

				/*
					El flag tiene que viajar. Con el prendido, generals.js::getPriceVender() ya dejo
					el recargo adentro de cada price_vender y vender_set_total.js::aplicar_surchages()
					se salteo sumarlo al total: los precios y el total que mandamos ya lo contemplan.
					Si el campo no llega, BudgetHelper::getTotal() vuelve a sumar el recargo sobre
					precios que ya lo traen, no le cierra con el total del request y rechaza el guardado
					con "El total del presupuesto no corresponde con los productos ingresados".
				*/
				'aplicar_recargos_directo_a_items'	: this.aplicar_recargos_directo_a_items,

				/*
					🔴 El total forzado tiene que viajar, igual que el flag de arriba y por el mismo
					motivo: `total` ya lo trae aplicado (lo suma vender_set_total.js al final de
					setTotal()), pero BudgetHelper::getTotal() recalcula el total desde los items,
					donde el ajuste no esta. Sin este campo la diferencia se pasa de la tolerancia y
					el guardado rebota con "El total del presupuesto no corresponde con los
					productos ingresados" --un mensaje que no nombra al forzado por ningun lado--.

					Y lo necesita ademas para arrastrarlo a la venta cuando el presupuesto se
					convierte, que es donde el forzado tiene que sobrevivir.
				*/
				'forzar_total_monto'		: this.forzar_total_monto,

				'moneda_id'              	: this.moneda_id,

				/*
					La cotizacion viaja tambien al actualizar, no solo al crear: ahora que el presupuesto
					se puede pasar de $ a USD (o al reves) editandolo, los precios de los renglones ya
					estan en la moneda nueva y la API tiene que guardar la cotizacion con la que se
					convirtieron. Sin ella el presupuesto quedaba en USD con la cotizacion vieja (o
					NULL) y al confirmarlo la venta nacia mal cotizada. Es la del campo USD de VENDER:
					la guardada en el presupuesto, o el dolar del sistema si no tenia, y editable.
					Una API vieja ignora la clave: queda la cotizacion anterior, como siempre.
				*/
				'valor_dolar'				: this.valor_dolar,

				/*
					🔴 Cuenta corriente o cobro al confirmar (cambio del 1/10/2026 sobre la decision del
					18/9/2026).

					El 18/9 Lucas decidio que un presupuesto iba SIEMPRE a la cuenta corriente, y este
					campo viajaba 0 fijo: el presupuesto no guardaba ningun dato de cobro, asi que la
					venta que nacia al confirmarlo de contado quedaba sin metodo de pago ni caja. El
					1/10 el presupuesto pasa a guardar el reparto de metodos de pago, y el vendedor
					elige al tocar "Guardar presupuesto" (cartel components/vender/modals/budget-cobro).

					Viaja 1 solo si el reparto trae al menos una fila; el default sigue siendo la
					cuenta corriente (0 y sin reparto), que es lo que entiende una API anterior.
				*/
				'omitir_en_cuenta_corriente'              	: de_contado ? 1 : 0,

				/*
					El reparto tal cual lo armo el modal, con discount_amount / surchage_amount por fila:
					de ahi deriva la API el ajuste del total (descuento por transferencia, recargo por
					cuotas). `total`, mas arriba, ya viaja NETO: es el del store, con ese ajuste adentro.
				*/
				'selected_payment_methods'	: selected_payment_methods,

				// Id 1 es el estado "sin confirmar"
				'budget_status_id'          : this.budget.budget_status_id,

				'discounts'					: this.get_discounts(),
				'surchages'					: this.get_surchages(),
				'articles'					: this.get_articles(true),
				'services'					: this.get_services(),
				'promocion_vinotecas'		: this.get_promocion_vinotecas(),
				'combos'					: this.get_combos(),
				'discount_stock'			: this.discount_stock,
				'sale_status_id'			: this.sale_status_id,
				'iva_aplicado'				: this.iva_aplicado,
			})
			.then(res => {
				// Primero, antes de cualquier cosa que pueda tirar un error: si algo de abajo falla, el
				// .catch no tiene que "deshacer" un cobro que el servidor ya guardo.
				this.cerrar_cobro_del_presupuesto()

				this.$store.commit('auth/setMessage', '')
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Presupuesto actualizado')
				this.avisar_si_la_api_no_guardo_el_cobro(res.data.model, de_contado)
				this.$store.commit('budget/add', res.data.model)
				/*
					limpiar_vender() vuelve a poner el metodo de pago por defecto (lo hace adentro
					desde esta mision): abrir un presupuesto para editarlo lo deja en 0, y sin eso
					la venta siguiente arrancaba en "Seleccione metodo de pago". Tambien deja en cero el
					reparto y el "omitir en cuenta corriente" del cobro de este presupuesto.
				*/
				this.limpiar_vender()
			})
			.catch(err => {
				this.$store.commit('auth/setMessage', '')
				this.$store.commit('auth/setLoading', false)

				// El guardado fallo: la pantalla vuelve a como estaba antes del cartel, para que el
				// reparto de este intento no se le pegue a lo que el vendedor haga despues.
				this.deshacer_cobro_del_presupuesto()

				/*
					Si el backend mando un mensaje, ACA NO SE MUESTRA NADA: ya lo mostro el handler
					global. El interceptor de `main.js` despacha `errorEvent` para cualquier 4xx que
					no sea validacion de Laravel, y `common-vue/components/error/Index.vue` —montado
					en `App.vue`— hace `$toast.warning(error.response.data.message)`.

					Antes este catch tiraba dos toasts encima de ese: "Error al guardar Presupuesto"
					y "Codigo: ERR_BAD_REQUEST. Detalle: Request failed with status code 422". O sea
					que el mensaje util estaba, pero sepultado entre dos que no dicen nada.

					Importa desde la mision 161, porque PUT budget/{id} ahora puede devolver un 422
					redactado para el usuario ("El presupuesto esta confirmado. Anulalo antes de
					editarlo."), al que se llega si alguien confirma el presupuesto —desde el listado
					o desde otra pestaña— mientras vos lo estas editando en VENDER.

					El detalle tecnico queda solo para cuando NO hay mensaje del back y el handler
					global no tiene nada que mostrar: respuesta sin cuerpo, o un error que no es de
					axios (un TypeError en el .then de arriba). La caida de red y el timeout tambien
					van por el global (main.js muestra "No pudimos conectarnos..." para todo error de
					axios sin `response`): acá NO se suma nada, que antes eran tres carteles por el
					mismo corte --el del global y estos dos-- y el vendedor no sabia cual leer.
				*/
				let hay_mensaje_del_back = Boolean(err && err.response && err.response.data && err.response.data.message)

				let es_corte_de_red = Boolean(err && err.isAxiosError && !err.response)

				if (!hay_mensaje_del_back && !es_corte_de_red) {
					this.$toast.error('Error al guardar Presupuesto')
					console.log(err)
					this.$toast.error('Codigo: '+(err ? err.code : '')+'. Detalle: '+(err ? err.message : ''), {
						duration: 100000,
					})
				}
			})
		},
		crear() {
			// Se calculan una vez y se usan en el payload y en la respuesta: lo que se mando es lo que se compara.
			let selected_payment_methods = this.get_selected_payment_methods()
			let de_contado = this.viaja_de_contado(selected_payment_methods)

			this.$api.post('budget', {
				'client_id'                 : this.client.id,
				'price_type_id'				: this.get_price_type_id(),	
				'start_at'                  : null,
				'finish_at'                 : null,
				'observations'              : this.observations,
				'total'              		: this.total,
				'address_id'              	: this.address_id,
				'moneda_id'              	: this.moneda_id,
				'surchages_in_services'		: this.surchages_in_services,
				'discounts_in_services'		: this.discounts_in_services,

				// Viaja por el mismo motivo que en actualizar(): con el flag prendido los price_vender
				// ya traen el recargo adentro, y sin este campo el back se lo vuelve a sumar y rechaza
				// el total.
				'aplicar_recargos_directo_a_items'	: this.aplicar_recargos_directo_a_items,

				// Viaja por el mismo motivo que en actualizar(): sin el, BudgetHelper::getTotal()
				// recalcula el total sin el ajuste y rechaza el guardado.
				'forzar_total_monto'		: this.forzar_total_monto,

				'valor_dolar'				: this.valor_dolar,

				// Cuenta corriente o cobro al confirmar: ver el comentario largo en actualizar() (cambio
				// del 1/10/2026 sobre la decision del 18/9/2026). Viaja 1 solo con un reparto no vacio.
				'omitir_en_cuenta_corriente'              	: de_contado ? 1 : 0,

				// El reparto de metodos de pago, con discount_amount / surchage_amount por fila. `total`
				// (mas arriba) ya viaja NETO.
				'selected_payment_methods'	: selected_payment_methods,

				// Id 1 es el estado "sin confirmar"
				'budget_status_id'          : 1,

				'discounts'					: this.get_discounts(),
				'surchages'					: this.get_surchages(),
				'articles'					: this.get_articles(),
				'services'					: this.get_services(),
				'promocion_vinotecas'		: this.get_promocion_vinotecas(),
				'combos'					: this.get_combos(),
				'discount_stock'			: this.discount_stock,
				'sale_status_id'			: this.sale_status_id,
				'iva_aplicado'				: this.iva_aplicado,
			}, {
				/*
					El aviso global del interceptor se apaga: el catch de abajo ya muestra el
					mensaje del back (el 422 de la lista de precios, entre otros), y con el handler
					global el mismo texto salia repetido. actualizar() no lo apaga a proposito:
					confia solo en el global.
				*/
				skip_global_error_event: true,
			})
			.then(res => {
				// Primero, antes de cualquier cosa que pueda tirar un error (ver actualizar()).
				this.cerrar_cobro_del_presupuesto()

				this.$store.commit('auth/setMessage', '')
				this.$store.commit('auth/setLoading', false)
				this.$toast.success('Presupuesto guardado')
				this.avisar_si_la_api_no_guardo_el_cobro(res.data.model, de_contado)
				this.$store.commit('budget/add', res.data.model)
				this.limpiar_vender()
			})
			.catch(err => {
				this.$store.commit('auth/setMessage', '')
				this.$store.commit('auth/setLoading', false)

				// El guardado fallo: la pantalla vuelve a como estaba antes del cartel (ver actualizar()).
				this.deshacer_cobro_del_presupuesto()

				console.log(err)

				/*
					🔴 UN solo aviso por error. Este POST apaga el aviso global del interceptor
					(skip_global_error_event, arriba), que ademas del mensaje del back calla el toast
					de red: este catch es el unico que avisa, asi que tiene que cubrir los tres casos.

					- Con mensaje del back (el 422 de la lista de precios, entre otros): solo ese.
					  Antes salia ademas el generico "Error al guardar Presupuesto" encima.
					- Error de axios sin `response` (servidor caido, red cortada, timeout): un mensaje
					  de conexion, en vez del "Codigo: ERR_NETWORK. Detalle: Network Error" de cien
					  segundos.
					- Con respuesta pero sin mensaje: el generico con el detalle tecnico.
					- Un error que NO es de axios (un TypeError en el .then de arriba, DESPUES de que
					  el POST ya guardo): tampoco tiene `response`, y decirle "lo mas probable es que
					  NO se haya guardado" lo manda a duplicarlo. Se distingue por isAxiosError.
				*/
				let mensaje_del_back = err && err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: null

				let es_error_de_red = Boolean(err && err.isAxiosError && !err.response)

				if (mensaje_del_back) {

					this.$toast.error(mensaje_del_back, {
						duration: 10000
					})

				} else if (!err || !err.isAxiosError) {

					this.$toast.error('Ocurrió un error inesperado al guardar. Fijate en Presupuestos si quedó guardado antes de volver a intentar; si el problema sigue, recargá la página.', {
						duration: 15000,
					})

				} else if (es_error_de_red) {

					this.$toast.error('No pudimos conectarnos con el servidor. Lo más probable es que el presupuesto NO se haya guardado: revisá la conexión, fijate en Presupuestos y volvé a intentar.', {
						duration: 15000,
					})

				} else {

					this.$toast.error('Error al guardar Presupuesto. Codigo: '+err.code+'. Detalle: '+err.message, {
						duration: 15000,
					})
				}
			})
		},
		get_price_type_id() {
			if (this.price_type) {
				return this.price_type.id  
			}
			return null
		},

		get_discounts() {
			let discounts = []
			let discount = null

			this.discounts_id.forEach(discount_id => {
				discount = this.discounts.find(_discount => {
					return _discount.id == discount_id
				})

				if (typeof discount != 'undefined') {
					discounts.push(discount)
				}
			})
			return discounts
		},
		get_surchages() {
			let surchages = []
			let surchage = null

			this.surchages_id.forEach(surchage_id => {
				surchage = this.surchages.find(_surchage => {
					return _surchage.id == surchage_id
				})

				if (typeof surchage != 'undefined') {
					surchages.push(surchage)
				}
			})
			return surchages
		},
		get_articles(for_update = false) {

			console.log('get_articles presupuesto')

			console.log(this.articles)

			let articles = []

			this.articles.forEach(article => {

				let ya_estaba_cargado = typeof article.pivot != 'undefined'

				// Se agregan 'name' y 'name_vender_personalizado' a nivel raíz de article_to_add
				// para que el backend (SaleHelper::get_custom_name_for_pivot) pueda leerlos:
				// 'name' es el nombre base del articulo (permite comparar sin consulta extra) y
				// 'name_vender_personalizado' es el nombre editado por línea en el input de
				// ArticlesTable.vue. Si no se editó, se manda null. Estas claves quedan
				// preservadas tanto si article_to_add se manda "plano" (crear) como si se
				// anida bajo pivot (actualizar), porque ambas ramas parten de este mismo objeto.
				let article_to_add = {
					id: article.id,
					status: article.status,
					cost_in_dollars: article.cost_in_dollars,
					name: article.name,
					name_vender_personalizado: article.name_vender_personalizado || null,
				}

				let pivot_info = {
					amount : article.amount,
					price : article.price_vender,
					cost : article.cost,
					costo_real : article.costo_real,
					// Sin esto, SaleHelper::getCost() calcula el costo desde costo_real (el del
					// bulto entero) y no tiene por cuanto dividirlo: la linea del presupuesto queda
					// con el costo del bulto en vez del costo por unidad individual.
					unidades_individuales : article.unidades_individuales,
					presentacion : article.presentacion,
					price_type_personalizado_id : article.price_type_personalizado_id,
					bonus : typeof article.discount != 'undefined' ? article.discount : null,
					location : null,
					/*
						Precio sin los recargos de venta (ver precio_sin_recargos_del_renglon). Va al
						lado de `price`, asi que viaja plano al crear y adentro de `pivot` al
						actualizar un renglon que ya estaba cargado, igual que el precio.
					*/
					price_vender_sin_recargos : this.precio_sin_recargos_del_renglon(article),
				}

				if (
					for_update
					&& ya_estaba_cargado
				) {
					article_to_add.pivot = pivot_info
				} else {
					article_to_add = {
						...article_to_add,
						...pivot_info,
					}
				}

				articles.push(article_to_add)

				// articles.push({
				// 	id: article.id,
				// 	status: article.status,
				// 	cost_in_dollars: article.cost_in_dollars,

				// 	amount: article.amount,
				// 	price: article.price_vender,
				// 	cost: article.cost,
				// 	costo_real: article.costo_real,
				// 	presentacion: article.presentacion,
				// 	price_type_personalizado_id: article.price_type_personalizado_id,
				// 	bonus: typeof article.discount != 'undefined' ? article.discount : null,
				// 	location: null,
				// 	// pivot: {
				// 	// 	amount: article.amount,
				// 	// 	price: article.price_vender,
				// 	// 	cost: article.cost,
				// 	// 	costo_real: article.costo_real,
				// 	// 	presentacion: article.presentacion,
				// 	// 	price_type_personalizado_id: article.price_type_personalizado_id,
				// 	// 	bonus: typeof article.discount != 'undefined' ? article.discount : null,
				// 	// 	location: null,
				// 	// }
				// })
				console.log(articles)
			})
			return articles
		},
		get_services() {
			console.log('get_services presupuesto')
			let services = []
			this.services.forEach(service => {
				services.push({
					id: service.id,
					pivot: {
						amount: service.amount,
						price: service.price_vender,
						price_vender_sin_recargos: this.precio_sin_recargos_del_renglon(service),
					}
				})
				console.log(services)
			})
			return services
		},
		get_promocion_vinotecas() {
			console.log('get_promocion_vinotecas presupuesto')
			let promocion_vinotecas = []
			this.promocion_vinotecas.forEach(promo => {
				promocion_vinotecas.push({
					id: promo.id,
					pivot: {
						amount: promo.amount,
						price: promo.price_vender,
						price_vender_sin_recargos: this.precio_sin_recargos_del_renglon(promo),
					}
				})
				console.log(promocion_vinotecas)
			})
			return promocion_vinotecas
		},
		/*
			Mismo contrato que get_promocion_vinotecas(): el pivot viaja con la cantidad y el precio
			que quedo en el remito (price_vender, no combo.price, para que el presupuesto guarde el
			precio que el vendedor vio). BudgetHelper del lado API lo lee de esta misma forma.
		*/
		get_combos() {
			let combos = []
			this.combos.forEach(combo => {
				combos.push({
					id: combo.id,
					pivot: {
						amount: combo.amount,
						price: combo.price_vender,
						price_vender_sin_recargos: this.precio_sin_recargos_del_renglon(combo),
					}
				})
			})
			return combos
		},
		/**
		 * El precio SIN los recargos de venta de un renglon del remito, para el payload del
		 * presupuesto (mision recargos-en-precios-editable, 28/9/2026). Lo deja
		 * generals.js::getPriceVender() en item.price_vender_sin_recargos cada vez que calcula el
		 * precio; null si el precio no tiene recargos adentro.
		 *
		 * 🔴 Viaja SIEMPRE, tambien en null, y no se omite "porque es null". En el presupuesto la
		 * API trata distinto la clave ausente y la clave en null: ausente PRESERVA la base guardada
		 * del renglon si el precio no cambio (es lo que manda el formulario generico del modulo
		 * Presupuestos, que no conoce la clave), y null la BORRA. Con la opcion apagada el renglon
		 * tiene que quedar sin base, y solo el null lo dice.
		 *
		 * A diferencia de la venta -donde el item viaja entero- aca los renglones se arman a mano,
		 * asi que cada get_* tiene que sumar la clave: el que se olvide deja el presupuesto con la
		 * opcion prendida bloqueado al reabrirlo.
		 *
		 * @param {Object} item
		 * @returns {Number|null}
		 */
		precio_sin_recargos_del_renglon(item) {
			let precio_sin_recargos = item ? item.price_vender_sin_recargos : null

			if (
				typeof precio_sin_recargos != 'number'
				|| isNaN(precio_sin_recargos)
				|| !isFinite(precio_sin_recargos)
			) {
				return null
			}

			return precio_sin_recargos
		},

	}
}