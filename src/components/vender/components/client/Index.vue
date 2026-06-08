<template>
	<!--
		Tab legacy de cliente. Mantiene compatibilidad con el flujo anterior.
		Los subcomponentes ahora viven en stage-1/ y stage-3/.
	-->
	<b-row
	v-if="view.includes('cliente')">
		<b-col
		cols="12"
		md="8"
		lg="10"
		class="vender-client-section">

			<total-previus-sales></total-previus-sales>

			<select-client></select-client>

			<div class="vender-stage__client-options">
				<div class="vender-stage__client-options-col">
					<alertar-personalizado></alertar-personalizado>
				</div>
				<div class="vender-stage__client-options-col vender-stage__client-options-col--stack">
					<omitir-en-cuenta-corriente></omitir-en-cuenta-corriente>
					<guardar-como-presupuesto></guardar-como-presupuesto>
				</div>
			</div>

			<div class="vender-stage__client-panels">
				<discounts></discounts>
				<surchages></surchages>
			</div>

			<nota-credito></nota-credito>
		</b-col>
	</b-row>
</template>
<script>
import TotalPreviusSales from '@/components/vender/components/remito/total-previus-sales/Index.vue'
/* Subcomponentes del cliente ahora organizados por stage */
import SelectClient from '@/components/vender/components/stage-1/SelectClient'
import AlertarPersonalizado from '@/components/vender/components/stage-1/AlertarPersonalizado'
import OmitirEnCuentaCorriente from '@/components/vender/components/stage-1/OmitirEnCuentaCorriente'
import GuardarComoPresupuesto from '@/components/vender/components/stage-1/GuardarComoPresupuesto'
import Discounts from '@/components/vender/components/stage-3/Discounts'
import Surchages from '@/components/vender/components/stage-3/Surchages'
import NotaCredito from '@/components/vender/components/stage-3/NotaCredito'
export default {
	components: {
		TotalPreviusSales,
		SelectClient,
		AlertarPersonalizado,
		OmitirEnCuentaCorriente,
		GuardarComoPresupuesto,
		Discounts,
		Surchages,
		NotaCredito,
	},
}
</script>
<style lang="sass">
@import '@/components/vender/sass/_vender-client-block'

/* Contenedor legacy del tab cliente con espaciado uniforme entre bloques */
.vender-client-section
	display: flex
	flex-direction: column
	gap: 10px
</style>
