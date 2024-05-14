<template>
	<horizontal-nav
	class="m-b-10"
	set_view
	:show_display="false"
	:items="items"></horizontal-nav>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
export default {
	computed: {
		client() {
			return this.$store.state.vender.client
		},
		items() {
			let items = []
			if (this.client) {
				items.push({name: 'cliente ('+this.client.name+')'})
			} else {
				items.push({name: 'cliente'})
			}
			items.push({name: 'remito'})
			return items
		},
	},
	components: {
		HorizontalNav,
	}
}
</script>