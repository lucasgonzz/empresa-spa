<template>
	<!--
		Indicador de carga del desglose del precio.

		El modal se abre ANTES de pedirle el calculo al servidor (ese es el arreglo de esta mision:
		antes se quedaba la pantalla quieta hasta que llegaba la respuesta, sin ninguna señal). Esto
		es lo que se ve mientras tanto.

		🔴 No se usa common-vue/components/LogoLoading.vue: es un overlay `position: fixed` con
		z-index 10000 atado a $store.state.auth.loading. Metido adentro de un modal taparia la
		pantalla entera, y su estado es global. Lo que se copio de aquel archivo es el doble anillo
		--los mismos tiempos, el mismo cubic-bezier, el mismo sentido invertido del anillo interno--,
		que vive en _desglose_precio.sass.
	-->
	<div class="desglose-cargando">
		<div
		class="desglose-spinner"
		role="status"
		aria-live="polite"
		aria-busy="true">
			<span class="desglose-spinner__anillo"></span>
			<span class="desglose-spinner__anillo desglose-spinner__anillo--interno"></span>
		</div>
		<p class="desglose-cargando__texto">
			Calculando el precio...
		</p>
	</div>
</template>
<script>
export default {
	name: 'CargandoDesglose',
}
</script>
