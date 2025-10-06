<template>

	<div
	v-if="view == 'del-articulo'">
		<h4>
	    	Atributos
		</h4>

		<div class="cont-attributes">
			
			<article-attribute
			v-for="attribute in article_meli_attributes"
			:article_meli_attribute="attribute"></article-attribute>	
		</div>
	</div>

</template>
<script>
export default {
	components: {
        ArticleAttribute: () => import('@/components/listado/modals/mercado-libre/attributes-article/ArticleAttribute'),
	},
	computed: {
		article_meli_attributes() {
			return this.$store.state.meli.article_meli_attributes
		}
	},
}
</script>