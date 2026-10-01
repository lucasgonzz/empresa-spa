<template>
	<!--
		"Marcar todo como devuelto": cada renglón con la cantidad completa del comprobante. Botón
		secundario en el encabezado de la tarjeta Artículos (antes era verde y suelto en la barra).
		El testid de venta (`devolucion-btn-marcar-todo`) es el de siempre.
	-->
	<b-button
	class="dev-btn-secundario"
	variant="light"
	:data-testid="es_compra ? 'devolucion-compra-btn-marcar-todo' : 'devolucion-btn-marcar-todo'"
	@click="marcar_todo">
		<i class="bi bi-check2-all"></i>
		Marcar todo como devuelto
	</b-button>
</template>
<script>
import set_total from '@/mixins/devoluciones/set_total'
export default {
	mixins: [set_total],
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
	},
	methods: {
		/**
		 * Pone en cada renglón la cantidad devuelta igual a la cantidad original (vendida o
		 * comprada) y recalcula el total. La cantidad devuelta es ACUMULADA (incluye lo ya
		 * devuelto antes), así que lo que se devuelve ahora es lo que faltaba.
		 */
		marcar_todo() {
			this.items.forEach(article => {
				article.returned_amount = article.amount

				let faltantes = article.amount
				if (article.ya_devueltas) {
					faltantes -= Number(article.ya_devueltas)
				}
				if (faltantes > 0) {
					article.unidades_devueltas = faltantes
				}
			})

			this.set_total_devolucion()
		},
	},
}
</script>
