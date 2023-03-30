<template>
	<b-form-row
	class="m-b-15">
		<b-col>
			<b-form-group
			v-intro-step="3"
			v-intro="'Ingresa el nombre para tu producto'"
			class="col-autocomplete"
			label="Nombre"
			label-for="article-name">
				<b-form-input
				v-show="article.bar_code != ''"
				type="text"
				id="article-name"
				@keydown.enter="changeToCost"
				placeholder="Ingresa el nombre del producto"
				autocomplete="off"
				v-model="article.name"></b-form-input>
				<autocomplete 
 			 	data-position="below"
				ref="articleName"
				v-show="article.bar_code == ''"
				:search="search" 
				@change="change"
				:get-result-value="getResultValue"
				placeholder="Buscar un artículo"
				@submit="setSelectedArticle"></autocomplete>
			</b-form-group>
		</b-col>
	</b-form-row>
</template>
<script>
import Autocomplete from '@trevoreyre/autocomplete-vue'
import '@trevoreyre/autocomplete-vue/dist/style.css'
import edit_articles from '@/mixins/edit_articles'
export default {
	props: ['article'],
	components: {
		Autocomplete
	},
	mixins: [edit_articles],
	computed: {
		articles() {
			return this.$store.state.articles.articles
		}
	},
	methods: {
		search(input) {
			if (input.length < 3) { return [] }
			return this.articles.filter(article => {
				return article.name && article.name.toLowerCase().includes(input.toLowerCase())
			})
		},
		getResultValue(article) {
			return article.name
		},
		changeToCost() {
			document.getElementById('article-cost').focus()
		},
		change() {
			this.setArticleName()
		},
		setSelectedArticle(article) {
			if (article) {
				let art = this.articles.find(art_ => {
					return art_.id == article.id
				})
				this.$store.commit('articles/setEdit', this.setArticle(art))
				this.$bvModal.show('edit-article')
			} else {
				this.setArticleName()
				document.getElementById('article-cost').focus()
			}
		},
		setArticleName() {
			let input = document.getElementsByClassName('autocomplete-input')[0]
			this.article.name = input.value
		},
		clearName() {
			this.$refs.articleName.setValue('')
		}
	},
}
</script>

