<template>
	<previus-days
	v-if="show_previus_sales"
	model_name="sale"
	model_name_spanish="Ventas"
	clear_selected></previus-days>
</template>
<script>
import PreviusDays from '@/components/common/previus-days/Index'
export default {
	components: {
		PreviusDays,
	},
	computed: {
		show_previus_sales() {
			if (this.hasExtencion('sales.hide')) {
				return this.$route.name == 'VentasAll'
			} 
			return true
		}
	}
}
</script>