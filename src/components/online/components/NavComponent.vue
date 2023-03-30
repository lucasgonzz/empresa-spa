<template>
	<b-row>
		<b-col
		cols="12"
		class="col-nav">
			<horizontal-nav
			@setSelected="setSelected"
			set_view
			:show_display="false"
			:items="items"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
export default {
	name: 'NavComponentOnline',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []
			if (this.can('order.index')) {
				items.push({
					name: 'pedidos',
					call_models: 'order',
				})
			}
			if (this.can('buyer.index')) {
				items.push({
					name: 'clientes',
					call_models: 'buyer',
				})
			}
			if (this.can('buyer.messages')) {
				items.push({
					name: 'mensajes',
					// call_models: 'buyer/getModels',
				})
			}
			return items 
		},
	},
	methods: {
		setSelected(item) {
			if (item.name == 'mensajes') {
				this.$store.commit('message/setChatsToShow')
			}
		}
	}
}
</script>