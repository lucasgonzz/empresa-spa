<template>
	<!--
		Fila de totales del reporte de inventario (mision 31, 11/8/2026).

		Antes era una de las cuatro tarjetas, con el mismo peso visual que las otras tres y sus
		numeros en el mismo cuerpo que las etiquetas. El valor del inventario es EL numero del
		reporte, asi que pasa a encabezarlo, en el vocabulario de chip que ya definio
		caja/components/horizontal-nav-center/Total.vue: icono, etiqueta chica en mayusculas y
		valor grande.

		La cantidad de articulos viaja aca --y no dentro de la tarjeta de stock, donde estaba--
		porque es el denominador de todo lo que se muestra abajo: sin el, "780 stockeados" no
		dice nada.
	-->
	<div
	v-if="model"
	class="inventario-totales">

		<div class="inventario-chip">
			<div class="inventario-chip__icon inventario-chip__icon--costos">
				<i class="bi bi-cash-stack" aria-hidden="true"></i>
			</div>
			<div class="inventario-chip__body">
				<span class="inventario-chip__label">Valor en costos</span>
				<span class="inventario-chip__value">{{ price(model.valor_inventario_en_costos) }}</span>
			</div>
		</div>

		<div class="inventario-chip">
			<div class="inventario-chip__icon inventario-chip__icon--precios">
				<i class="bi bi-tags" aria-hidden="true"></i>
			</div>
			<div class="inventario-chip__body">
				<span class="inventario-chip__label">Valor en precios</span>
				<span class="inventario-chip__value">{{ price(model.valor_inventario_en_precios) }}</span>
			</div>
		</div>

		<div class="inventario-chip">
			<div class="inventario-chip__icon inventario-chip__icon--articulos">
				<i class="bi bi-box-seam" aria-hidden="true"></i>
			</div>
			<div class="inventario-chip__body">
				<span class="inventario-chip__label">Cantidad de artículos</span>
				<span class="inventario-chip__value">{{ numero_es(model.cantidad_articulos) }}</span>
			</div>
		</div>

	</div>
</template>
<script>
import inventory_performance from '@/mixins/inventory_performance'
export default {
	mixins: [inventory_performance],
	computed: {
		/**
		 * Reporte de inventario vigente. Pasa a leerse por el mixin comun, igual que los otros
		 * tres bloques: antes este componente iba directo a `models[0]` del store y se salteaba
		 * el filtrado de los `null` que el backend manda cuando el owner todavia no tiene
		 * reporte generado.
		 */
		model() {
			return this.inventory_performance
		},
	},
}
</script>
