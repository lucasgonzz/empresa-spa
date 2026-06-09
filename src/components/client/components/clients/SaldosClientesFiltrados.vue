<template>
	<!--
		Resumen compacto de saldos acumulados de los clientes filtrados.
		Se muestra en la barra horizontal del listado, junto al buscador rápido.
	-->
	<div
	class="saldos-filtrados"
	v-if="filtered.length">

		<!-- Chip de suma de saldos en pesos -->
		<div class="saldos-filtrados__chip saldos-filtrados__chip--ars">
			<div class="saldos-filtrados__icon-wrap">
				<i
				class="bi bi-currency-dollar"
				aria-hidden="true"></i>
			</div>
			<div class="saldos-filtrados__body">
				<span class="saldos-filtrados__label">Saldos en pesos</span>
				<span class="saldos-filtrados__value">{{ suma_saldos_pesos }}</span>
				<span class="saldos-filtrados__meta">{{ filtered_count_label }}</span>
			</div>
		</div>

		<!-- Chip de suma de saldos en dólares (solo con extensión habilitada) -->
		<div
		class="saldos-filtrados__chip saldos-filtrados__chip--usd"
		v-if="hasExtencion('ventas_en_dolares')">
			<div class="saldos-filtrados__icon-wrap">
				<i
				class="bi bi-currency-exchange"
				aria-hidden="true"></i>
			</div>
			<div class="saldos-filtrados__body">
				<span class="saldos-filtrados__label">Saldos en dólares</span>
				<span class="saldos-filtrados__value">{{ suma_saldos_dolares }}</span>
				<span class="saldos-filtrados__meta">{{ filtered_count_label }}</span>
			</div>
		</div>

	</div>
</template>
<script>
export default {
	computed: {
		/**
		 * Clientes actualmente filtrados en el listado.
		 *
		 * @returns {Array}
		 */
		filtered() {
			return this.$store.state.client.filtered
		},

		/**
		 * Cantidad de clientes incluidos en el cálculo de saldos.
		 *
		 * @returns {number}
		 */
		filtered_count() {
			return this.filtered.length
		},

		/**
		 * Texto descriptivo de cuántos clientes suman los totales mostrados.
		 *
		 * @returns {string}
		 */
		filtered_count_label() {
			if (this.filtered_count === 1) {
				return '1 cliente filtrado'
			}
			return this.filtered_count + ' clientes filtrados'
		},

		/**
		 * Suma de saldos en pesos de los clientes filtrados.
		 *
		 * @returns {string}
		 */
		suma_saldos_pesos() {
			// Acumulador del total en pesos
			let total = 0

			this.filtered.forEach(client => {
				total += Number(client.saldo_pesos)
			})

			return this.price(total)
		},

		/**
		 * Suma de saldos en dólares de los clientes filtrados.
		 *
		 * @returns {string}
		 */
		suma_saldos_dolares() {
			// Acumulador del total en dólares
			let total = 0

			this.filtered.forEach(client => {
				total += Number(client.saldo_dolares)
			})

			return this.price(total)
		},
	},
}
</script>
<style scoped lang="sass">
@import '@/sass/_custom.scss'

// Acentos visuales por moneda (alineados con IconCards)
$accent-ars: #d97706
$accent-usd: #0891b2

.saldos-filtrados
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 10px
	margin-right: 15px

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
			.saldos-filtrados__icon-wrap
				background: rgba($accent-ars, 0.12)
				color: $accent-ars

			.saldos-filtrados__value
				color: darken($accent-ars, 8%)

		&--usd
			.saldos-filtrados__icon-wrap
				background: rgba($accent-usd, 0.12)
				color: $accent-usd

			.saldos-filtrados__value
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
