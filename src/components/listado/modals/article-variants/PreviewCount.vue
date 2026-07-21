<template>
<div class="preview-count">
	<div
	v-if="variants_count"
	class="preview-count__badge preview-count__badge--active">
		<i class="icon-check"></i>
		Se van a generar {{ variants_count }} variante{{ variants_count == 1 ? '' : 's' }}
	</div>
	<div
	v-else
	class="preview-count__badge">
		Agrega valores a las propiedades para generar variantes
	</div>
</div>
</template>
<script>
// Se reutiliza el mixin existente (mixins/article_variants.js) SOLO para calcular localmente
// cuantas combinaciones se generarian (feedback inmediato al usuario). Este calculo nunca se
// postea al back: el que persiste y hace el diff incremental no destructivo es
// ArticleVariantGeneratorHelper (prompt 519), a partir de las article_properties ya guardadas.
import ArticleVariants from '@/mixins/article_variants'

export default {
	computed: {
		/** Articulo cuyas variantes se estan configurando. */
		article() {
			return this.$store.state.article.model
		},
		/** Propiedades del articulo con sus valores seleccionados (fuente para el conteo local). */
		article_properties() {
			return this.$store.state.article_property.models
		},
		/**
		 * Cantidad de combinaciones que se generarian con las propiedades/valores actuales.
		 * Es solo un preview en vivo: no dispara ningun request.
		 */
		variants_count() {
			let article_variants = new ArticleVariants(this.article, this.article_properties)
			return article_variants.getArticleVariants().length
		},
	},
}
</script>
<style lang="sass">
.preview-count
	width: 100%
	display: flex
	justify-content: center
	margin: 6px 0 16px 0
	&__badge
		display: inline-flex
		align-items: center
		gap: 8px
		font-size: 0.9em
		font-weight: 500
		color: rgba(0, 0, 0, .5)
		background: #F0F0F3
		padding: 8px 16px
		border-radius: 999px
		&--active
			color: #1c7c3c
			background: rgba(52, 199, 89, .12)
</style>
