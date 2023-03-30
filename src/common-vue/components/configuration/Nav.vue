<template>
	<horizontal-nav
	:show_display="false"
	set_view
	:items="items"></horizontal-nav>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
export default {
	components: {
		HorizontalNav,
	},
	computed: {
		items() {
			let items = [
				{
					name: 'general'
				},
				{
					name: 'contraseña'
				},
			]
			if (this.custom_configuration_page) {
				items.push({
					name: 'avanzado'
				})
			}
			return items
		}
	}
}
</script>