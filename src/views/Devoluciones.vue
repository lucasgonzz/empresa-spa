<template>
	<div>
		<nav-component></nav-component>

		<sale-info></sale-info>

		<discounts-surchages></discounts-surchages>

		<hr>

		<articles-search></articles-search>

		<articles-table></articles-table>

		<descriptions></descriptions>

		<options></options>

		<btn-guardar></btn-guardar>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/devoluciones/components/nav/Index'),
		SaleInfo: () => import('@/components/devoluciones/components/sale-info/Index'),
		DiscountsSurchages: () => import('@/components/devoluciones/components/discounts-surchages/Index'),
		ArticlesSearch: () => import('@/components/devoluciones/components/articles-search/Index'),
		ArticlesTable: () => import('@/components/devoluciones/components/articles-table/Index'),
		Descriptions: () => import('@/components/devoluciones/components/descriptions/Index'),
		Options: () => import('@/components/devoluciones/components/options/Index'),
		BtnGuardar: () => import('@/components/devoluciones/components/BtnGuardar'),
	}
}
</script>