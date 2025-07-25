<template>
	<div
	v-if="items.length"
	class="m-t-25 sale-info">
		
		<total></total>

		<!-- <discounts></discounts>		 -->
	</div>
</template>
<script>
export default {
	components: {
		Total: () => import('@/components/devoluciones/components/sale-info/Total'),
		Discounts: () => import('@/components/devoluciones/components/sale-info/Discounts'),
	},
	computed: {
		items() {
			return this.$store.state.devoluciones.items
		}
	}
}
</script>
<style lang="sass">
.sale-info 
	p  
		margin: 0
		font-size: 20px
		font-weight: bold
</style>