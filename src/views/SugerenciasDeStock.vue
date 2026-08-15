<template>
	<div>
		<sugerencias-de-stock></sugerencias-de-stock>
	</div>
</template>
<script>
/*
	Vista propia del modulo de sugerencias inteligentes de stock (extension
	'sugerencias_inteligentes'). Reemplaza a los modales apilados del Listado
	para quien tiene la extension; el flujo viejo sigue intacto para el resto.
*/
export default {
	components: {
		SugerenciasDeStock: () => import('@/components/sugerencias-de-stock/Index'),
	}
}
</script>
