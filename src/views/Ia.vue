<template>
	<div>
		<ia></ia>
	</div>
</template>
<script>
/*
	Vista del módulo IA: el mostrador (misión "modulo-ia-mostrador", 14/9/2026).
	Mismo patrón que el resto de las vistas del sistema: solo monta el componente
	real, que vive en components/ia/Index.vue. La ruta es /ia/:id? (router/index.js)
	y el :id opcional lo lee el componente para abrir ese informe de entrada.
*/
export default {
	components: {
		Ia: () => import('@/components/ia/Index'),
	}
}
</script>
