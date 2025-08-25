<template>
	<b-row
	class="m-b-10"
	v-if="user">
		<b-col>
			<horizontal-nav
			:items="items"
			set_sub_view
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
			items.push({name: 'cuotas pendientes'})
			items.push({name: 'cuotas pagas'})
			return items
		}
	},
	methods: {
		setSelected(selected) {
			if (selected.name == 'cuotas pendientes') {
				this.$store.commit('payment_plan_cuota/set_route_prefix', 'pendiente')
			} else {
				this.$store.commit('payment_plan_cuota/set_route_prefix', 'pagado')
			}
			this.$store.dispatch('payment_plan_cuota/getModels')
		}
	}
}
</script>
