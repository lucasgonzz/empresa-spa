<template>
	<b-col
	cols="12"
	:lg="col_header_lg"
	class="col-autocomplete margin-bottom-since-lg">
		<search-component
		id="search-article"
		model_name="article"
		@setSelected="setSelected"
		:show_selected="false"
		:model="article"
		:save_if_not_exist="false"
		:str_limint="3"
		:prop="{text: 'Articulo', key: 'article_id', store: 'article'}"></search-component>
	</b-col>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components : {
		SearchComponent,
	},
	computed: {
		articles() {
			return this.$store.state.articles.articles
		},
		id() {
			return 'article-sale-name'
		},
	},
	methods: {
		setSelected(result) {
			console.log(result)
			this.article.name = result.query
			this.setVenderArticle(result.model)
		},
	}
}
</script>