<template>
<b-modal
title="Comisiones de vendedor"
hide-footer
size="lg"
body-class="comision-modal__body"
id="Comisiones de vendedor">

	<div
	v-if="seller"
	class="comision-modal__header">
		<div class="comision-modal__nombre">{{ seller.name }}</div>
		<div class="comision-modal__config">
			{{ seller.percentage_commission }}% · {{ modo_liquidacion_label }}
		</div>
	</div>

	<div
	v-if="hasExtencion('ventas_en_dolares')"
	class="comision-modal__monedas">
		<button
		type="button"
		class="comision-modal__moneda-btn"
		:class="{ 'comision-modal__moneda-btn--activo': moneda_id == 1 }"
		@click="cambiarMoneda(1)">
			Pesos
		</button>
		<button
		type="button"
		class="comision-modal__moneda-btn"
		:class="{ 'comision-modal__moneda-btn--activo': moneda_id == 2 }"
		@click="cambiarMoneda(2)">
			Dólares
		</button>
	</div>

	<transition name="fade">
		<div :key="moneda_id">
			<resumen></resumen>

			<lista-liquidadas></lista-liquidadas>

			<lista-pendientes :seller="seller"></lista-pendientes>
		</div>
	</transition>

	<div class="comision-modal__pie">
		<b-button
		v-if="seller && seller.seller_commissions_count == 0"
		v-b-modal="'seller-commission-saldo-inicial'"
		variant="outline-primary">
			Saldo inicial
		</b-button>
		<b-button
		v-b-modal="'seller-commission-pago'"
		variant="primary">
			Registrar pago
		</b-button>
	</div>

</b-modal>
</template>
<script>
import Resumen from '@/components/client/modals/sellers/comisiones/Resumen'
import ListaLiquidadas from '@/components/client/modals/sellers/comisiones/ListaLiquidadas'
import ListaPendientes from '@/components/client/modals/sellers/comisiones/ListaPendientes'
export default {
	components: {
		Resumen,
		ListaLiquidadas,
		ListaPendientes,
	},
	computed: {
		seller() {
			return this.$store.state.seller_commission.selected_model
		},
		moneda_id() {
			return this.$store.state.seller_commission.moneda_id
		},
		modo_liquidacion_label() {
			if (this.seller && this.seller.commission_after_pay_sale) {
				return 'Liquida al saldar la venta'
			}
			return 'Liquida al confirmar la venta'
		},
	},
	methods: {
		cambiarMoneda(moneda_id) {
			this.$store.dispatch('seller_commission/setMoneda', moneda_id)
		},
	},
}
</script>
<style scoped lang="sass">
.comision-modal
	&__body
		padding: 20px 24px

	&__header
		margin-bottom: 8px

	&__nombre
		font-size: 1.15rem
		font-weight: 700
		color: #0f172a

	&__config
		font-size: 0.78rem
		color: #94a3b8
		margin-top: 2px

	&__monedas
		display: flex
		gap: 6px
		margin: 14px 0 4px
		background: #f1f5f9
		padding: 4px
		border-radius: 10px
		width: fit-content

	&__moneda-btn
		border: none
		background: none
		padding: 6px 16px
		border-radius: 8px
		font-size: 0.82rem
		font-weight: 600
		color: #64748b
		cursor: pointer

		&--activo
			background: #fff
			color: #0f172a
			box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08)

	&__pie
		display: flex
		justify-content: flex-end
		gap: 10px
		margin-top: 20px
		padding-top: 16px
		border-top: 1px solid #eef0f3

.fade-enter-active, .fade-leave-active
	transition: opacity 0.15s ease

.fade-enter, .fade-leave-to
	opacity: 0
</style>
