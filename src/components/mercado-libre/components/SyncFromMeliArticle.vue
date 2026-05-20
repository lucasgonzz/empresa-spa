<template>
	<view-component
	v-if="view == 'sinc-articulo-entrantes'"
	change_from_dates_option
	model_name="sync_from_meli_article">

		<template #header>
			<b-alert show variant="info" class="m-b-15">
				<p class="m-b-5">
					<strong>Importar desde Mercado Libre</strong>
				</p>
				<p class="m-b-0">
					Obtiene todas tus publicaciones activas en Mercado Libre. Si el artículo ya existe en el sistema
					(enlazado por ID de ML), no se modifica. Si no existe, se crea y queda vinculado automáticamente.
				</p>
			</b-alert>
		</template>

		<!-- <template #horizontal_nav_btn_create>
			<b-button
			variant="primary"
			class="m-l-10"
			:disabled="sync_running"
			@click="run_sync">
				<b-spinner small v-if="sync_running" class="m-r-5"></b-spinner>
				<i v-else class="icon-refresh m-r-5"></i>
				Importar artículos desde Mercado Libre
			</b-button>
		</template> -->

	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	data() {
		return {
			/** Id de la corrida en curso (polling) */
			active_sync_id: null,
			/** Timer de polling */
			poll_timer: null,
			/** Evita doble click mientras corre */
			sync_running: false,
		}
	},
	computed: {
		view() {
			return this.$route.params.view
		},
	},
	beforeDestroy() {
		this.stop_polling()
	},
	methods: {
		/**
		 * Inicia importación vía API y hace polling hasta estado final.
		 */
		run_sync() {
			var self = this
			if (self.sync_running) {
				return
			}
			self.sync_running = true
			self.$store.dispatch('sync_from_meli_article/run_sync')
				.then(function (model) {
					self.active_sync_id = model.id
					self.$toast.success('Importación iniciada. Podés seguir el progreso en el listado.')
					self.start_polling()
				})
				.catch(function (err) {
					self.sync_running = false
					var message = 'No se pudo iniciar la importación.'
					if (
						err.response
						&& err.response.data
						&& err.response.data.message
					) {
						message = err.response.data.message
					}
					self.$toast.error(message)
				})
		},
		/**
		 * Consulta periódicamente el estado de la corrida activa.
		 */
		start_polling() {
			var self = this
			self.stop_polling()
			self.poll_timer = setInterval(function () {
				self.poll_active_sync()
			}, 4000)
			self.poll_active_sync()
		},
		/**
		 * Una iteración de polling: actualiza store y corta si terminó.
		 */
		poll_active_sync() {
			var self = this
			if (!self.active_sync_id) {
				return
			}
			self.$store.dispatch('sync_from_meli_article/fetch_sync_by_id', self.active_sync_id)
				.then(function (model) {
					if (
						model.status === 'exitosa'
						|| model.status === 'error'
					) {
						self.stop_polling()
						self.sync_running = false
						self.active_sync_id = null
						if (model.status === 'exitosa') {
							self.$toast.success(model.summary_message || 'Importación finalizada.')
						} else {
							self.$toast.error(model.error_message || 'La importación finalizó con error.')
						}
					}
				})
				.catch(function () {
					self.stop_polling()
					self.sync_running = false
				})
		},
		/**
		 * Detiene el intervalo de polling.
		 */
		stop_polling() {
			if (this.poll_timer) {
				clearInterval(this.poll_timer)
				this.poll_timer = null
			}
		},
	},
}
</script>
