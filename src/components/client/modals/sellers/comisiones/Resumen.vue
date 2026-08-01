<template>
	<div class="comision-resumen">

		<div class="comision-resumen__item comision-resumen__item--protagonista">
			<span class="comision-resumen__label">Saldo a pagar</span>
			<span class="comision-resumen__valor">{{ price(saldo) }}</span>
		</div>

		<div class="comision-resumen__item">
			<span class="comision-resumen__label">Pendiente de liquidar</span>
			<span class="comision-resumen__valor comision-resumen__valor--secundario">{{ price(pendiente) }}</span>
		</div>

		<div class="comision-resumen__item">
			<span class="comision-resumen__label">Pagado en el período</span>
			<span class="comision-resumen__valor comision-resumen__valor--secundario">{{ price(pagado_en_periodo) }}</span>
		</div>

	</div>
</template>
<script>
export default {
	computed: {
		totales() {
			return this.$store.state.seller_commission.totales || {}
		},
		liquidadas() {
			return this.$store.state.seller_commission.liquidadas
		},
		saldo() {
			return this.totales.saldo || 0
		},
		pendiente() {
			return this.totales.total_pendiente || 0
		},
		pagado_en_periodo() {
			let total = 0
			this.liquidadas.forEach(liquidada => {
				if (liquidada.haber) {
					total += Number(liquidada.haber)
				}
			})
			return total
		},
	},
}
</script>
<style scoped lang="sass">
.comision-resumen
	display: flex
	gap: 24px
	padding: 20px 4px 24px

	&__item
		display: flex
		flex-direction: column
		gap: 2px

		&--protagonista
			.comision-resumen__valor
				font-size: 1.9rem
				color: #0f172a

	&__label
		font-size: 0.68rem
		font-weight: 600
		color: #94a3b8
		text-transform: uppercase
		letter-spacing: 0.04em

	&__valor
		font-size: 1.1rem
		font-weight: 700
		color: #334155

		&--secundario
			color: #94a3b8
			font-weight: 600

	@media screen and (max-width: 576px)
		flex-direction: column
		gap: 14px
</style>
