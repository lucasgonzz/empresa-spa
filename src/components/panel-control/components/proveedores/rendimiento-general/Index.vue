<template>
	<div
	v-if="sub_view == 'rendimiento-general'">

		<h2
		class="m-t-15">
			Periodo desde un año atras
		</h2>

		<total-vendido-y-rentabilidad></total-vendido-y-rentabilidad>

		<rentabilidad></rentabilidad>

		<acreedores></acreedores>
		
		<!-- <div class="chart-card">
			<h4>Unidades vendidas de cada proveedor</h4>
			<unidades-vendidas></unidades-vendidas>
		</div> -->
	</div>
</template>
<script>
export default {
	components: { 
		TotalVendidoYRentabilidad: () => import('@/components/panel-control/components/proveedores/rendimiento-general/total-vendido-rentabilidad/Index'),
		Rentabilidad: () => import('@/components/panel-control/components/proveedores/rendimiento-general/rentabilidad/Index'),
		Acreedores: () => import('@/components/panel-control/components/proveedores/rendimiento-general/acreedores/Index'),
		UnidadesVendidas: () => import('@/components/panel-control/components/proveedores/rendimiento-general/UnidadesVendidas'),
	}
}
</script>