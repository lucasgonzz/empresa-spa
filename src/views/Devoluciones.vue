<template>
	<div>
		<nav-component></nav-component>

		<sale-info></sale-info>

		<hr>

		<articles-search></articles-search>

		<articles-table></articles-table>

		<options></options>

		<btn-guardar></btn-guardar>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/devoluciones/components/nav/Index'),
		SaleInfo: () => import('@/components/devoluciones/components/sale-info/Index'),
		ArticlesSearch: () => import('@/components/devoluciones/components/articles-search/Index'),
		ArticlesTable: () => import('@/components/devoluciones/components/articles-table/Index'),
		Options: () => import('@/components/devoluciones/components/options/Index'),
		BtnGuardar: () => import('@/components/devoluciones/components/BtnGuardar'),
	}
}
</script>