<template>
	<view-component 
	v-if="view == 'recetas'"
	model_name="recipe"
	show_filter_modal>
		<template #table-prop-article_image="props">
			<article-image
			:article="props.model.article"></article-image>
		</template>

		<template #model_modal_title>
			{{ modal_title }}
		</template>
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		ArticleImage: () => import('@/components/produccion/components/recipes/ArticleImage'),
	},
	computed: {
		modal_title() {
			if (this.selected_recipe.article) {
				return 'Receta de '+this.selected_recipe.article.name
			}
		},
		selected_recipe() {
			return this.$store.state.recipe.model 
		}
	}
}
</script>