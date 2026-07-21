<template>
<b-modal
:title="title"
size="lg"
id="article-variants"
modal-class="article-variants-modal"
hide-footer>

	<!-- Zona 1: propiedades y valores del articulo (alta/baja + intencion al back) -->
	<div class="article-variants-modal__section">
		<article-properties></article-properties>
	</div>

	<!-- Zona 2: preview en vivo de cuantas variantes se generarian -->
	<preview-count></preview-count>

	<!-- Zona 3: grilla de variantes (disponibilidad, precio/imagen inline, stock por deposito) -->
	<div class="article-variants-modal__section">
		<variant-grid></variant-grid>
	</div>
</b-modal>
</template>
<script>
export default {
	components: {
		ArticleProperties: () => import('@/components/listado/modals/article-variants/ArticleProperties'),
		PreviewCount: () => import('@/components/listado/modals/article-variants/PreviewCount'),
		VariantGrid: () => import('@/components/listado/modals/article-variants/variant-grid/Index'),
	},
	computed: {
		article() {
			return this.$store.state.article.model
		},
		title() {
			return 'Variantes de '+this.article.name
		},
	}
}
</script>
<style lang="sass">
.article-variants-modal
	.modal-content
		border-radius: 18px
		border: none
	.modal-header
		border-bottom: none
		padding-bottom: 0
	.modal-title
		font-weight: 600
		color: #1d1d1f
	&__section
		margin-bottom: 18px
		padding-bottom: 18px
		border-bottom: 1px solid rgba(0, 0, 0, .06)
		&:last-child
			border-bottom: none
			padding-bottom: 0
			margin-bottom: 0
</style>