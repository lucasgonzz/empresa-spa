<template>
<b-row
class="row-total-card-previus-sales m-b-15 j-start">
	<total></total>	
	<previus-sales></previus-sales>
	<check-sale></check-sale>	
</b-row>
</template>
<script>
export default {
	name: 'TotalPreviusSales',
	components: {
		Total: () => import('@/components/vender/components/remito/total-previus-sales/Total.vue'),
		CheckSale: () => import('@/components/vender/components/remito/total-previus-sales/CheckSale.vue'),
		PreviusSales: () => import('@/components/vender/components/remito/total-previus-sales/PreviusSales.vue'),
	},
	data() {
		return {
		}
	},
	computed: {
	},
}
</script>
