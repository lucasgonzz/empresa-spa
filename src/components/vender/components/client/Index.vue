<template>
	<b-row
	v-if="view.includes('cliente')">
		<b-col
		cols="12"
		md="8">

			<total-previus-sales></total-previus-sales>

			<select-client></select-client>

			<!-- <observations></observations> -->

			<discounts></discounts>	

			<surchages></surchages>	

			<nota-credito></nota-credito>

			<!-- <current-acount></current-acount> -->
		</b-col>
	</b-row>
</template>
<script>
import TotalPreviusSales from '@/components/vender/components/remito/total-previus-sales/Index.vue'
import SelectClient from '@/components/vender/components/client/SelectClient'
// import Observations from '@/components/vender/components/client/Observations'
import Discounts from '@/components/vender/components/client/Discounts'
import Surchages from '@/components/vender/components/client/Surchages'
import NotaCredito from '@/components/vender/components/client/NotaCredito'
import CurrentAcount from '@/components/vender/components/client/CurrentAcount'
export default {
	components: {
		TotalPreviusSales,
		SelectClient,
		// Observations,
		Discounts,
		Surchages,
		NotaCredito,
		CurrentAcount,
	},
}
</script>