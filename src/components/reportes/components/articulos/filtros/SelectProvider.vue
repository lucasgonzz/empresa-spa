<template>
	<search-component
	placeholder="Filtrar por proveedor"
	@clearSelected="clearSelected"
	@setSelected="setSelected"
	:prop="{text: 'Proveedor', key: 'provider_id'}"
	model_name="provider"
	id="search-provider"
	:props_to_filter="['name']"></search-component>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	}, 
	methods: {
		setSelected(result) {
			let provider = result.model 

			this.$store.commit('reportes/article_purchase/set_provider_id', provider.id)
		},
		clearSelected() {
			this.$store.commit('reportes/article_purchase/set_provider_id', null)
		}
	}
}
</script>