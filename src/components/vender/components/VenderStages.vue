<template>
	<!--
		Contenedor de las 3 etapas del wizard de venta.
		Delega el contenido de cada etapa a VenderStage1, VenderStage2 y VenderStage3.
	-->
	<div class="vender-stages">

		<vender-stage1></vender-stage1>

		<vender-stage2></vender-stage2>

		<vender-stage3></vender-stage3>

	</div>
</template>

<script>
export default {
	name: 'VenderStages',
	components: {
		VenderStage1: () => import('@/components/vender/components/stage-1/Index'),
		VenderStage2: () => import('@/components/vender/components/stage-2/Index'),
		VenderStage3: () => import('@/components/vender/components/stage-3/Index'),
	},
}
</script>

<style lang="sass">
@import '@/components/vender/sass/_vender-stages'
@import '@/components/vender/sass/_vender-client-block'
</style>
