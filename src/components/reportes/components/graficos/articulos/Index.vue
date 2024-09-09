<template>
	<b-row
	v-if="view == 'articulos'"
	class="j-start">

		<b-col
		cols="12">
			<search></search>
		</b-col>

		<b-col
		cols="12">
			<article-performances></article-performances>
		</b-col>
		
	</b-row>
</template>
<script>
export default {
	components: {
		Search: () => import('@/components/reportes/components/graficos/articulos/Search'),
		ArticlePerformances: () => import('@/components/reportes/components/graficos/articulos/article-performances/Index'),
	},
}
</script>