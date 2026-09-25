<template>
	<!--
		Las tres tarjetas del modal de comisiones, con el mismo chip que los totales de Ventas
		(`src/sass/_chips_totales.sass`): ícono en celda, etiqueta chica arriba, valor abajo.
		El saldo es el protagonista y el único con acento.

		Los números salen de `panel_totales`, que ya viene calculado por la API con el rango
		elegido. Acá no se suma nada: sumar la página visible daría el total de 15 filas, no el
		del período.
	-->
	<div class="comision-resumen">

		<div class="totales-chip totales-chip--principal">
			<div class="totales-chip__icon-wrap">
				<i
				class="bi bi-wallet2"
				aria-hidden="true"></i>
			</div>
			<div class="totales-chip__body">
				<span class="totales-chip__label">{{ label_saldo }}</span>
				<b-skeleton
				v-if="loading"
				width="90px"></b-skeleton>
				<span
				v-else
				class="totales-chip__value">{{ price(saldo) }}</span>
			</div>
		</div>

		<div class="totales-chip">
			<div class="totales-chip__icon-wrap">
				<i
				class="bi bi-hourglass-split"
				aria-hidden="true"></i>
			</div>
			<div class="totales-chip__body">
				<span class="totales-chip__label">Pendiente de liquidar</span>
				<b-skeleton
				v-if="loading"
				width="80px"></b-skeleton>
				<span
				v-else
				class="totales-chip__value">{{ price(pendiente) }}</span>
			</div>
		</div>

		<div class="totales-chip">
			<div class="totales-chip__icon-wrap">
				<i
				class="bi bi-cash-coin"
				aria-hidden="true"></i>
			</div>
			<div class="totales-chip__body">
				<span class="totales-chip__label">{{ label_pagado }}</span>
				<b-skeleton
				v-if="loading"
				width="80px"></b-skeleton>
				<span
				v-else
				class="totales-chip__value">{{ price(pagado) }}</span>
			</div>
		</div>

	</div>
</template>
<script>
import moment from 'moment'
export default {
	computed: {
		// Totales del panel, ya filtrados por el rango que eligió el usuario.
		totales() {
			return this.$store.state.seller_commission.panel_totales || {}
		},
		loading() {
			return this.$store.state.seller_commission.loading_resumen
		},
		desde() {
			return this.$store.state.seller_commission.panel_desde
		},
		hasta() {
			return this.$store.state.seller_commission.panel_hasta
		},
		// Hay rango si hay cualquiera de las dos puntas.
		hay_rango() {
			return !!(this.desde || this.hasta)
		},
		saldo() {
			return Number(this.totales.saldo) || 0
		},
		pendiente() {
			return Number(this.totales.total_pendiente) || 0
		},
		pagado() {
			return Number(this.totales.total_pagado) || 0
		},
		// Con `hasta` el saldo es el del cierre del período (como un resumen de cuenta
		// corriente). `desde` no lo mueve: un saldo es acumulado.
		label_saldo() {
			if (this.hasta) {
				return 'Saldo al '+moment(this.hasta).format('DD/MM/YYYY')
			}
			return 'Saldo a pagar'
		},
		// Sin rango es el histórico completo de pagos; con rango, solo los del período.
		label_pagado() {
			if (this.hay_rango) {
				return 'Pagado en el período'
			}
			return 'Pagado'
		},
	},
}
</script>
<style scoped lang="sass">
.comision-resumen
	display: grid
	grid-template-columns: repeat(auto-fit, minmax(210px, 1fr))
	gap: 10px
	padding: 16px 0 20px
</style>
