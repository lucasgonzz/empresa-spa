<template>
	<b-card
	v-if="client && !guardar_como_presupuesto"
	class="m-b-25 m-t-25 b-r-1 shadow">

		<b-form-group
		label-for="dias_alerta_venta_no_cobrada_personalizado"
		:label="'Alerta de cobro de esta venta (opcional)'">
			<b-form-input
			id="dias_alerta_venta_no_cobrada_personalizado"
			type="number"
			min="0"
			step="1"
			placeholder="Vacío = usar días configurados para tu usuario"
			:value="dias_alerta_display"
			@input="on_input_dias_alerta">
			</b-form-input>
			<small
			class="text-muted d-block m-t-10">
				Si no completás el campo, las alertas de ventas sin cobrar usan los días definidos en la configuración del negocio o empleado.
				Si indicás un número, esta venta pasará a las alertas cuando lleve esos días sin estar cobrada (según cuenta corriente).
			</small>
		</b-form-group>

	</b-card>
</template>
<script>
/**
 * Permite fijar un umbral de días solo para la venta en curso (alertas de cobro pendiente).
 * Vacío en el input persiste null en backend y mantiene la lógica global de `ventas_sin_cobrar`.
 */
export default {
	computed: {
		/**
		 * Cliente seleccionado en vender.
		 */
		client() {
			return this.$store.state.vender.client
		},
		/**
		 * Evita mostrar el bloque al armar presupuesto en lugar de venta.
		 */
		guardar_como_presupuesto() {
			return this.$store.state.vender.guardar_como_presupuesto
		},
		/**
		 * Texto del input: vacío si el store tiene null (usa reglas globales).
		 */
		dias_alerta_display() {
			const raw = this.$store.state.vender.dias_alerta_venta_no_cobrada_personalizado
			if (raw === null || raw === undefined) {
				return ''
			}
			return String(raw)
		},
	},
	methods: {
		/**
		 * Sincroniza el valor del input con el store; cadenas vacías limpian el umbral personalizado.
		 *
		 * @param {string} value Texto del input numérico.
		 */
		on_input_dias_alerta(value) {
			const trimmed = typeof value === 'string' ? value.trim() : value
			if (trimmed === '' || trimmed === null || trimmed === undefined) {
				this.$store.commit('vender/set_dias_alerta_venta_no_cobrada_personalizado', null)
				return
			}
			this.$store.commit('vender/set_dias_alerta_venta_no_cobrada_personalizado', trimmed)
		},
	},
}
</script>
