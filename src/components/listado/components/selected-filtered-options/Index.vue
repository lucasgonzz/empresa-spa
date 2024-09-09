<template>
	<div>
		
		<article-ticket-option-drop-down></article-ticket-option-drop-down>
		
		<articles-pdf-option-drop-down></articles-pdf-option-drop-down>

		<articles-bar-code-pdf></articles-bar-code-pdf>
		
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
		ResetStockOptionDropDown: () => import('@/components/listado/components/selected-filtered-options/ResetStockOptionDropDown'),
		SeleccionEspecial: () => import('@/components/listado/components/selected-filtered-options/SeleccionEspecial'),
		ExcelExport: () => import('@/components/listado/components/selected-filtered-options/ExcelExport'),
		ConfirmResetStock: () => import('@/components/listado/modals/ConfirmResetStock'),
	}
}
</script>