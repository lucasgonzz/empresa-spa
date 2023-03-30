<template>
	<b-row
	class="m-b-15">
		<article-bar-code
		:article="article"></article-bar-code>
		<article-name
		:article="article"></article-name>
	</b-row>
</template>
<script>
import ArticleBarCode from '@/components/ingresar/components/barcode-name/BarCode'
import ArticleName from '@/components/ingresar/components/barcode-name/Name'
export default {
	props: ['article'],
	components: {
		ArticleBarCode,
		ArticleName,
	},
}
</script>