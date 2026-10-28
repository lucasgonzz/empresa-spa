<template>
	<view-component
	v-if="view == 'pedidos'"
	change_from_dates_option
	:show_btn_delete="false"
	:show_btn_create="false"
	model_name="meli_order">

		<template #table_left_options="data">
			<p
			class="m-b-0"
			v-if="data.model.sale">
				Venta N° {{ data.model.sale.num }}
			</p>
			<!-- Un pedido cancelado en Mercado Libre no lleva venta: antes el botón aparecía igual y la creaba, con el stock descontado (misión mercado-libre-pruebas) -->
			<p
			class="m-b-0 text-muted"
			v-else-if="meli_order_sin_venta_posible(data.model)">
				Sin venta: {{ meli_order_estado_texto(data.model).toLowerCase() }}
			</p>
			<b-button
			@click.stop="crear_venta(data.model)"
			size="sm"
			variant="success"
			v-else>
				Crear venta
			</b-button>
		</template>
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	mounted() {
		// Estados internos (pendiente / confirmado) para selects del formulario de pedido ML.
		this.$store.dispatch('meli_order_status/getModels')
	},
	methods: {
		/**
		 * "Crear venta" de un pedido de Mercado Libre.
		 *
		 * Misión mercado-libre-integracion (27/10/2026): la fila puede estar vieja. Desde que los
		 * pedidos pagos generan la venta solos (consulta cada 5 minutos), un pedido que se ve sin
		 * venta puede tenerla ya. Por eso, antes de crear, se trae el pedido actualizado
		 * (`GET meli-order/{id}`, que viene con su `sale`): si ya tenía venta, se actualiza la fila
		 * y se avisa, sin pedir otra.
		 *
		 * @param {Object} meli_order Pedido de la fila.
		 * @returns {void}
		 */
		crear_venta(meli_order) {
			if (!confirm('¿Seguro que quiere crear una venta en base a este pedido de Mercado Libre?')) {
				return
			}

			this.$store.commit('auth/setMessage', 'Revisando el pedido')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('meli-order/' + meli_order.id, {
				skip_global_error_event: true,
			})
			.then(res => {
				let actual = res.data.model
				if (actual && actual.sale) {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					this.$store.commit('meli_order/add', actual)
					this.$toast.info('Este pedido ya tenía venta')
					return
				}
				// Se canceló en Mercado Libre mientras la fila estaba abierta: se actualiza la fila (deja de ofrecer el botón) y no se pide la venta
				if (actual && this.meli_order_sin_venta_posible(actual)) {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
					this.$store.commit('meli_order/add', actual)
					this.$toast.info('Este pedido ya no admite venta: en Mercado Libre figura ' + this.meli_order_estado_texto(actual).toLowerCase())
					return
				}
				this.mandar_crear_venta(meli_order)
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error(this.mensaje_de_error(err, 'No se pudo revisar el pedido de Mercado Libre'))
			})
		},

		/**
		 * `POST meli-order/create-sale/{id}` y actualiza la fila con el pedido que devuelve la API.
		 *
		 * La API devuelve el pedido con su venta; si ya la tenía (por ejemplo, la creó la consulta
		 * automática entre la revisión y este pedido) no crea otra. Si la respuesta trae
		 * `ya_tenia_venta: true`, se avisa con el mismo texto que en la revisión previa.
		 *
		 * @param {Object} meli_order Pedido de la fila.
		 * @returns {void}
		 */
		mandar_crear_venta(meli_order) {
			this.$store.commit('auth/setMessage', 'Creando venta')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('meli-order/create-sale/' + meli_order.id, null, {
				skip_global_error_event: true,
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				if (res.data.model) {
					this.$store.commit('meli_order/add', res.data.model)
				}
				if (res.data.ya_tenia_venta) {
					this.$toast.info('Este pedido ya tenía venta')
				} else {
					this.$toast.success('Venta creada')
				}
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error(this.mensaje_de_error(err, 'No se pudo crear la venta del pedido'))
			})
		},

		/**
		 * Texto legible de un error de la API: su `message` o uno genérico.
		 *
		 * @param {Object} err Error de axios.
		 * @param {String} generico
		 * @returns {String}
		 */
		mensaje_de_error(err, generico) {
			if (err && err.response && err.response.data && err.response.data.message) {
				return err.response.data.message
			}
			return generico
		},
	}
}
</script>
