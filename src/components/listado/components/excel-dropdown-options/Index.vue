<template>
	<div>
		<!-- <excel-para-clientes></excel-para-clientes> -->
		<excel-price-types></excel-price-types>
		<articles-pre-imports></articles-pre-imports>
	</div>
</template>
<script>
export default {
	components: {
		// ExcelParaClientes: () => import('@/components/listado/components/excel-dropdown-options/ExcelParaClientes'),
		ExcelPriceTypes: () => import('@/components/listado/components/excel-dropdown-options/ExcelPriceTypes'),
		ArticlesPreImports: () => import('@/components/listado/components/excel-dropdown-options/ArticlesPreImports'),
	}
}
</script>