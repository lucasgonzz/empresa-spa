<template>
	<div
	v-if="items.length">

		<hr>

		<regresar-stock></regresar-stock>

		<generar-current-acount></generar-current-acount>

		<facturar></facturar>

	</div>
</template>
<script>
export default {
	components: {
		RegresarStock: () => import('@/components/devoluciones/components/options/RegresarStock'),
		GenerarCurrentAcount: () => import('@/components/devoluciones/components/options/GenerarCurrentAcount'),
		Facturar: () => import('@/components/devoluciones/components/options/Facturar'),
	},
	computed: {
		items() {
			return this.$store.state.devoluciones.items
		},
	}
}
</script>