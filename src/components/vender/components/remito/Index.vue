<template>
<div
v-if="view == 'remito'">
	<header-form></header-form>
	<total-previus-sales></total-previus-sales>
	<header-2></header-2>
	<previus-sale-data></previus-sale-data>

	<observations></observations>


	<articles-table></articles-table>
</div>
</template>
<script>
import HeaderForm from '@/components/vender/components/remito/header-form/Index.vue'
import TotalPreviusSales from '@/components/vender/components/remito/total-previus-sales/Index.vue'
import Header2 from '@/components/vender/components/remito/header-2/Index'
import ArticlesTable from '@/components/vender/components/remito/ArticlesTable.vue'
import PreviusSaleData from '@/components/vender/components/remito/PreviusSaleData.vue'
import Observations from '@/components/vender/components/remito/Observations'
export default {
	components: {
		HeaderForm,
		TotalPreviusSales,
		Header2,
		ArticlesTable, 	
		PreviusSaleData, 
		Observations,
	}
}
</script>