<template>
	<div>
		<!--
			usar-cliente: "Usar cliente para la venta" del modal de ARCA (el CUIT ya era de un
			cliente cargado). El modal solo avisa; elegirlo pasa por setSelected(), igual que un clic
			en el buscador. Ver usar_cliente_de_arca().
		-->
		<modal-result
		:title="afip_modal_title"
		:afip_data="afip_data"
		:client_model="client_model_for_afip_modal"
		@usar-cliente="usar_cliente_de_arca"></modal-result>

		<!--
			Buscador de cliente con ícono distintivo en etapa 1 de vender.

			elegir_al_crear: el cliente que se crea desde acá —el "+ Cliente" del buscador o "Crear
			cliente y usar para esta venta" del modal de ARCA (buscar-por-cuit/ModalResult.vue)— queda
			elegido para la venta al guardar, pasando por el mismo setSelected() de abajo que un clic en
			los resultados. Pedido de Lucas, 4/10/2026: antes volvía al buscador y había que elegirlo a
			mano. Solo en el alta: editar el cliente desde el chip no lo vuelve a elegir.
		-->
		<!--
			:key="buscador_cliente_key": se incrementa cuando clearSelected() RECHAZA sacar el cliente
			(venta guardada que iba a la cuenta corriente). El buscador ya borro su chip antes de
			avisar (search/Index.vue::clearSelected pone selected_model en null y despues emite) y el
			store no cambio, asi que nada le avisa que vuelva a mostrar el cliente: recrearlo lo hace
			leer otra vez `_vender.client`, sin tocar el componente comun.
		-->
		<div
		v-if="puede_cambiar_cliente"
		class="vender-stage__client-search">
			<!--
				Sin conexión (misión clientes-sin-internet, 26/10/2026): busca en los clientes
				guardados en el equipo (search_clients_offline, src/mixins/model_functions.js) y no
				ofrece "+ Cliente" ni la consulta a ARCA del segundo Enter, que necesitan servidor. Ver
				el computed `sin_conexion`. `save_if_not_exist` también se apaga: sin la consulta a ARCA,
				el segundo Enter sin resultados caía en "crear el cliente con lo escrito" (POST
				search/save-if-not-exist), que sin red falla y con un servidor lento podía crear un
				cliente llamado como el CUIT a medio escribir.
			-->
			<search-component
			:key="buscador_cliente_key"
			id="select_client_vender"
			@setSelected="setSelected"
			:prop="prop_buscador_cliente"
			:model="_vender.client"
			model_name="client"
			:props_to_filter="['num', 'name', 'phone', 'dni', 'cuit']"
			:show_btn_create="!sin_conexion"
			:save_if_not_exist="!sin_conexion"
			elegir_al_crear
			:search_from_api="!sin_conexion"
			:search_function="sin_conexion ? 'search_clients_offline' : null"
			:tax_id_afip_lookup_on_second_enter="!sin_conexion"
			placeholder="Buscar cliente, CUIT o DNI"
			input_icon="icon-user-o"
			:props_to_send_to_api="props_to_send_to_api"
			set_selected_model_with_model_prop
			@requestClientAfipLookup="onRequestClientAfipLookup"
			@clearSelected="clearSelected"></search-component>
		</div>
		<div
		v-else-if="client">
			<p
			class="selected-client">
				<i class="icon-user"></i>
				Cliente seleccionado: {{ client.name }}
			</p>
		</div>
		<!--
			El checkbox "Enviar correo al cliente" que estaba aca abajo ahora es un campo propio del
			diseño de Vender: stage-1/EnviarCorreo.vue (mision diseno-vender-configurable, 28/9/2026).
			clearSelected() de abajo lo sigue apagando al sacar el cliente.
		-->
	</div>
</template>
<script>
// import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import price_types from '@/mixins/vender/price_types'
import computed from '@/mixins/vender/computed'
import default_payment_method from '@/mixins/vender/default_payment_method'
import set_afip_tipo_comprobante from '@/mixins/vender/set_afip_tipo_comprobante'
import ajustes_del_cliente from '@/mixins/vender/ajustes_del_cliente'
/*
	La regla de "la venta es a cuenta corriente" (tiene cliente y no esta omitida, o sea que no es de
	contado) es UNA sola y vive con el aviso de cambio de cuenta: si cambia, cambia para los dos.
*/
import { venta_es_a_cuenta_corriente } from '@/mixins/vender/previus_sale/aviso_cambio_de_cuenta'
export default {
	mixins: [price_types, vender_set_total, computed, default_payment_method, set_afip_tipo_comprobante, ajustes_del_cliente],
	// mixins: [vender, vender_set_total],
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		/* Modal de resultado AFIP — ubicado en la subcarpeta de esta etapa */
		ModalResult: () => import('./buscar-por-cuit/ModalResult'),
	},
	data() {
		return {
			afip_modal_title: '',
			afip_data: null,
			client_model_for_afip_modal: null,
			/*
				Espera armada por enfocar_buscador_al_cerrar_modal_de_arca(): `{ handler, tope }`, o
				null si no hay ninguna. Se guarda para poder desarmarla (el $off del listener de $root
				y el clearTimeout del tope) desde cualquiera de los tres caminos que la cierran.
			*/
			foco_pendiente_tras_arca: null,
			// Se incrementa para recrear el buscador cuando se rechaza sacar el cliente (ver el template).
			buscador_cliente_key: 0,
		}
	},
	beforeDestroy() {
		/*
			🔴 Obligatorio, no higiene: el listener de bv::modal::hidden vive en $root, que dura toda
			la sesion. Si Vender se destruye con la espera armada, sin esto quedaria colgado de una
			instancia muerta.
		*/
		this.cancelar_foco_pendiente_tras_arca()
	},
	computed: {
		price_types() {
			return this.$store.state.price_type.models
		},
		/**
		 * ¿Vender está trabajando sin conexión? Es el mismo dato con el que busca los artículos en el
		 * equipo (ArticleBarCode.vue) y guarda las ventas en el equipo (guardar_venta): lo apagan los
		 * eventos del navegador, la sesión restaurada sin servidor y el sondeo cuando el servidor deja
		 * de contestar (src/offline/index.js).
		 *
		 * @returns {Boolean}
		 */
		sin_conexion() {
			return this.$store.state.auth.online === false
		},
		/**
		 * La `prop` del buscador. `search_from_api_function` es por el celular: sin conexión el modal
		 * común igual iría a la API si el store `client` está vacío y marcado para no bajarse en el
		 * teléfono (search/Modal.vue::searchFromApi). Esa función se consulta ANTES de esa regla, así
		 * que con ella manda `auth.online` también en el celular. Ver
		 * src/mixins/model_functions.js::clientes_desde_la_api().
		 *
		 * @returns {Object}
		 */
		prop_buscador_cliente() {
			return {
				text: 'Cliente',
				key: 'client_id',
				search_from_api_function: 'clientes_desde_la_api',
			}
		},
		_vender: {
			get() {
				return this.$store.state.vender
			},
			set(value) {

			}
		},
		// Filtro por sucursal del buscador de clientes de VENDER.
		//
		// Viaja por props_to_send_to_api y NO por props_extras: este buscador tiene
		// search_from_api, y Modal.vue solo consume props_extras dentro de su rama de busqueda
		// offline, asi que por ese canal el filtro nunca llegaba al backend (medido el 11/8/2026:
		// era codigo muerto desde el dia uno).
		//
		// El parametro address_id_con_nulos lo entiende SearchController@searchFromModal y trae
		// tambien a los clientes sin sucursal asignada: la regla unica del sistema es que un
		// cliente sin sucursal aparece en TODAS las sucursales (decision de Lucas, 11/8/2026).
		props_to_send_to_api() {
			if (!this.hasExtencion('filtrar_clientes_por_sucursal_en_vender')) {
				return []
			}
			let address_id = this.$store.state.vender.address_id
			// Sin sucursal elegida en VENDER (arranca en 0) no se filtra nada: un negocio que
			// todavia no eligio sucursal no puede quedarse sin clientes en el buscador.
			if (!address_id) {
				return []
			}
			return [
				{
					key: 'address_id_con_nulos',
					value: address_id
				}
			]
		},
		/*
			Determina si se puede elegir/cambiar el cliente en VENDER.
			- Venta nueva: siempre.
			- Presupuesto en edición: solo si no está confirmado (estado 2). (De todos modos el
			  botón "Actualizar en VENDER" ya viene deshabilitado para confirmados.)
			- Venta guardada en edición (mision edicion-completa-ventas-presupuestos, 8/10/2026): el
			  buscador se ve en todas, apenas la venta llego. Lo que cambia segun el tipo de venta es
			  que pasa al elegir y al sacar el cliente (setSelected / clearSelected):
			  · A CUENTA CORRIENTE (con cliente y no omitida): se puede CAMBIAR por otro cliente. Si
			    tenia el debito en la cuenta corriente, la API lo saca de la cuenta del original, lo
			    crea en la del nuevo y recalcula entera la de la que salio; lo cobrado queda en la
			    del original (decision 1 de Lucas) y BtnGuardar lo avisa antes de guardar. Si todavia
			    no lo tenia (para checkear, o "a la cuenta corriente despues de facturar"), cambiar
			    el cliente no mueve nada y entra a la del nuevo cuando le toque. SACARLO no se
			    permite en ninguna de las dos: la pasaria a contado (ver clearSelected()).
			  · OMITIDA en la cuenta corriente: como siempre (no mueve ninguna cuenta).
			  · De CONTADO (sin cliente y no omitida): se le puede poner un cliente, pero la venta
			    SIGUE SIENDO de contado: setSelected() la deja omitida. Hasta la revision de esta
			    mision no tenia buscador y la pantalla no explicaba por que; pasarla a cuenta
			    corriente la dejaria cobrada y ademas deuda (la API no le saca los metodos de pago
			    cuando deja de ser de contado).
		*/
		puede_cambiar_cliente() {
			if (this.budget) {
				return this.budget.budget_status_id != 2
			}
			if (!this.editando_venta_previa) {
				return true
			}
			return !!(this.previus_sale && this.previus_sale.id)
		},
		/*
			La venta guardada que se esta editando es A CUENTA CORRIENTE (tiene cliente y no esta
			omitida), tal como esta GUARDADA y no como la dejo el vendedor en esta edicion: es lo que
			decide que sacar el cliente no se permite. Incluye a las que todavia no tienen el debito
			(para checkear, o con save_current_acount en 0): tampoco son de contado.
		*/
		venta_previa_a_cuenta_corriente() {
			return this.editando_venta_previa && venta_es_a_cuenta_corriente(this.previus_sale)
		},
		/*
			La venta guardada que se esta editando es de CONTADO SIN CLIENTE: no tiene cliente y no
			esta omitida, tal como esta GUARDADA. Ponerle un cliente no la pasa a cuenta corriente
			(ver setSelected) y sacarselo la deja como estaba (ver clearSelected). Con el `id`: mientras
			la venta se esta abriendo previus_sale es {} y no es de contado ni de nada.
		*/
		venta_previa_de_contado_sin_cliente() {
			return Boolean(
				this.editando_venta_previa
				&& this.previus_sale
				&& this.previus_sale.id
				&& !(Number(this.previus_sale.client_id) > 0)
				&& !Number(this.previus_sale.omitir_en_cuenta_corriente)
			)
		},
	},
	watch: {
		client() {
			// En edición (venta previa o presupuesto existente) se conservan los precios
			// ya guardados: se recalcula desde el pivot, igual que las ventas en edición.
			if (this.editando_venta_previa || this.budget) {
				this.setItemsPrices(false, true)
			} else {
				this.setItemsPrices(false, false)
			}
			this.setTotal()
			// this.$store.commit('vender/setTotal')
		},
	},
	methods: {
		/**
		 * Segundo Enter en el buscador sin resultados: consulta AFIP por CUIT o DNI y abre el modal.
		 *
		 * @param {{ query: string, normalized_digits: string }} payload Criterio original y solo dígitos para la URL.
		 */
		onRequestClientAfipLookup(payload) {
			let self = this
			let digits = payload.normalized_digits
			this.$store.commit('auth/setMessage', 'Consultando a AFIP')
			this.$store.commit('auth/setLoading', true)
			this.$api.get('client/get-afip-information-by-cuit/' + encodeURIComponent(digits))
				.then(function (res) {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					let data = res.data
					if (data.hubo_un_error) {
						self.$toast.error('Afip dice: ' + data.error, {
							duration: 7000,
						})
						self.afip_data = null
						self.client_model_for_afip_modal = null
						return
					}
					self.afip_data = data.afip_data
					let existing = data.model || data.client_model
					if (existing) {
						self.afip_modal_title = 'Cliente ya existente en el sistema'
						self.client_model_for_afip_modal = existing
					} else {
						self.afip_modal_title = 'Resultados (cliente no registrado en sistema)'
						self.client_model_for_afip_modal = null
					}
					self.$bvModal.hide('select_client_vender-search-modal')
					self.$bvModal.show('afip-data-modal')
				})
				.catch(function (err) {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					console.log(err)
					self.$toast.error('Error al buscar')
				})
		},
		setSelected(result) {

			/*
				🔴 Venta guardada de CONTADO SIN CLIENTE: el cliente queda asociado, pero la venta SIGUE
				SIENDO de contado. "Omitir cuenta corriente" se prende ANTES que todo lo demas, porque de
				el depende lo que sigue: con omitir en 1 el PUT viaja como venta de contado
				(PaymentMethodHelper::validar_venta_actualizada y SaleHelper::attachSelectedPaymentMethods
				le re-adjuntan el mismo metodo de pago) y la API no le crea debito
				(va_a_volver_a_la_cuenta_corriente da false). El toggle de omitir esta deshabilitado
				editando una venta guardada, asi que el vendedor no la puede pasar a cuenta corriente por
				otro lado.

				Y por eso tampoco se llama a bloquear_caja(): la caja es de un cobro que sigue en pie.
				(Ademas, en este componente bloquear_caja() lee un computed `omitir_en_cuenta_corriente`
				que ninguno de sus mixins define, asi que pondria la caja en 0 siempre.)
			*/
			let sigue_de_contado = this.venta_previa_de_contado_sin_cliente

			if (sigue_de_contado) {
				this.$store.commit('vender/set_omitir_en_cuenta_corriente', 1)
			} else {
				// this.bloquear_metodo_de_pago()
				this.bloquear_caja()
			}

			// Cliente elegido en el buscador
			/*
				Un cliente que salió del equipo (sin conexión) viene congelado: ver
				search_clients_offline() en src/mixins/model_functions.js. Se guarda una copia plana,
				para que el store lo tenga como cualquier otro cliente (reactivo y modificable).
			*/
			let client = result.model && Object.isFrozen(result.model)
				? JSON.parse(JSON.stringify(result.model))
				: result.model

			/*
				Si el comprobante en edicion tiene un canje de puntos, vender/setClient lo va a anular
				(los puntos eran del cliente que estaba: ver store/vender/vender.js) y el total sube.
				Hasta esta mision pasaba en silencio; ahora que una venta a cuenta corriente puede
				cambiar de cliente, se avisa. Se mira ANTES del commit, que es el que lo borra.
			*/
			let pierde_canje_de_puntos = this.en_edicion_vender() && Number(this.$store.state.vender.descuento_puntos) > 0

			// En edición (presupuesto o venta existente) se conserva la lista de precios que
			// ya tiene el comprobante: NO se llama a setPriceType(). Si el negocio usa listas y
			// el cliente elegido trae otra distinta, se avisa que se mantiene la original.
			if (this.en_edicion_vender()) {
				this.avisar_si_cambia_lista_de_precios(client)
				this.$store.commit('vender/setClient', client)
			} else {
				this.$store.commit('vender/setClient', client)
				this.setPriceType()
			}

			if (pierde_canje_de_puntos) {
				this.$toast.warning('Se quitó el canje de puntos: los puntos eran del cliente anterior y el total vuelve a subir. Si el cliente nuevo tiene puntos, podés canjearlos de nuevo.', {
					duration: 10000,
				})
			}

			if (sigue_de_contado) {
				this.$toast.info('La venta sigue siendo de contado: el cliente queda asociado, pero la venta no pasa a su cuenta corriente.', {
					duration: 8000,
				})
			}

			// Descuentos y recargos vinculados al cliente. Acá y no en `vender/setClient`: ver el
			// porqué en mixins/vender/ajustes_del_cliente.js (en edición no hace nada).
			this.aplicar_ajustes_del_cliente(client)

			this.set_afip_tipo_comprobante()
		},
		/**
		 * Elige para la venta el cliente que el modal de ARCA encontró ya cargado ("Usar cliente
		 * para la venta").
		 *
		 * 🔴 Pasa por setSelected() a propósito, con la misma forma que le manda el buscador
		 * (`{ model }`): setSelected() es la única puerta para elegir el cliente de la venta desde
		 * la interfaz de Vender. Ahí viven la caja, el tipo de comprobante y la rama de edición que
		 * conserva la lista de precios; cuando el modal elegía por su cuenta se los salteaba
		 * (misión cliente-desde-arca-en-vender, 4/10/2026).
		 *
		 * @param {Object} client Cliente que devolvió la consulta a ARCA.
		 * @returns {void}
		 */
		usar_cliente_de_arca(client) {
			this.setSelected({ model: client })
			// Que termine con el foco en el campo, como una seleccion normal. Ver el metodo.
			this.enfocar_buscador_al_cerrar_modal_de_arca()
		},
		/**
		 * Deja el foco en el input del buscador de cliente (`#select_client_vender`) cuando el
		 * modal de ARCA (`afip-data-modal`) termina de cerrarse.
		 *
		 * Por que hace falta: una seleccion normal cierra el modal de busqueda y bootstrap-vue le
		 * devuelve el foco a ese input. Por "Usar cliente para la venta" el que se cierra es el
		 * modal de ARCA, y bootstrap-vue le devuelve el foco a lo que lo tenia al abrirse: el input
		 * del modal de busqueda, que onRequestClientAfipLookup() ya oculto. El foco no va a ningun
		 * lado y queda en BODY (medido con Playwright el 4/10/2026): un cajero con teclado se
		 * queda sin foco.
		 *
		 * Es el mismo mecanismo que search/Index.vue::enfocar_input_al_cerrar_el_formulario() para
		 * el alta, escrito aca y no reusado a proposito: aquel filtra por el id del `<model>` de su
		 * buscador, y parametrizarlo para este modal acoplaria el buscador generico con un modal
		 * propio de Vender.
		 *
		 * 🔴 Por que esperar al `hidden` y no enfocar ya: mientras el b-modal esta visible,
		 * bootstrap-vue fuerza el foco adentro de el (enforce focus). Y adentro del handler se
		 * enfoca en un $nextTick: bootstrap-vue devuelve su foco tambien en un $nextTick que agenda
		 * ANTES de emitir el `hidden` (modal.js, onAfterLeave), asi que el nuestro queda ultimo.
		 *
		 * El tope de 5 s es para que el listener de $root no quede colgado si el `hidden` nunca
		 * llega. El beforeDestroy cubre el tercer caso.
		 *
		 * @returns {void}
		 */
		enfocar_buscador_al_cerrar_modal_de_arca() {
			let self = this

			// Una espera nueva desarma la anterior antes de armarse.
			this.cancelar_foco_pendiente_tras_arca()

			let handler = function(bv_event, modal_id) {
				if (modal_id !== 'afip-data-modal') {
					return
				}
				self.cancelar_foco_pendiente_tras_arca()
				self.$nextTick(function() {
					// Con guarda: el buscador va con v-if (puede_cambiar_cliente).
					let input = document.getElementById('select_client_vender')
					if (input) {
						input.focus()
					}
				})
			}

			let tope = setTimeout(function() {
				self.cancelar_foco_pendiente_tras_arca()
			}, 5000)

			this.$root.$on('bv::modal::hidden', handler)
			this.foco_pendiente_tras_arca = {
				handler: handler,
				tope: tope,
			}
		},
		/**
		 * Desarma la espera de enfocar_buscador_al_cerrar_modal_de_arca(), si hay una: saca el
		 * listener de $root y corta el tope. Se puede llamar de mas sin efecto.
		 *
		 * @returns {void}
		 */
		cancelar_foco_pendiente_tras_arca() {
			if (!this.foco_pendiente_tras_arca) {
				return
			}
			this.$root.$off('bv::modal::hidden', this.foco_pendiente_tras_arca.handler)
			clearTimeout(this.foco_pendiente_tras_arca.tope)
			this.foco_pendiente_tras_arca = null
		},
		// Devuelve true si se está editando un comprobante ya guardado (presupuesto o venta previa),
		// false si es una venta nueva en curso.
		en_edicion_vender() {
			return !!this.budget || this.editando_venta_previa
		},
		// Si el negocio usa listas de precios y el cliente elegido tiene asignada una lista distinta
		// a la que ya tiene el comprobante, avisa que se mantiene la lista original (los precios no cambian).
		avisar_si_cambia_lista_de_precios(client) {
			if (!this.owner || !this.owner.listas_de_precio) {
				return
			}
			// Lista de precios del cliente elegido (si tiene)
			let lista_cliente = client ? client.price_type : null
			if (!lista_cliente) {
				return
			}
			// Lista de precios que ya tiene el comprobante actual
			let lista_actual = this.$store.state.vender.price_type
			// Compara si la lista del cliente elegido difiere de la que ya tiene el comprobante
			let cambia = !lista_actual || lista_actual.id != lista_cliente.id
			if (cambia) {
				let nombre_actual = lista_actual ? lista_actual.name : 'la que ya tenía'
				this.$toast.info(
					'El cliente seleccionado tiene la lista de precios "' + lista_cliente.name + '", pero se mantiene la lista "' + nombre_actual + '" del comprobante. Los precios no cambian.',
					{ duration: 8000 }
				)
			}
		},
		clearSelected() {
			/*
				🔴 CAMBIAR SI, SACAR NO. A una venta guardada a cuenta corriente (con cliente y no
				omitida, tenga o no el debito todavia) se le puede cambiar el cliente (ver
				puede_cambiar_cliente), pero no sacarselo. Sacarlo la pasaria a contado por un camino
				que hasta esta mision no existia en la pantalla (el buscador estaba escondido):
				habilitar_metodo_de_pago() de abajo le pone efectivo, y en un comercio con cajas la
				venta quedaria cobrada sin movimiento de caja, porque el update() de la API nunca llama
				a check_caja. Se rechaza y el cliente que estaba elegido sigue puesto (el store no se
				toca; el buscador se recrea para volver a mostrarlo, ver el template).

				El aviso no dice que la venta "va a la cuenta corriente" HOY: una venta para checkear
				todavia no esta. Dice lo que es cierto en todos los casos, que no es de contado.
			*/
			if (this.venta_previa_a_cuenta_corriente) {
				this.$toast.error('La venta es a cuenta corriente del cliente, no de contado: podés cambiar el cliente por otro, pero no sacarlo. Para pasarla a contado, eliminala y volvé a cargarla.', {
					duration: 8000,
				})
				this.buscador_cliente_key++
				return
			}

			/*
				Venta guardada de CONTADO a la que en esta edicion se le puso un cliente (setSelected la
				dejo omitida): sacarselo la deja COMO ESTABA, sin cliente y sin omitir. A proposito no
				pasa por el camino de abajo: setPriceType(true) le cambiaria la lista de precios que
				tenia guardada y habilitar_metodo_de_pago() le pisaria el metodo de pago con el que se
				cobro. Lo unico que se recalcula es el tipo de comprobante, que set_afip_tipo_comprobante
				habia ajustado al cliente.
			*/
			if (this.venta_previa_de_contado_sin_cliente) {
				this.$store.commit('vender/setClient', null)
				this.$store.commit('vender/set_send_mail', 0)
				this.$store.commit('vender/set_omitir_en_cuenta_corriente', 0)
				this.set_afip_tipo_comprobante()
				return
			}

			this.$store.commit('vender/setClient', null)
			this.$store.commit('vender/set_send_mail', 0)
			/*
				force_reset en true: sacar el cliente a mano es una accion explicita del usuario,
				no un default del comercio, asi que recalcular la lista de precios corresponde
				tambien cuando se esta editando un comprobante guardado.
			*/
			this.setPriceType(true)
			this.habilitar_metodo_de_pago()
			// Apaga los descuentos y recargos que había prendido solo el cliente que se sacó.
			this.aplicar_ajustes_del_cliente(null)
			this.set_afip_tipo_comprobante()
		},
	}
}
</script>
<style lang="sass">
.cont-client
	display: flex
	flex-direction: row
	justify-content: space-between
	align-items: flex-start
	margin-bottom: 15px
	& > div
		margin-bottom: 0 !important
		width: 80%

.selected-client
	font-size: 20px
	font-weight: bold
</style>
