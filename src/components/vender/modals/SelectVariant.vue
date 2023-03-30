<template>
<b-modal id="select-variant" title="Seleccionar modelo" size="lg" hide-footer>
	<div class="cont-article-cards">
		<b-card
		@click="selectVariant(variant)"
		class="card-article-variant c-p border-radius shadow-2"
		no-body
		v-for="variant in article.variants"
		:key="variant.id">
			<img :src="imageCropedUrlfromImage(variant)">
			<p class="name">
				{{ article.name }} {{ variant.description }}
 			</p>
		</b-card>
	</div>
</b-modal>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	computed: {
		article() {
			return this.$store.state.vender.article_for_sale
		}, 
	},
	methods: {
		selectVariant(variant) {
			this.article.selected_variant_id = variant.id
			this.$bvModal.hide('select-variant')
			this.addArticleAndSetTotal()
		}
	}
}
</script>
<style scoped lang="sass">
.name 
	padding: 1em
</style>