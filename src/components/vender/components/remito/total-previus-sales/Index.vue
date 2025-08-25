<template>
<b-row
class="row-total-card-previus-sales m-b-15 j-start">
	<total></total>	
	<btn-guardar></btn-guardar>	

	<check-sale></check-sale>	
	<advertencia-guardar-como-presupuesto></advertencia-guardar-como-presupuesto>	
</b-row>
</template>
<script>
export default {
	name: 'TotalPreviusSales',
	components: {
		Total: () => import('@/components/vender/components/remito/total-previus-sales/Total.vue'),
		BtnGuardar: () => import('@/components/vender/components/remito/total-previus-sales/BtnGuardar'),
		CheckSale: () => import('@/components/vender/components/remito/total-previus-sales/CheckSale.vue'),
		AdvertenciaGuardarComoPresupuesto: () => import('@/components/vender/components/remito/total-previus-sales/AdvertenciaGuardarComoPresupuesto.vue'),
	},
	data() {
		return {
		}
	},
	computed: {
	},
}
</script>
