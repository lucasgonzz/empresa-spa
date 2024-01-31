<template>
	<horizontal-nav
	set_view
	:show_display="false"
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
}
</script>