<template>
<b-row
class="row-total-card-previus-sales m-b-15">
	<total></total>	
	<previus-sales></previus-sales>
</b-row>
</template>
<script>
export default {
	name: 'TotalPreviusSales',
	components: {
		Total: () => import('@/components/vender/components/remito/total-previus-sales/Total.vue'),
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