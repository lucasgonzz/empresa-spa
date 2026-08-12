<template>

	<div class="article-selected-options-dropdown">



		<search-image-automatica></search-image-automatica>

		<search-description-automatica></search-description-automatica>


		<!-- <articles-pdf-option-drop-down></articles-pdf-option-drop-down> -->

		<!-- Documentos PDF -->

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

		SearchDescriptionAutomatica: () => import('@/components/listado/components/selected-filtered-options/SearchDescriptionAutomatica'),

	}

}

</script>

<style lang="sass">
/* Contenedor de opciones que el Listado inyecta por slot en el dropdown de seleccionados/filtrados */

// Ya no declara min-width: el ancho del menu lo declara el propio menu, en
// src/sass/_menus_desplegables.sass (mision 28). Ese min-width: 300px sobre el CONTENIDO era el que
// producia la barra de scroll horizontal: en cuanto algo le acotaba el ancho al menu --Popper en
// una pantalla angosta, o la barra vertical que aparece al pasar el max-height y se come ~15px--,
// el contenido ya no entraba. Medido: con el menu forzado a 250px daba scrollWidth 300 contra
// clientWidth 248.
//
// El diseño de los items (.article-dropdown-option y sus variantes) y el de los encabezados de
// seccion tambien viven ahi: estaban declarados DOS veces, aca y en el <style> no scoped de
// common-vue/.../opciones-filtrados-seleccion/Index.vue, con los mismos valores escritos a mano.

.article-selected-options-dropdown

	padding: 4px 0

</style>

