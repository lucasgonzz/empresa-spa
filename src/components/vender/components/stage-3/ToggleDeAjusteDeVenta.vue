<template>
	<!--
		Una fila de descuento o recargo de venta en VENDER (etapa 3), con todo lo que la fila
		muestra: nombre y porcentaje, "(actualmente eliminado)", "(X% en este momento)" y la
		explicación de cómo pasar al valor actual.

		Existe para que el grupo "Del cliente" y el grupo "Comunes"/"Disponibles" dibujen la fila
		EXACTAMENTE igual (misión descuentos-recargos-por-cliente, 23/9/2026): si cada grupo tuviera
		su propio markup, un descuento borrado o con el porcentaje cambiado dejaría de avisarlo en
		cuanto pasa a ser del cliente, que es justo cuando más se usa.
	-->
	<vender-toggle
	:input_id="input_id"
	mode="array"
	:option_value="ajuste.id"
	:disabled="disabled"
	row_class="vender-toggle-row--multiline"
	:value="value"
	@input="$emit('input', $event)">

		<div
		class="vender-client-block__item-detail"
		:id="id_prefix+ajuste.id">
			{{ ajuste.name }} {{ porcentaje_es(ajuste.percentage) }}%

			<span
			v-if="ajuste.deleted_at">
				(actualmente eliminado)
			</span>

			<span
			v-else-if="ajuste.updated_percentage">
				({{ porcentaje_es(ajuste.updated_percentage) }}% en este momento)
			</span>

			<p
			class="text-muted"
			v-if="!ajuste.deleted_at && ajuste.updated_percentage">
				En caso de querer usar el valor actual del {{ tipo }} ({{ porcentaje_es(ajuste.updated_percentage) }}%), desmarcar para quitar el {{ tipo }}, guardar la venta sin el {{ tipo }}, y editar la venta para agregarle el {{ tipo }} con el valor actualizado.
			</p>
		</div>
	</vender-toggle>
</template>
<script>
import VenderToggle from '@/components/vender/components/VenderToggle'
export default {
	name: 'ToggleDeAjusteDeVenta',
	components: {
		VenderToggle,
	},
	props: {
		/* El descuento o recargo del store (`discount` / `surchage`). */
		ajuste: {
			type: Object,
			required: true,
		},
		/* 'descuento' o 'recargo': solo para el texto de ayuda. */
		tipo: {
			type: String,
			default: 'descuento',
		},
		/* v-model: los ids prendidos en la venta (`vender.discounts_id` / `surchages_id`). */
		value: {
			type: Array,
			default: function () {
				return []
			},
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		/* Id del input, el que usan los specs (`venta-descuento-3`). Vacío = autogenerado. */
		input_id: {
			type: String,
			default: '',
		},
		/* Prefijo del id del detalle (`discount_` / `surchage_`), como estaba en cada panel. */
		id_prefix: {
			type: String,
			default: 'discount_',
		},
	},
}
</script>
