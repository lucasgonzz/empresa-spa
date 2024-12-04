<template>
	<horizontal-nav
	set_view
	:show_display="false"
	@setSelected="setSelected"
	:items="items"></horizontal-nav>
</template>
<script>
export default {
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = [
				{
					name: 'para checkear'
				},
				{
					name: 'confirmadas'
				},
			]
			return items 
		},
	},
	methods: {
		setSelected() {
			console.log('setSelected')
			this.$store.dispatch('sale/getModels')
		}
	}
}
</script>