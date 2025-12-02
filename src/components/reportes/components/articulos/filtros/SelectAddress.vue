<template>
	<search-component
	placeholder="Filtrar por sucursal"
	@setSelected="setSelected"
	@clearSelected="clearSelected"
	:prop="{text: 'Sucursal', key: 'address_id'}"
	model_name="address"
	id="search-address"
	:props_to_filter="['name']"></search-component>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	}, 
	methods: {
		setSelected(result) {
			let address = result.model 

			this.$store.commit('reportes/article_purchase/set_address_id', address.id)
		},
		clearSelected() {
			this.$store.commit('reportes/article_purchase/set_address_id', null)
		}
	}
}
</script>