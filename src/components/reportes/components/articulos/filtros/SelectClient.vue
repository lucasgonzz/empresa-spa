<template>
	<search-component
	placeholder="Filtrar por cliente"
	@setSelected="setSelected"
	@clearSelected="clearSelected"
	:prop="{text: 'Cliente', key: 'client_id'}"
	model_name="client"
	id="search-client"
	:props_to_filter="['name']"></search-component>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	}, 
	methods: {
		setSelected(result) {
			let client = result.model 

			this.$store.commit('reportes/article_purchase/set_client_id', client.id)
		},
		clearSelected() {
			this.$store.commit('reportes/article_purchase/set_client_id', null)
		}
	}
}
</script>