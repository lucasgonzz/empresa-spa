<template>
	<div
	class="total-a-repartir-wrapper">
		<!--
			Son dos <p> y no uno con el testid enlazado, a proposito: e2e/cobertura-de-descripciones.js solo
			reconoce los testids escritos como literal en la plantilla, y con uno solo la ayuda de Vender
			quedaria como huerfana. Vender, que no pasa la prop `testid`, usa el primero, con el literal de siempre.
		-->
		<p
		v-if="!testid"
		class="total-a-repartir"
		data-testid="multipago-total-a-repartir"
		:data-monto="total_a_repartir">
			Total a repartir: <strong>{{ price(total_a_repartir) }}</strong>
		</p>
		<p
		v-else
		class="total-a-repartir"
		:data-testid="testid"
		:data-monto="total_a_repartir">
			Total a repartir: <strong>{{ price(total_a_repartir) }}</strong>
		</p>

		<p 
		:class="total_repartido == total_a_repartir ? 'text-success' : ''"
		class="total-a-repartir">
			Total repartido: {{ price(total_repartido) }}
		</p>

		<p 
		:class="total_repartido == total_a_repartir ? 'text-success' : 'text-danger'"
		class="total-a-repartir">
			Sobrante para repartir: <strong>{{price(sobrante_a_repartir)}}</strong>
		</p>
	</div>
</template>
<script>
export default {
	props: {
		total_a_repartir: Number,
		total_repartido: Number,
		sobrante_a_repartir: Number,
		/**
		 * data-testid del importe "Total a repartir".
		 *
		 * OJO: es una prop porque la ayuda de controles (src/descripciones/) se indexa por
		 * data-testid y cada pantalla que reusa este bloque necesita su propia entrada. La de
		 * Vender (`multipago-total-a-repartir`) dice que el total es "SIN el descuento del método
		 * que se quitó al abrir el reparto", y en el pago de una cuenta corriente eso es falso:
		 * con el testid fijo, ese modal mostraría la ayuda equivocada.
		 *
		 * Sin esta prop queda el testid de Vender: así Vender no cambia y
		 * e2e/helpers/vender.js lo sigue leyendo tal cual. Ese valor por defecto está escrito como
		 * literal en la plantilla y no como default de la prop, a propósito (ver el comentario de arriba).
		 */
		testid: {
			type: String,
			default: null,
		},
	},
}
</script>
<style lang="sass">
.total-a-repartir-wrapper
	p
		font-size: 20px !important
</style>