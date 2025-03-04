<template>
	<b-row
	v-if="user">
		<b-col>
			<horizontal-nav
			:items="items"
			set_view
			:show_display="false"
			@setSelected="setSelected"></horizontal-nav>
		</b-col>
	</b-row>
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
					name: 'articulos'
				},
				{
					name: 'ventas'
				},
			]
			
			return items
		}
	},
	methods: {
		setSelected(item) {
			if (item.name == 'articulos') {
				this.$store.dispatch('papelera/article/getModels')
			}
			if (item.name == 'ventas') {
				this.$store.dispatch('papelera/sale/getModels')
			}
		},
	}
}
</script>
