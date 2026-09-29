<template>
	<!--
		Contenedor de las 3 etapas del wizard de venta.
		Delega el contenido de cada etapa a VenderStage1, VenderStage2 y VenderStage3.
	-->
	<div class="vender-stages">

		<vender-stage1></vender-stage1>

		<vender-stage2></vender-stage2>

		<vender-stage3></vender-stage3>

		<!--
			Los campos del diseño de Vender que no monta ninguna etapa (sacados, o en una etapa que no
			se dibuja), montados escondidos: el porque esta en ReservaDeElementos.vue. Va UNA sola vez
			y despues de las etapas; no ocupa lugar (display: none).
		-->
		<reserva-de-elementos></reserva-de-elementos>

	</div>
</template>

<script>
import ReservaDeElementos from '@/components/vender/layout/ReservaDeElementos'

export default {
	name: 'VenderStages',
	components: {
		VenderStage1: () => import('@/components/vender/components/stage-1/Index'),
		VenderStage2: () => import('@/components/vender/components/stage-2/Index'),
		VenderStage3: () => import('@/components/vender/components/stage-3/Index'),
		/* Sincronico a proposito: tiene que estar montada desde el primer render de Vender */
		ReservaDeElementos,
	},
}
</script>

<style lang="sass">
@import '@/components/vender/sass/_vender-stages'
@import '@/components/vender/sass/_vender-client-block'
</style>
