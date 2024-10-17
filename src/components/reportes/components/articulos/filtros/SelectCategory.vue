<template>
	<search-component
	placeholder="Filtrar por categoria"
	@setSelected="setSelected"
	@clearSelected="clearSelected"
	:prop="{text: 'Categoria', key: 'category_id'}"
	model_name="category"
	id="search-category"
	:props_to_filter="['name']"></search-component>
</template>
<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	}, 
	methods: {
		setSelected(result) {
			let category = result.model 

			this.$store.commit('reportes/article_purchase/set_category_id', category.id)
		},
		clearSelected() {
			this.$store.commit('reportes/article_purchase/set_category_id', null)
		}
	}
}
</script>