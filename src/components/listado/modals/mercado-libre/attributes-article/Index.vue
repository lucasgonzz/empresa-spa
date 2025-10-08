<template>

	<div
	v-if="view == 'del-articulo'">
		<h4>
	    	Atributos
		</h4>

		<div 
		v-if="article_meli_attributes.length"
		class="cont-attributes">
			
			<article-attribute
			v-for="attribute in article_meli_attributes"
			:article_meli_attribute="attribute"></article-attribute>	
		</div>

		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			Aun no hay atributos, asignelos desde la pestaña de atributos de Mercado Libre
		</p>
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