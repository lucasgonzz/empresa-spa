<template>
<div>
	<b-input-group
	class="cont-payment-methods"
	prepend="Mét. pago">
		
		<b-form-select
		ref="payment_method_select"
		:disabled="disabled"
		id="vender_payment_method_id"
		v-model="current_acount_payment_method_id"
		:select-size="payment_method_select_expanded ? expanded_select_size : 0"
		:class="{ 'cont-payment-methods__select--expanded': payment_method_select_expanded }"
		@change="on_payment_method_change"
		@blur="on_payment_method_blur"
		@keydown.native="on_payment_method_keydown"
		:options="options">
		</b-form-select>

		<template #append>

			<!-- Boton para metodoS de pago -->
			<b-button
			:disabled="disabled" 
			variant="success"
			id="btn_set_payment_methods"
			@click="set_payment_methods">
				<b-badge
				variant="primary"
				v-if="selected_payment_methods.length">
					{{ selected_payment_methods.length }}
				</b-badge>
				<i 
				v-else
				class="icon-plus"></i>
			</b-button>


			<!-- <total-info></total-info> -->

		</template>
		
	</b-input-group>

	<!--
		Prompt 266 (Fase 2, Capa 3): con el flag `precio_base_incluye_tarjeta` activo, el precio
		mostrado en el carrito ya es el de etiqueta (incluye la tarjeta mas cara). Al elegir un
		metodo de pago, se muestra el precio final equivalente para ese metodo y su descuento
		respecto de la etiqueta (dato que ya resuelve la API, ver ArticlePricesHelper).
		Con el flag inactivo, o sin reglas configuradas, este bloque no se muestra y nada cambia.
	-->
	<p
	v-if="precio_metodo_pago_seleccionado"
	class="precio-metodo-pago-seleccionado m-t-5">
		Precio con este metodo: <strong>{{ price(precio_metodo_pago_seleccionado.price) }}</strong>
		<span v-if="precio_metodo_pago_seleccionado.discount_percentage_vs_etiqueta > 0">
			(-{{ precio_metodo_pago_seleccionado.discount_percentage_vs_etiqueta }}%)
		</span>
		<span v-else-if="precio_metodo_pago_seleccionado.discount_percentage_vs_etiqueta < 0">
			(+{{ precio_metodo_pago_seleccionado.discount_percentage_vs_etiqueta * -1 }}%)
		</span>
	</p>

	<cuotas></cuotas>
</div>

</template>
<script>
// import vender from '@/mixins/vender'
import select_payment_methods from '@/mixins/vender/select_payment_methods'
export default {
	mixins: [select_payment_methods],
	components: {
		TotalInfo: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/total-info/Index'),
		Cuotas: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/Cuotas'),
	},
	data() {
		return {
			/* Muestra el select como listbox con todas las opciones (atajo de teclado) */
			payment_method_select_expanded: false,

			/* Buffer temporal para tipear números de dos dígitos (p. ej. 10, 11) */
			payment_method_number_buffer: '',

			/* Timeout que reinicia el buffer de dígitos */
			payment_method_number_buffer_timeout: null,
		}
	},
	mounted() {
		/* Atajo de teclado y chips de resumen piden foco en este select */
		this.$root.$on('vender:focus-payment-method', this.focus_payment_method_select)
	},
	beforeDestroy() {
		this.$root.$off('vender:focus-payment-method', this.focus_payment_method_select)

		if (this.payment_method_number_buffer_timeout) {
			clearTimeout(this.payment_method_number_buffer_timeout)
		}
	},
	computed: {
		current_acount_payment_method_id: {
			get(){
				return this.$store.state.vender.current_acount_payment_method_id
			},
			set(value) {
				this.$store.commit('vender/setCurrentAcountPaymentMethodId', value)
			},
		},
		options() {
			let options = [{
				text: 'Seleccione metodo de pago',
				value: 0,
			}]

			this.$store.state.current_acount_payment_method.models.forEach((pay, index) => {
				/* Número ascendente visible para elegir con teclado (1, 2, 3...) */
				let text = (index + 1) + ' - ' + pay.name

				let discount = this.$store.state.current_acount_payment_method_discount.models.find(dis => dis.current_acount_payment_method_id == pay.id)

				if (typeof discount != 'undefined') {

					if (Number(discount.discount_percentage) > 0) {
						text += ' (-'+discount.discount_percentage+'%)'
					} else {
						text += ' (+'+Number(discount.discount_percentage)*-1+'%)'
					}
				}
				options.push({
					text: text,
					value: pay.id
				})
			})

			return options
		},
		disabled() {
			if (
				this.client 
				&& (
					!this.omitir_en_cuenta_corriente
					|| this.budget
				)
			) {
				return true 
			}
			return false
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
		budget() {
			return this.$store.state.vender.budget
		},
		payment_methods_seteados() {

			let seteados = false 

			this.selected_payment_methods.forEach(payment_method => {

				if (payment_method.amount) {

					seteados = true 
				}
			})

			return seteados
		},

		/**
		 * Cantidad de filas visibles cuando el select está expandido por atajo.
		 *
		 * @returns {number}
		 */
		expanded_select_size() {
			return Math.max(this.options.length, 2)
		},

		/**
		 * Prompt 266 (Fase 2, Capa 3): total actual de la venta (el que ya calcula setTotal()).
		 */
		vender_total() {
			return this.$store.state.vender.total
		},

		/**
		 * Prompt 266 (Fase 2, Capa 3): desglose de precios por metodo de pago que devuelve la API
		 * (ArticlePricesHelper::calcular_precios_por_metodo_pago_con_tarjeta_incluida), tomado del
		 * primer articulo del carrito que lo tenga. El porcentaje de descuento/recargo vs etiqueta
		 * es el mismo para cualquier articulo (depende de las reglas del negocio, no del precio),
		 * asi que alcanza con tomar el de un solo item para aplicarlo sobre el total de la venta.
		 * Es null si el flag `precio_base_incluye_tarjeta` esta apagado o no hay reglas configuradas.
		 */
		precios_por_metodo_pago() {
			let item_con_precios = this.$store.state.vender.items.find(item => item.precios_por_metodo_pago)
			return item_con_precios ? item_con_precios.precios_por_metodo_pago : null
		},

		/**
		 * Prompt 266 (Fase 2, Capa 3): precio final de la venta y descuento vs etiqueta para el
		 * metodo de pago actualmente seleccionado. Null si el flag esta apagado, no hay reglas
		 * configuradas o todavia no se eligio un metodo de pago.
		 */
		precio_metodo_pago_seleccionado() {
			if (
				!this.owner
				|| !this.owner.precio_base_incluye_tarjeta
				|| !this.precios_por_metodo_pago
				|| !this.current_acount_payment_method_id
			) {
				return null
			}

			let metodo = this.precios_por_metodo_pago.precios_por_metodo.find(m => {
				return m.current_acount_payment_method_id == this.current_acount_payment_method_id
			})

			if (!metodo) {
				return null
			}

			// Se recalcula el precio final sobre el TOTAL de la venta (no sobre el precio unitario
			// del articulo) usando el mismo porcentaje que ya resolvio la API para ese metodo.
			let precio_final = this.vender_total * (1 - (metodo.discount_percentage_vs_etiqueta / 100))

			return {
				price: precio_final,
				discount_percentage_vs_etiqueta: metodo.discount_percentage_vs_etiqueta,
			}
		},
	},
	methods: {
		/**
		 * Devuelve el elemento DOM del select de método de pago.
		 *
		 * @returns {HTMLSelectElement|null}
		 */
		get_payment_method_select_element() {
			if (this.$refs.payment_method_select && this.$refs.payment_method_select.$el) {
				return this.$refs.payment_method_select.$el
			}

			return document.getElementById('vender_payment_method_id')
		},

		/**
		 * Enfoca el select y lo expande como listbox (select-size).
		 * Los select nativos no abren el desplegable con click programático desde un atajo.
		 *
		 * @param {number} retry_count
		 */
		focus_payment_method_select(retry_count) {
			if (this.disabled) {
				return
			}

			let attempts = retry_count || 0

			this.payment_method_select_expanded = true

			this.$nextTick(() => {
				this.$nextTick(() => {
					const select = this.get_payment_method_select_element()

					if (!select) {
						if (attempts < 8) {
							const self = this

							setTimeout(function () {
								self.focus_payment_method_select(attempts + 1)
							}, 80)
						} else {
							this.payment_method_select_expanded = false
						}

						return
					}

					select.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
					select.focus()
				})
			})
		},

		/**
		 * Vuelve al modo desplegable normal del select.
		 */
		collapse_payment_method_select() {
			this.payment_method_select_expanded = false
		},

		/**
		 * Al perder foco, colapsar el listbox (con leve delay para no cortar el change).
		 */
		on_payment_method_blur() {
			const self = this

			setTimeout(function () {
				self.collapse_payment_method_select()
			}, 150)
		},

		/**
		 * Maneja el cambio manual o por teclado numérico del método de pago.
		 */
		on_payment_method_change() {
			this.collapse_payment_method_select()
			this.set_payment_methods_null()
		},

		/**
		 * Lista de métodos de pago disponibles (sin el placeholder).
		 *
		 * @returns {Array}
		 */
		get_payment_method_models() {
			return this.$store.state.current_acount_payment_method.models || []
		},

		/**
		 * Selecciona un método de pago por índice (0-based) y aplica la misma lógica que @change.
		 *
		 * @param {number} index
		 */
		select_payment_method_by_index(index) {
			const methods = this.get_payment_method_models()
			const payment_method = methods[index]

			if (!payment_method) {
				return
			}

			this.$store.commit('vender/setCurrentAcountPaymentMethodId', payment_method.id)
			this.set_payment_methods_null()
			this.collapse_payment_method_select()
		},

		/**
		 * Reinicia el buffer numérico usado para métodos con índice de dos dígitos.
		 */
		reset_payment_method_number_buffer() {
			this.payment_method_number_buffer = ''

			if (this.payment_method_number_buffer_timeout) {
				clearTimeout(this.payment_method_number_buffer_timeout)
				this.payment_method_number_buffer_timeout = null
			}
		},

		/**
		 * Permite tipear el número del método (1, 2, ... 10, 11) con el select enfocado.
		 *
		 * @param {KeyboardEvent} event
		 */
		on_payment_method_keydown(event) {
			if (this.disabled) {
				return
			}

			const key = event.key

			if (!/^[0-9]$/.test(key)) {
				return
			}

			const methods = this.get_payment_method_models()

			if (!methods.length) {
				return
			}

			event.preventDefault()

			if (this.payment_method_number_buffer_timeout) {
				clearTimeout(this.payment_method_number_buffer_timeout)
			}

			this.payment_method_number_buffer += key

			const selected_number = parseInt(this.payment_method_number_buffer, 10)

			if (selected_number >= 1 && selected_number <= methods.length) {
				this.select_payment_method_by_index(selected_number - 1)
				this.reset_payment_method_number_buffer()
				return
			}

			/* Si el buffer ya no puede formar un índice válido, conservar solo el último dígito */
			if (this.payment_method_number_buffer.length >= 2) {
				this.payment_method_number_buffer = key
			}

			const self = this

			this.payment_method_number_buffer_timeout = setTimeout(function () {
				self.reset_payment_method_number_buffer()
			}, 800)
		},

		set_payment_methods() {

			if (this.sobrante_a_repartir != 0) {

				this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0)

				this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])

				this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_payment_methods', [])

				this.$store.commit('vender/setSelectedPaymentMethods', [])

				this.$store.commit('vender/set_caja_id', 0)

				this.limpiar_cuotas()

				// this.init_modal_payment_metohds()
				
				this.setTotal()
			} 

			
			this.$bvModal.show('payment-method-modal')
		},
		set_payment_methods_null() {
			this.$store.commit('vender/setSelectedPaymentMethods', [])
			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])

			this.limpiar_cuotas()

			this.setTotal()
		},
		limpiar_cuotas() {

			this.$store.commit('vender/set_cuota_id', 0)
			this.$store.commit('vender/set_monto_credito', 0)
			this.$store.commit('vender/set_cantidad_cuotas', 0)

			this.$store.commit('vender/set_cuota_descuento', null)
			this.$store.commit('vender/set_cuota_recargo', null)
			this.$store.commit('vender/set_cuota_monto_descuento', null)
			this.$store.commit('vender/set_cuota_monto_recargo', null)
		},

	}
}
</script>
<style lang="sass">
.cont-payment-methods

	/* Listbox expandido por atajo: limitar alto y permitir scroll interno */
	&__select--expanded
		max-height: 220px

	.input-group-append

		button
			border-radius: 0 5px 5px 0 !important

/* Prompt 266 (Fase 2, Capa 3): precio equivalente del metodo de pago elegido cuando el flag precio_base_incluye_tarjeta esta activo */
.precio-metodo-pago-seleccionado
	margin-bottom: 0
	font-size: 0.9em
</style>