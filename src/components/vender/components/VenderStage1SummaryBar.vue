<template>
	<!--
		Barra de resumen de Etapa 1 (Configuración inicial).
		Muestra chips con los valores seleccionados: sucursal, método de pago, lista de precios, cliente.
		Cada chip tiene un ícono de lápiz que expande la Etapa 1 con foco en el campo correspondiente.
	-->
	<div
	v-if="has_any_data"
	class="vender-summary-bar vender-full-bleed">

		<!-- Chip: Sucursal -->
		<div
		v-if="selected_address"
		class="vender-summary-bar__chip">
			<i class="icon-clipboard vender-summary-bar__chip-icon"></i>
			<span class="vender-summary-bar__chip-text">{{ selected_address.street }}</span>
			<button
			class="vender-summary-bar__chip-edit"
			title="Editar sucursal"
			@click="expandStage1('address')">
				<i class="icon-edit"></i>
			</button>
		</div>

		<!-- Chip: Método de pago -->
		<div
		v-if="selected_payment_method"
		class="vender-summary-bar__chip">
			<i class="icon-dolar vender-summary-bar__chip-icon"></i>
			<span class="vender-summary-bar__chip-text">{{ selected_payment_method.name }}</span>
			<button
			class="vender-summary-bar__chip-edit"
			title="Editar método de pago"
			@click="expandStage1('payment_method')">
				<i class="icon-edit"></i>
			</button>
		</div>

		<!-- Chip: Lista de precios -->
		<div
		v-if="price_type_vender"
		class="vender-summary-bar__chip">
			<i class="icon-list vender-summary-bar__chip-icon"></i>
			<span class="vender-summary-bar__chip-text">{{ price_type_vender.name }}</span>
			<button
			class="vender-summary-bar__chip-edit"
			title="Editar lista de precios"
			@click="expandStage1('price_type')">
				<i class="icon-edit"></i>
			</button>
		</div>

		<!-- Chip: Cliente (solo si hay uno seleccionado) -->
		<div
		v-if="client"
		class="vender-summary-bar__chip vender-summary-bar__chip--client">
			<i class="icon-user vender-summary-bar__chip-icon"></i>
			<span class="vender-summary-bar__chip-text">{{ client.name }}</span>
			<button
			class="vender-summary-bar__chip-edit"
			title="Editar cliente"
			@click="expandStage1('client')">
				<i class="icon-edit"></i>
			</button>
		</div>

	</div>
</template>

<script>
export default {
	name: 'VenderStage1SummaryBar',
	computed: {
		/**
		 * Sucursal (address) actualmente seleccionada en la venta.
		 * Se obtiene del store cruzando el address_id con los modelos de address.
		 *
		 * @returns {Object|null}
		 */
		selected_address() {
			const address_id = this.$store.state.vender.address_id
			if (!address_id) return null
			const addresses = this.$store.state.address.models
			return addresses.find(a => a.id == address_id) || null
		},

		/**
		 * Método de pago principal seleccionado para la venta.
		 *
		 * @returns {Object|null}
		 */
		selected_payment_method() {
			const pm_id = this.$store.state.vender.payment_method_id
			if (!pm_id) return null
			const methods = this.$store.state.payment_method.models
			return methods.find(m => m.id == pm_id) || null
		},

		/**
		 * Lista de precios (price_type) activa en la venta.
		 *
		 * @returns {Object|null}
		 */
		price_type_vender() {
			return this.$store.state.vender.price_type
		},

		/**
		 * Cliente seleccionado para la venta.
		 *
		 * @returns {Object|null}
		 */
		client() {
			return this.$store.state.vender.client
		},

		/**
		 * Indica si hay al menos un dato de configuración para mostrar la barra.
		 * Si todo está vacío, la barra no se muestra.
		 *
		 * @returns {boolean}
		 */
		has_any_data() {
			return !!(
				this.selected_address
				|| this.selected_payment_method
				|| this.price_type_vender
				|| this.client
			)
		},
	},
	methods: {
		/**
		 * Emite el evento para expandir la Etapa 1 con foco en el campo indicado.
		 * VenderStage1 escucha este evento para abrir la etapa y hacer scroll al campo.
		 *
		 * @param {string} field - Nombre del campo a enfocar ('address', 'payment_method', 'price_type', 'client')
		 */
		expandStage1(field) {
			this.$root.$emit('vender:expand-stage1', field)
		},
	},
}
</script>

<style scoped lang="sass">
/* Barra de chips de resumen de Etapa 1 */
.vender-summary-bar
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 6px
	padding: 5px 15px
	background: var(--bg-section, #f8f9fa)
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)
	flex-shrink: 0

	/* Chip individual de configuración */
	&__chip
		display: flex
		align-items: center
		gap: 4px
		padding: 3px 8px
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border-tertiary, #dee2e6)
		border-radius: 20px
		font-size: 0.8rem
		color: var(--color-text-primary, #212529)

		/* Chip del cliente con color diferenciado */
		&--client
			border-color: var(--color-primary, #007bff)
			color: var(--color-primary, #007bff)

	/* Ícono decorativo dentro del chip */
	&__chip-icon
		font-size: 0.7rem
		opacity: 0.7

	/* Texto del valor seleccionado */
	&__chip-text
		max-width: 140px
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	/* Botón de edición (lápiz) */
	&__chip-edit
		background: none
		border: none
		padding: 0 2px
		cursor: pointer
		color: inherit
		opacity: 0.5
		line-height: 1
		font-size: 0.7rem
		transition: opacity 0.15s

		&:hover
			opacity: 1
</style>
