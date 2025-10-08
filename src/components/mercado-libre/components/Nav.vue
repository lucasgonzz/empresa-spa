<template>
	<b-row
	v-if="user">
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
	name: 'MeLiNavComponent',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = [{
				name: 'pedidos', 
				call_models: 'meli_order',
			}]
			return items 
		},
	},
	methods: {
		setSelected(item) {
		}
	}
}
</script>