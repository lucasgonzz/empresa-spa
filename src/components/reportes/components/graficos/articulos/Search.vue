<template>
	<search-component
	class="m-t-20"
	id="search-article"
	model_name="article"
	@setSelected="setSelected"
	placeholder="Buscar rendimiento de un articulo"
	:show_selected="false"
	:save_if_not_exist="false"
	:search_from_api="search_from_api"
	:props_to_filter="['num', 'name', 'provider_code']"
	:prop="{text: 'Articulo', key: 'article_id', store: 'article'}"></search-component>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
export default {
	components : {
		SearchComponent,
	},
	computed: {
		search_from_api() {
			if (!this.download_articles) {
				console.log('SI SE BUSCA POR API')
				return true
			}
			console.log('NO SE BUSCA POR API')
			return false
		},
	},
	methods: {
		setSelected(result) {
			console.log('llego este resultado:')
			console.log(result)

			this.$store.commit('reportes/article_performance/setSelectedArticle', result.model)

			this.$store.dispatch('reportes/article_performance/getModels')
		},
	}
}
</script>