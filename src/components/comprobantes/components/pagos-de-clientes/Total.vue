<template>
	<!--
		Total de los pagos de clientes visibles (misión 34, 12/8/2026).

		Era un `<h3>` con "Total: $X" centrado por el layout que lo contenía. Ahora usa el mismo chip
		que el bloque de totales de Ventas y que el módulo de Cajas: ícono en celda, etiqueta chica
		arriba, valor grande abajo.

		🔴 Las clases son las COMPARTIDAS (`totales-chip*`, declaradas en src/sass/_chips_totales.sass),
		no una copia de sus valores. Ese partial nació en esta misión justamente para que no hubiera
		una tercera declaración del mismo chip: acá se usa, no se redefine.
	-->
	<div class="pagos-total">
		<div class="totales-chip totales-chip--principal">
			<div class="totales-chip__icon-wrap">
				<i
				class="bi bi-cash-coin"
				aria-hidden="true"></i>
			</div>
			<div class="totales-chip__body">
				<span class="totales-chip__label">Total</span>
				<span class="totales-chip__value">{{ total }}</span>
			</div>
		</div>
	</div>
</template>
<script>
import mixin from '@/mixins/comprobantes/pagos_de_clientes'
export default {
	mixins: [mixin],
	computed: {
		total() {
			let total = 0

			this.models_to_show.forEach(pago => {
				total += Number(pago.haber)
			})

			return this.price(total)
		}
	}
}
</script>
<style lang="sass">
// Lo único propio de este bloque: que el chip quede contra el margen izquierdo de su fila, que es lo
// que pidió Lucas. El `<h3>` anterior heredaba el centrado de lo que lo contenía.
.pagos-total
	display: flex
	justify-content: flex-start
	margin-bottom: 15px
</style>
