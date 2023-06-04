<template>
	<div>
		<hr>
		<p class="title-left m-b-0">
			Variantes 
		</p>
		<view-component
		model_name="article_variant"
		:show_btn_create="false"
		:show_display="false"
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
}
</script>