<template>
	<devoluciones></devoluciones>
</template>
<script>
/*
	Vista de /devoluciones. Todo el módulo vive en components/devoluciones/Index.vue (rediseño de
	la misión devoluciones-compras-y-rediseno, 1/10/2026).
*/
export default {
	components: {
		Devoluciones: () => import('@/components/devoluciones/Index'),
	},
}
</script>
