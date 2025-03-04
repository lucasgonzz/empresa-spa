<template>
	<div
	v-if="articles.length"
	class="m-t-25 sale-info">
		
		<total></total>

		<discounts></discounts>		
	</div>
</template>
<script>
export default {
	components: {
		Total: () => import('@/components/devoluciones/components/sale-info/Total'),
		Discounts: () => import('@/components/devoluciones/components/sale-info/Discounts'),
	},
	computed: {
		articles() {
			return this.$store.state.devoluciones.articles
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