<template>
	<div>
		<sugerencias-de-compra></sugerencias-de-compra>
	</div>
</template>
<script>
/*
	Vista propia del modulo de sugerencias de compra a proveedores (extension
	'sugerencias_compras'). Mismo patron que views/SugerenciasDeStock.vue: la
	vista solo monta el componente real.
*/
export default {
	components: {
		SugerenciasDeCompra: () => import('@/components/sugerencias-de-compra/Index'),
	}
}
</script>
