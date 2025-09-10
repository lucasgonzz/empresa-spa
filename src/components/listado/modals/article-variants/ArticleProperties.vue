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
		:show_btn_create="false"
		:show_view_header="false"
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

			if (this.se_asignaron_property_values) {

				var article_variants = new ArticleVariants(this.article, this.article_properties)
				let variants = article_variants.getArticleVariants()
			
				console.log('variants')
				console.log(variants)

				await this.saveVariants(variants)

				this.loadModel('article', this.article.id)
			}

		},
		se_asignaron_property_values() {
			let se_asignaron_property_values = false
			
			this.article_properties.forEach(article_property => {

				if (article_property.article_property_values.length) {
					se_asignaron_property_values = true
				}
			})

			return se_asignaron_property_values
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