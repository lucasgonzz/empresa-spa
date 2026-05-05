<template>
	<b-dropdown-item
	v-if="hasExtencion('enviar_mail_a_clientes')"
	@click.prevent="on_click">
		<i class="icon-message"></i>
		Enviar correo a clientes (selección)
	</b-dropdown-item>
</template>

<script>
/**
 * Opción del menú "Selección" de ventas: encola el mismo correo que ComercioCityMailHelper::new_sale
 * para cada venta marcada, tras confirmación (las que no califiquen se reportan en failures).
 */
export default {
	data() {
		/** Evita doble envío si el usuario vuelve a abrir el menú rápido. */
		return {
			enviando: false,
		}
	},
	computed: {
		/** Filas con checkbox de selección múltiple (ask_selectable en view-component). */
		selected_sales() {
			return this.$store.state.sale.selected
		},
	},
	methods: {
		/**
		 * Valida selección, confirma y llama al bulk en API.
		 *
		 * @returns {void}
		 */
		on_click() {
			var self = this
			var sales = self.selected_sales

			if (!sales || sales.length === 0) {
				self.$toast.warning('No hay ventas seleccionadas.')
				return
			}

			if (self.enviando) {
				return
			}

			var n = sales.length
			var msg = '¿Confirma enviar el correo de notificación de venta para ' + n + ' venta(s) seleccionada(s)? '
				+ 'Las que no tengan cliente con correo válido se omitirán y se indicará en el resumen.'

			if (!confirm(msg)) {
				return
			}

			var sale_ids = []
			sales.forEach(function (s) {
				sale_ids.push(s.id)
			})

			self.enviando = true
			self.$api.post('sale/send-client-mail-bulk', {
				sale_ids: sale_ids,
			})
				.then(function (res) {
					self.enviando = false
					var models = res.data.models || []
					var failures = res.data.failures || []

					models.forEach(function (model) {
						self.$store.commit('sale/add', model)
					})

					if (failures.length === 0) {
						self.$toast.success(
							'Se encolaron los correos para ' + models.length + ' venta(s).'
						)
						return
					}

					if (models.length === 0) {
						self.$toast.error(
							'No se pudo encolar ningún correo. Revisá cliente y email en cada venta.'
						)
						console.log('send-client-mail-bulk failures', failures)
						return
					}

					self.$toast.warning(
						'Correos encolados: ' + models.length + '. Omitidas: ' + failures.length + '.'
					)
					console.log('send-client-mail-bulk failures', failures)
				})
				.catch(function (err) {
					self.enviando = false
					var data = err.response && err.response.data
					var m = data && data.message ? data.message : 'Error al enviar correos'
					self.$toast.error(m)
					console.log(err)
				})
		},
	},
}
</script>
