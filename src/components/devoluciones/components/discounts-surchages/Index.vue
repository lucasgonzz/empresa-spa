<template>
	<div>
		<b-row
		v-if="sale"
		class="m-t-15">
			<b-col
			md="6">
				
				<discounts></discounts>	
			</b-col>
			<b-col
			md="6">
				
				<surchages></surchages>	
			</b-col>
		</b-row>
	</div>
</template>
<script>
export default {
	components: {
		Discounts: () => import('@/components/devoluciones/components/discounts-surchages/Discounts'),
		Surchages: () => import('@/components/devoluciones/components/discounts-surchages/Surchages'),
	},
	computed: {
		sale() {
			return this.$store.state.devoluciones.sale
		},
	}
}
</script>