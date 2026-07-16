<template>
	<b-modal
	hide-footer
	size="xl"
	title="Inventario"
	id="inventory-performance"
	@show="get_inventory_performance_models">

		<!-- Fecha de calculo del reporte vigente: con reportes que pueden tener minutos de antiguedad,
		aclarar cuando se calculo evita que "el inventario no coincide con el listado" sea un ticket
		de soporte recurrente. -->
		<p
		v-if="inventory_performance"
		class="text-muted m-b-10">
			Calculado el {{ date(inventory_performance.created_at) }} a las {{ hour(inventory_performance.created_at) }}
		</p>

		<!-- Aviso de regeneracion en background: el reporte vigente sigue siendo util mientras se recalcula -->
		<div
		v-if="inventory_performance && inventory_performance_generating"
		class="text-with-icon m-b-15">
			Estamos actualizando el reporte de inventario. Los datos de abajo van a refrescarse solos apenas termine.
			<i class="icon-refresh"></i>
		</div>

		<!-- Sin reporte todavia: mostrar "0 articulos / $0 en costos" seria informacion falsa, no vacia -->
		<div
		v-if="!inventory_performance"
		class="text-with-icon m-t-15">
			Estamos calculando el reporte de inventario. Los datos van a aparecer solos en unos minutos.
			<i class="icon-eye-slash"></i>
		</div>

		<b-row
		v-else
		class="m-t-15">
			<b-col
			class="m-b-25 m-b-xl-0"
			md="6"
			xl="3">

				<inventario-stockeado></inventario-stockeado>
			</b-col>

			<b-col
			class="m-b-25 m-b-xl-0"
			md="6"
			xl="3">

				<valor-del-inventario></valor-del-inventario>
			</b-col>

			<b-col
			class="m-b-25 m-b-xl-0"
			md="6"
			xl="3">

				<costos-articulos></costos-articulos>
			</b-col>

			<b-col
			class="m-b-25 m-b-xl-0"
			md="6"
			xl="3">
				<estado-del-stock></estado-del-stock>
			</b-col>

		</b-row>
	</b-modal>
</template>
<script>
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [inventory_performance],
	components: {
		InventarioStockeado: () => import('@/components/listado/modals/inventory-performance/InventarioStockeado'),
		ValorDelInventario: () => import('@/components/listado/modals/inventory-performance/ValorDelInventario'),
		CostosArticulos: () => import('@/components/listado/modals/inventory-performance/CostosArticulos'),
		EstadoDelStock: () => import('@/components/listado/modals/inventory-performance/EstadoDelStock'),
	},
}
</script>