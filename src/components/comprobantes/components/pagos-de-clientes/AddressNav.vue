<template>
	<div
	v-if="hasExtencion('filtrar_clientes_por_sucursal_en_vender')">
		<horizontal-nav
		class="m-b-15"
		:items="items"
		set_sub_view
		:show_display="false"></horizontal-nav>
	</div>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
export default {
	components: {
		HorizontalNav,
	},
	computed: {
		addresses() {
			return this.$store.state.address.models
		},
		items() {
			let items = []

			items.push({name: 'todas'})

			this.addresses.forEach(address => {
				items.push({
					name: address.street
				})
			})

			return items
		},
	},
}
</script>