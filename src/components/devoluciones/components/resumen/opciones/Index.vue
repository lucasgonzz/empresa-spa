<template>
	<!--
		Opciones de la nota de crédito, todas como toggle estilo iPhone.
		- Venta: regresar stock (+ depósito), cuenta corriente del cliente, actualizar unidades
			devueltas en la venta, facturar con ARCA sobre cada factura con CAE.
		- Compra: descontar del stock (+ depósito) y cuenta corriente del proveedor. Sin ARCA, sin
			descuentos/recargos y sin "actualizar unidades devueltas" (plan §4.3).
	-->
	<div class="dev-opciones">
		<p class="dev-opciones__titulo">Opciones</p>

		<stock></stock>

		<cuenta-corriente></cuenta-corriente>

		<actualizar-unidades
		v-if="!es_compra"></actualizar-unidades>

		<facturar
		v-if="!es_compra"></facturar>
	</div>
</template>
<script>
export default {
	components: {
		Stock: () => import('@/components/devoluciones/components/resumen/opciones/Stock'),
		CuentaCorriente: () => import('@/components/devoluciones/components/resumen/opciones/CuentaCorriente'),
		ActualizarUnidades: () => import('@/components/devoluciones/components/resumen/opciones/ActualizarUnidades'),
		Facturar: () => import('@/components/devoluciones/components/resumen/opciones/Facturar'),
	},
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-opciones
		display: flex
		flex-direction: column
		gap: 16px

	.dev-opciones__titulo
		margin: 0
		font-size: 0.8125rem
		font-weight: 600
		color: var(--color-text-secondary)

	// Select de depósito debajo de su toggle, alineado con el texto (no con la pista).
	.dev-opciones__sub
		margin-top: 10px
		padding-left: 58px
</style>
