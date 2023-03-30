<template>
	<b-row
	v-if="view.includes('cliente')">
		<b-col
		cols="12"
		md="8">
			<select-client></select-client>

			<discounts></discounts>	

			<surchages></surchages>	

			<nota-credito></nota-credito>

			<!-- <current-acount></current-acount> -->
		</b-col>
	</b-row>
</template>
<script>
import SelectClient from '@/components/vender/components/client/SelectClient'
import Discounts from '@/components/vender/components/client/Discounts'
import Surchages from '@/components/vender/components/client/Surchages'
import NotaCredito from '@/components/vender/components/client/NotaCredito'
import CurrentAcount from '@/components/vender/components/client/CurrentAcount'
export default {
	components: {
		SelectClient,
		Discounts,
		Surchages,
		NotaCredito,
		CurrentAcount,
	},
}
</script>