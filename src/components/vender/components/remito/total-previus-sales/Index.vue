<template>
<b-row
class="row-total-card-previus-sales m-b-15 j-start">
	<total></total>	

	<previus-sales></previus-sales>
	
	<check-sale></check-sale>	
	<advertencia-guardar-como-presupuesto></advertencia-guardar-como-presupuesto>	
</b-row>
</template>
<script>
export default {
	name: 'TotalPreviusSales',
	components: {
		Total: () => import('@/components/vender/components/remito/total-previus-sales/Total.vue'),
		CheckSale: () => import('@/components/vender/components/remito/total-previus-sales/CheckSale.vue'),
		PreviusSales: () => import('@/components/vender/components/remito/total-previus-sales/PreviusSales.vue'),
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
