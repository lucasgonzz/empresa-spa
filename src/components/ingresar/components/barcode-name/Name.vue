<template>
	<b-col>
		<b-form-group
		class="col-autocomplete"
		label="Nombre"
		label-for="article-name">
			<search-component
			v-if="article.bar_code == '' && article.provider_code == ''"
			class="m-b-15"
			@setSelected="setSelectedArticle"
			:prop="{text: 'Articulo', key: 'name', store: 'article'}"
			model_name="article"
			:show_selected="false"
			:clear_query="false"
			:model="article"
			:auto_select="false"
			id="ingresar-article-name"
			placeholder="Nombre"></search-component>

			<b-form-input
			v-else
			type="text"
			id="article-name"
			@keydown.enter="changeToCost"
			placeholder="Ingresa el nombre del producto"
			autocomplete="off"
			v-model="article.name"></b-form-input>
		</b-form-group>
	</b-col>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import edit_articles from '@/mixins/edit_articles'
export default {
	props: ['article'],
	components: {
		SearchComponent,
	},
	mixins: [edit_articles],
	computed: {
		articles() {
			return this.$store.state.articles.articles
		},
		id_name() {
			return 'select-article-name'
		},
		properties_to_filter() {
			return [
				{
					text: 'Nombre',
					key: 'name',
					type: 'text',
					value: '',
				},
				{
					text: 'Codigo de Barras',
					key: 'bar_code',
					type: 'text',
					value: '',
				},
				{
					text: 'Codigo Proveedor',
					key: 'provider_code',
					type: 'text',
					value: '',
				},
				{
					text: 'N°',
					key: 'num',
					type: 'text',
					value: '',
				},
			]
		},
	},
	methods: {
		changeToCost() {
			document.getElementById('article-cost').focus()
		},
		setSelectedArticle(result) {
			console.log(result)
			if (result.model) {
				this.$store.commit('article/setModel', {model: this.setArticle(result.model), properties: []})
				this.$bvModal.show('edit-article')
			} else {
				this.article.name = result.query
				setTimeout(() => {
					this.changeToCost()
					console.log(this.article)
				}, 200)
			}
		},
	},
}
</script>

