<template>
<b-modal
hide-footer
size="lg"
title="Articulos con stock minimo"
id="articles-stock-min">
	<display
	model_name="article"
	:models="articles_stock_min">
		<template v-slot:buttons="props">
			<buttons :model="props.model"></buttons>
		</template>
	</display>
</b-modal>
</template>
<script>
import Display from '@/common-vue/components/display/Index'
import Buttons from '@/components/listado/components/Buttons'
export default {
	components: {
		Display,
		Buttons,
	},
	computed: {
		articles() {
			return this.$store.state.article.models
		},
		articles_stock_min() {
			return this.articles.filter(article => {
				return article.stock != null && article.stock_min != null && article.stock <= article.stock_min  
			})
		}
	}
}
</script>