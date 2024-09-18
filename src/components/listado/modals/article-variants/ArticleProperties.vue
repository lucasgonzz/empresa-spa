<template>
	<div>
		<p class="title-left m-b-0">
			Propiedades
		</p>
		<view-component
		:show_display="false"
		@modelSaved="setArticleVariants"
		@modelDeleted="setArticleVariants"
		model_name="article_property"
		:check_permissions="false"
		:prop_to_send_on_save="prop_to_send_on_save"></view-component>
	</div>
</template>
<script>
import ArticleVariants from '@/mixins/article_variants'
export default {
	// mixins: [article_variants],
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	computed: {
		prop_to_send_on_save() {
			return {
				key: 'article_id',
				value: this.article.id 
			}
		},
		article() {
			return this.$store.state.article.model 
		},
		article_properties() {
			return this.$store.state.article_property.models 
		},
	},
	methods: {
		async setArticleVariants() {
			console.log('modelSaved article_properties')
			console.log(this.article_properties)
			var article_variants = new ArticleVariants(this.article, this.article_properties)
			let variants = article_variants.getArticleVariants()
			await this.saveVariants(variants)
			this.loadModel('article', this.article.id)
		},

		saveVariants(variants) {
			return this.$api.post('article-variant', {
				models: variants,
				article_id: this.article.id,
			})
			.then(res => {
				console.log('se guardaron variants')
				this.$store.commit('article_variant/setModels', res.data.models)
			})
			.catch(err => {
				console.log(err)
			})
		}
	}
}
</script>