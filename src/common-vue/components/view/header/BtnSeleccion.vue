<template>
	<div
	id="btn_seleccion"
	class="btn-header-action-wrap"
	v-if="ask_selectable">
		<b-button
		v-b-tooltip.hover
		:title="tooltip_text"
		:variant="variant"
		:aria-pressed="is_selecteable ? 'true' : 'false'"
		@click="toggle_selection_mode"
		class="btn-header-action m-l-10"
		size="sm">
			<i
			:class="selection_icon_class"
			class="m-r-5"
			aria-hidden="true"></i>
			<span class="btn-header-action__label">{{ button_label }}</span>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		ask_selectable: Boolean,
		model_name: String,
	},
	computed: {
		/**
		 * Variante visual según si el modo selección está activo.
		 *
		 * @returns {string}
		 */
		variant() {
			if (this.is_selecteable) {
				return 'warning'
			}
			return 'outline-secondary'
		},
		/** Estado de modo selección múltiple del listado. */
		is_selecteable: {
			get() {
				return this.$store.state[this.model_name].is_selecteable
			},
			set(value) {
				this.$store.commit(this.model_name + '/setIsSelecteable', value)
				if (!value) {
					this.$store.commit(this.model_name + '/setSelected', [])
				}
			},
		},
		/** Etiqueta del botón según el estado actual. */
		button_label() {
			// if (this.is_selecteable) {
			// 	return 'Quitar selección'
			// }
			return 'Seleccionar'
		},
		/** Clase del icono Bootstrap según el estado. */
		selection_icon_class() {
			if (this.is_selecteable) {
				return 'bi bi-x-lg'
			}
			return 'bi bi-check2-square'
		},
		/** Ayuda contextual al pasar el mouse. */
		tooltip_text() {
			if (this.is_selecteable) {
				return 'Desactiva la selección múltiple y limpia los ítems marcados'
			}
			return 'Activa la selección múltiple para marcar filas y usar acciones en lote'
		},
	},
	methods: {
		/**
		 * Alterna el modo selección y limpia la selección al desactivar.
		 */
		toggle_selection_mode() {
			this.is_selecteable = this.is_selecteable ? 0 : 1
		},
	},
}
</script>
<style scoped>
.btn-header-action-wrap {
	display: inline-flex;
	align-items: center;
}

.btn-header-action {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
}
</style>
