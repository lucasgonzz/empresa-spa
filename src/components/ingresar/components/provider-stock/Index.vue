<template>
	<b-row
	class="m-b-15">
		<article-provider
		:show_checkboxs="show_checkboxs"
		:article="article"></article-provider>
		<article-stock
		:show_checkboxs="show_checkboxs"
		:article="article"></article-stock>
	</b-row>
</template>
<script>
import ArticleProvider from '@/components/ingresar/components/provider-stock/Provider'
import ArticleStock from '@/components/ingresar/components/provider-stock/Stock'
export default {
	props: {
		article: {
			props: Object,
		},
		show_checkboxs: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		ArticleProvider,
		ArticleStock,
	},
}
</script>