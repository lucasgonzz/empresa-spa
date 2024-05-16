<template>
	<b-row
	v-if="view.includes('cliente')">
		<b-col
		cols="12"
		md="8"
		lg="10">

			<total-previus-sales></total-previus-sales>

			<select-client></select-client>

			<buscar-por-cuit></buscar-por-cuit>

			<omitir-en-cuenta-corriente></omitir-en-cuenta-corriente>

			<guardar-como-presupuesto></guardar-como-presupuesto>

			<discounts></discounts>	

			<surchages></surchages>	

			<nota-credito></nota-credito>
		</b-col>
	</b-row>
</template>
<script>
import TotalPreviusSales from '@/components/vender/components/remito/total-previus-sales/Index.vue'
import SelectClient from '@/components/vender/components/client/SelectClient'
import BuscarPorCuit from '@/components/vender/components/client/buscar-por-cuit/Index'
import OmitirEnCuentaCorriente from '@/components/vender/components/client/OmitirEnCuentaCorriente'
import GuardarComoPresupuesto from '@/components/vender/components/client/GuardarComoPresupuesto'
import Discounts from '@/components/vender/components/client/Discounts'
import Surchages from '@/components/vender/components/client/Surchages'
import NotaCredito from '@/components/vender/components/client/NotaCredito'
export default {
	components: {
		TotalPreviusSales,
		SelectClient,
		BuscarPorCuit,
		OmitirEnCuentaCorriente,
		GuardarComoPresupuesto,
		Discounts,
		Surchages,
		NotaCredito,
	},
}
</script>