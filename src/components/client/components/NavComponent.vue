<template>
	<b-row
	v-if="user">
		<b-col>
			<horizontal-nav
			:items="items"
			set_view
			@setSelected="setSelected"
			:show_display="false"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []
			if (this.can('client.index')) {
				items.push({name: 'clientes', call_models: 'client'})
				items.push({name: 'planes de pago', call_models: 'payment_plan'})
				items.push({name: 'vendedores', call_models: 'seller'})
			}
			return items
		}
	},
	methods: {
		setSelected(selected) {
			if (selected.name == 'planes de pago') {
				this.$router.push({params: {sub_view: 'cuotas-pendientes'}})
				this.$store.commit('payment_plan_cuota/set_route_prefix', 'pendiente')
				this.$store.dispatch('payment_plan_cuota/getModels')
			}
		}
	}
}
</script>
