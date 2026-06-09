<template>
	<!--
		Resumen compacto de saldos totales de las cajas visibles.
		Se muestra en la barra horizontal del módulo caja, solo para el owner.
	-->
	<div
	class="caja-totales"
	v-if="is_owner">

		<!-- Chip de total acumulado en pesos -->
		<div class="caja-totales__chip caja-totales__chip--ars">
			<div class="caja-totales__icon-wrap">
				<i
				class="bi bi-currency-dollar"
				aria-hidden="true"></i>
			</div>
			<div class="caja-totales__body">
				<span class="caja-totales__label">Total en pesos</span>
				<span class="caja-totales__value">{{ total_pesos_label }}</span>
				<span class="caja-totales__meta">{{ cajas_count_label }}</span>
			</div>
		</div>

		<!-- Chip de total acumulado en dólares (solo con extensión habilitada) -->
		<div
		class="caja-totales__chip caja-totales__chip--usd"
		v-if="hasExtencion('ventas_en_dolares')">
			<div class="caja-totales__icon-wrap">
				<i
				class="bi bi-currency-exchange"
				aria-hidden="true"></i>
			</div>
			<div class="caja-totales__body">
				<span class="caja-totales__label">Total en dólares</span>
				<span class="caja-totales__value">{{ total_dolares_label }}</span>
				<span class="caja-totales__meta">{{ cajas_count_label }}</span>
			</div>
		</div>

	</div>
</template>
<script>
export default {
	computed: {
		/**
		 * Cajas cargadas en el store del módulo caja.
		 *
		 * @returns {Array}
		 */
		cajas() {
			if (this.$store.state.caja.filtered && this.$store.state.caja.filtered.length) {
				return this.$store.state.caja.filtered
			}
			return this.$store.state.caja.models
		},

		/**
		 * Cantidad de cajas incluidas en el resumen.
		 *
		 * @returns {number}
		 */
		cajas_count() {
			return this.cajas.length
		},

		/**
		 * Texto descriptivo de cuántas cajas suman los totales mostrados.
		 *
		 * @returns {string}
		 */
		cajas_count_label() {
			if (this.cajas_count === 1) {
				return '1 caja'
			}
			return this.cajas_count + ' cajas'
		},

		/**
		 * Suma de saldos en pesos de todas las cajas en moneda local.
		 *
		 * @returns {number}
		 */
		total() {
			// Acumulador del total en pesos
			let total = 0

			this.cajas.forEach(caja => {
				// moneda_id null o 1 corresponde a pesos
				if (
					caja.moneda_id === null
					|| caja.moneda_id == 1
				) {
					total += Number(caja.saldo)
				}
			})

			return total
		},

		/**
		 * Suma de saldos en dólares de las cajas en USD.
		 *
		 * @returns {number}
		 */
		total_usd() {
			// Acumulador del total en dólares
			let total = 0

			this.cajas.forEach(caja => {
				if (caja.moneda_id == 2) {
					total += Number(caja.saldo)
				}
			})

			return total
		},

		/**
		 * Total en pesos formateado para mostrar en el chip.
		 *
		 * @returns {string}
		 */
		total_pesos_label() {
			return this.price(this.total)
		},

		/**
		 * Total en dólares formateado para mostrar en el chip.
		 *
		 * @returns {string}
		 */
		total_dolares_label() {
			return this.price(this.total_usd)
		},
	},
}
</script>
<style scoped lang="sass">
@import '@/sass/_custom.scss'

// Acentos visuales por moneda (alineados con SaldosClientesFiltrados e IconCards)
$accent-ars: #d97706
$accent-usd: #0891b2

.caja-totales
	display: flex
	flex-direction: row
	// flex-wrap: wrap
	align-items: center
	gap: 10px
	margin: 0 10px

	&__chip
		display: flex
		align-items: center
		gap: 10px
		padding: 8px 12px
		border-radius: 10px
		border: 1px solid #e2e8f0
		background: #fff
		box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
		transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease
		min-width: 0

		&:hover
			transform: translateY(-1px)
			box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08)
			border-color: #cbd5e1

		&--ars
			.caja-totales__icon-wrap
				background: rgba($accent-ars, 0.12)
				color: $accent-ars

			.caja-totales__value
				color: darken($accent-ars, 8%)

		&--usd
			.caja-totales__icon-wrap
				background: rgba($accent-usd, 0.12)
				color: $accent-usd

			.caja-totales__value
				color: darken($accent-usd, 8%)

	&__icon-wrap
		flex-shrink: 0
		width: 34px
		height: 34px
		border-radius: 8px
		display: flex
		align-items: center
		justify-content: center

		i
			font-size: 1rem
			line-height: 1

	&__body
		display: flex
		flex-direction: column
		min-width: 0
		gap: 1px

	&__label
		font-size: 0.68rem
		font-weight: 600
		color: #64748b
		text-transform: uppercase
		letter-spacing: 0.04em
		line-height: 1.2
		white-space: nowrap

	&__value
		font-size: 1rem
		font-weight: 700
		line-height: 1.2
		white-space: nowrap

	&__meta
		font-size: 0.68rem
		color: #94a3b8
		line-height: 1.2
		white-space: nowrap

	@media screen and (max-width: 576px)
		gap: 8px
		margin-right: 0
		width: 100%

		&__chip
			flex: 1 1 100%

		&__value
			font-size: 0.92rem
</style>
