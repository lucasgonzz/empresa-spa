<template>
	<div>
		<b-button
		v-if="has_sale_log"
		class="m-l-5"
		@click.stop="show_sale_log"
		variant="outline-secondary"
		size="sm">
			Log
		</b-button>

		<b-modal
		:id="modal_id"
		title="Log de auditoría"
		hide-footer
		size="xl">
			<div
			v-if="parsed_log.length"
			class="sale-log-container">
				<div
				v-for="(entry, index) in parsed_log"
				:key="index"
				class="sale-log-entry m-b-10 p-10 b-r-1">
					<p class="m-b-5">
						<strong>{{ entry.created_at || '-' }}</strong>
						- {{ entry.event_key || 'event_without_key' }}
					</p>
					<p class="m-b-5">
						Origen: {{ entry.source_component || '-' }}
					</p>
					<pre class="m-b-0">{{ format_entry(entry) }}</pre>
				</div>
			</div>
			<p
			v-else
			class="m-b-0">
				Esta venta no tiene auditoría disponible.
			</p>
		</b-modal>
	</div>
</template>
<script>
export default {
	props: {
		// Venta de la fila actual del listado de ventas.
		sale: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * ID único de modal por venta para evitar colisiones entre filas.
		 */
		modal_id() {
			return `sale-log-${this.sale.id}`
		},
		/**
		 * Determina si la venta tiene información de log cargada.
		 */
		has_sale_log() {
			if (!this.sale || !this.sale.log) {
				return false
			}
			if (Array.isArray(this.sale.log)) {
				return this.sale.log.length > 0
			}
			if (typeof this.sale.log === 'string') {
				return this.sale.log.trim() !== ''
			}
			return true
		},
		/**
		 * Normaliza el log para consumirlo siempre como array en la UI.
		 */
		parsed_log() {
			// Si ya llega como array casteado por backend, se usa directamente.
			if (Array.isArray(this.sale.log)) {
				return this.sale.log
			}

			// Si llega como string JSON, se intenta parsear.
			if (typeof this.sale.log === 'string') {
				try {
					const parsed_value = JSON.parse(this.sale.log)
					if (Array.isArray(parsed_value)) {
						return parsed_value
					}
				} catch (error) {
					console.error('SaleLogBtn: no se pudo parsear sale.log', error)
				}
			}

			return []
		},
	},
	methods: {
		/**
		 * Abre el modal de auditoría de la venta seleccionada.
		 */
		show_sale_log() {
			this.$bvModal.show(this.modal_id)
		},
		/**
		 * Prepara una versión legible de la entrada para revisión humana.
		 */
		format_entry(entry) {
			return JSON.stringify(entry, null, 2)
		},
	},
}
</script>
<style scoped>
.sale-log-container {
	max-height: 60vh;
	overflow-y: auto;
}

.sale-log-entry {
	border: 1px solid #e5e5e5;
	background: #fafafa;
}
</style>
