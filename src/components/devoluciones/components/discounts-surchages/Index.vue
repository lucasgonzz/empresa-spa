<template>
	<b-row
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
</template>
<script>
export default {
	components: {
		Discounts: () => import('@/components/devoluciones/components/discounts-surchages/Discounts'),
		Surchages: () => import('@/components/devoluciones/components/discounts-surchages/Surchages'),
	}
}
</script>