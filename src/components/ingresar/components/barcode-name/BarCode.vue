<template>
	<b-col
	md="6"
	cols="12">
		<b-form-group
		label="Codigos">
			<b-input-group
			class="m-b-10"
			prepend="Codigo de barras">
				<b-form-input
				id="article-bar-code"
				type="text"
				autocomplete="off"
				@keydown.enter="isRegister"
				v-model="article.bar_code"
				placeholder="Ingresa el codigo de barras del producto"></b-form-input>
			</b-input-group>
			<b-input-group
			v-if="hasExtencion('providers', false)"
			prepend="Codigo de proveedor">
				<b-form-input
				id="article-provider-code"
				type="text"
				autocomplete="off"
				@keydown.enter="isRegisterProviderCode"
				v-model="article.provider_code"
				placeholder="Ingresa el codigo del proveedor"></b-form-input>
			</b-input-group>
		</b-form-group>
	</b-col>
</template>
<script>
import edit_articles from '@/mixins/edit_articles'
export default {
	name: 'BarCode',
	mixins: [edit_articles],
	props: ['article'],
	computed: {
		bar_codes() {
			return this.articles.map(item => item.bar_code)
		},
		articles() {
			return this.$store.state.article.models
		},
	},
	methods: {
		isRegister() {
			let bar_code = this.getBarCode(this.article.bar_code)
			let finded = this.articles.find(item => item.bar_code == bar_code)
			if (typeof finded != 'undefined') {
				this.$store.commit('article/setModel', {model: this.setArticle(finded), properties: []})
				this.$bvModal.show('edit-article')
			} else {
				if (this.hasExtencion('providers')) {
					document.getElementById('article-provider-code').focus()
				} else {
					document.getElementById('article-name').focus()
				}
			}
		},
		isRegisterProviderCode() {
			let provider_code = this.getBarCode(this.article.provider_code)
			let finded = this.articles.find(item => item.provider_code == provider_code)
			if (typeof finded != 'undefined') {
				this.$store.commit('articles/setEdit', this.setArticle(finded))
				this.$bvModal.show('edit-article')
			} else if (this.article.provider_code != '' || this.article.bar_code != '') {
				document.getElementById('article-name').focus()
			} else {
				document.getElementById('ingresar-article-name').focus()
			}
		}
	},
}
</script>
