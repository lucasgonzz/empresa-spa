<template>
	<div
	v-if="show_seccion"
	class="comision-lista comision-lista--pendientes">

		<div class="comision-lista__ayuda">
			Estas comisiones se van a liquidar automáticamente cuando se salden sus ventas.
		</div>

		<div
		v-if="!pendientes.length"
		class="comision-lista__vacio">
			No hay comisiones pendientes
		</div>

		<item
		v-for="pendiente in pendientes"
		:key="'pendiente-'+pendiente.id"
		:item="pendiente"
		:es_pendiente="true"></item>

	</div>
</template>
<script>
import Item from '@/components/client/modals/sellers/comisiones/Item'
export default {
	components: {
		Item,
	},
	props: {
		seller: {
			type: Object,
			default: null,
		},
	},
	computed: {
		pendientes() {
			return this.$store.state.seller_commission.pendientes
		},
		show_seccion() {
			return !!(this.seller && this.seller.commission_after_pay_sale)
		},
	},
}
</script>
<style scoped lang="sass">
.comision-lista--pendientes
	margin-top: 24px

.comision-lista
	&__ayuda
		font-size: 0.78rem
		color: #94a3b8
		margin-bottom: 10px

	&__vacio
		text-align: center
		color: #94a3b8
		padding: 24px 0
		font-size: 0.9rem
</style>
