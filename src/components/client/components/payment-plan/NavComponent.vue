<template>
	<!--
		Sin b-row/b-col desde la misión 33: este nav ahora comparte fila con la barra de fechas (ver
		payment-plan/Index.vue) y los márgenes negativos de una b-row rompían esa fila. El margen
		inferior también se fue: lo pone la fila, una sola vez para los dos.
	-->
	<div
	v-if="user"
	class="payment-plan-nav">
		<horizontal-nav
		:items="items"
		set_sub_view
		@setSelected="setSelected"
		:show_display="false"></horizontal-nav>
	</div>
</template>
<script>
export default {
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []
			items.push({name: 'cuotas pendientes'})
			items.push({name: 'cuotas pagas'})
			return items
		}
	},
	methods: {
		setSelected(selected) {
			let estado = selected.name == 'cuotas pendientes' ? 'pendiente' : 'pagado'
			this.$store.dispatch('payment_plan_cuota/cambiarSolapa', estado)
		}
	}
}
</script>
<style lang="sass">
// El min-width: 0 va también acá adentro: el que tiene que poder encogerse es la pista, no solo el
// contenedor.
.payment-plan-nav
	min-width: 0

	.horizontal-nav
		min-width: 0
</style>
