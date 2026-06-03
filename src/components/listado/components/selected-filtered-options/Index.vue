<template>

	<div class="article-selected-options-dropdown">



		<search-image-automatica></search-image-automatica>


		<!-- Documentos PDF -->
		<articles-pdf-option-drop-down></articles-pdf-option-drop-down>

		<article-ticket-option-drop-down></article-ticket-option-drop-down>

		<articles-bar-code-pdf></articles-bar-code-pdf>

		<article-pdf></article-pdf>

		<article-table-pdf-profiles></article-table-pdf-profiles>

		<seleccion-especial></seleccion-especial>

		<excel-export></excel-export>

		<reset-stock-option-drop-down></reset-stock-option-drop-down>

	</div>

</template>

<script>

export default {

	components: {

		ArticleTicketOptionDropDown: () => import('@/components/listado/components/selected-filtered-options/ArticleTicketOptionDropDown'),

		ArticlesPdfOptionDropDown: () => import('@/components/listado/components/selected-filtered-options/ArticlesPdfOptionDropDown'),

		ArticlesBarCodePdf: () => import('@/components/listado/components/selected-filtered-options/ArticlesBarCodePdf'),

		ArticlePdf: () => import('@/components/listado/components/selected-filtered-options/ArticlePdf'),

		ArticleTablePdfProfiles: () => import('@/components/listado/components/selected-filtered-options/ArticleTablePdfProfiles'),

		ResetStockOptionDropDown: () => import('@/components/listado/components/selected-filtered-options/ResetStockOptionDropDown'),

		SeleccionEspecial: () => import('@/components/listado/components/selected-filtered-options/SeleccionEspecial'),

		ExcelExport: () => import('@/components/listado/components/selected-filtered-options/ExcelExport'),

		ConfirmResetStock: () => import('@/components/listado/modals/ConfirmResetStock'),

		SearchImageAutomatica: () => import('@/components/listado/components/selected-filtered-options/SearchImageAutomatica'),

	}

}

</script>

<style lang="sass">

/* Contenedor de opciones del dropdown de seleccionados/filtrados en listado de articulos */

.article-selected-options-dropdown

	min-width: 300px

	padding: 4px 0



	.dropdown-divider

		margin: 6px 12px

		border-top-color: rgba(0, 0, 0, 0.08)



/* Encabezado de cada bloque del menu */

.article-dropdown-section-header

	padding: 10px 0px 6px

	font-size: 0.7rem

	font-weight: 700

	letter-spacing: 0.06em

	text-transform: uppercase

	color: #333

	background: transparent

	border: none



	&__content

		display: flex

		align-items: center

		gap: 8px



	&__icon

		font-size: 0.95rem

		opacity: 0.85

		color: #495057



	&__text

		line-height: 1.2



/* Opcion individual: icono en celda + label */

.article-dropdown-option

	padding: 0



	&.dropdown-item

		padding: 0



	&:hover,

	&:focus,

	&:active

		.article-dropdown-option__icon-wrap

			background-color: rgba(255, 255, 255, 0.22)

			color: inherit



	&__content

		display: flex

		align-items: center

		gap: 12px

		width: 100%

		padding: 5px 0px

		min-height: 42px



	&__icon-wrap

		display: flex

		align-items: center

		justify-content: center

		flex-shrink: 0

		width: 32px

		height: 32px

		border-radius: 8px

		background-color: rgba(0, 0, 0, 0.06)

		color: #495057

		font-size: 1rem

		transition: background-color 0.15s ease, color 0.15s ease



	&__label

		flex: 1

		font-size: 0.9rem

		font-weight: 500

		line-height: 1.35

		color: #212529

		text-align: left

		white-space: normal

		word-break: break-word



/* Variante de peligro para acciones destructivas */

.article-dropdown-option--danger

	.article-dropdown-option__icon-wrap

		background-color: rgba(220, 53, 69, 0.12)

		color: #c82333



	.article-dropdown-option__label

		color: #c82333



	&:hover,

	&:focus

		.article-dropdown-option__icon-wrap

			background-color: rgba(220, 53, 69, 0.2)

</style>

