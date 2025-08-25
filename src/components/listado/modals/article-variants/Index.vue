<template>
<b-modal
:title="title"
size="lg"
id="article-variants"
hide-footer>

	<variants-stock
	v-if="addresses.length"></variants-stock>

	<article-properties></article-properties>

	<article-variants></article-variants>
</b-modal>
</template>
<script>
export default {
	components: {
		VariantsStock: () => import('@/components/listado/modals/article-variants/variant-stock/Index'),
		ArticleProperties: () => import('@/components/listado/modals/article-variants/ArticleProperties'),
		ArticleVariants: () => import('@/components/listado/modals/article-variants/ArticleVariants'),
	},
	computed: {
		addresses() {
			return this.$store.state.address.models
		},
		article() {
			return this.$store.state.article.model 
		},
		title() {
			return 'Variantes de '+this.article.name 
		},
	}
}
</script>