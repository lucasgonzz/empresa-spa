<template>
	<div>
		<div
		v-if="view == 'facturacion'">

    		<list-sales></list-sales>

		</div>
	</div>

</template>
<script>
/*
	Este contenedor solo decide CUANDO se muestra la seccion (view == 'facturacion'): la tabla,
	sus columnas y sus items viven en ListSales. Tenia una copia entera de fields/items/showSale
	que ningun template usaba (y con los mismos dos defectos de celdas que se arreglaron alla);
	se elimino en la exploracion de Alertas del 3/9/2026 para que nadie la edite creyendo que es
	la tabla real.
*/
export default {
	components: {
		ListSales: () => import('@/components/alertas/components/lista-de-alertas-table/problemas-al-facturar/ListSales'),
	},
}
</script>