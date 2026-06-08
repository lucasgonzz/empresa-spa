<template>
	<!-- Toggle estilo iPhone reutilizable en el módulo vender -->
	<div
	class="vender-toggle-row"
	:class="row_class">
		<label
		class="vender-toggle"
		:class="{ 'vender-toggle--disabled': disabled }"
		:for="toggle_input_id">
			<input
			type="checkbox"
			:id="toggle_input_id"
			:disabled="disabled"
			:checked="is_checked"
			@change="on_change">
			<span class="vender-toggle__track">
				<span class="vender-toggle__thumb"></span>
			</span>
		</label>
		<span
		class="vender-toggle__label"
		@click="on_label_click">
			<slot></slot>
		</span>
	</div>
</template>

<script>
export default {
	name: 'VenderToggle',
	props: {
		/* v-model: booleano, 0/1 o array según mode */
		value: {
			type: [Boolean, Number, Array],
			default: false,
		},
		/* binary: un solo valor; array: lista de opciones seleccionadas */
		mode: {
			type: String,
			default: 'binary',
		},
		/* Valor de la opción cuando mode=array */
		option_value: {
			type: [String, Number],
			default: null,
		},
		/* Valores emitidos en modo binary cuando está activo/inactivo */
		true_value: {
			type: [Boolean, Number],
			default: 1,
		},
		false_value: {
			type: [Boolean, Number],
			default: 0,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		/* ID opcional para el input (accesibilidad y popovers) */
		input_id: {
			type: String,
			default: '',
		},
		/* Clases extra en la fila (p. ej. multilínea) */
		row_class: {
			type: String,
			default: '',
		},
	},
	computed: {
		/**
		 * ID único del input checkbox nativo.
		 *
		 * @returns {string}
		 */
		toggle_input_id() {
			if (this.input_id) {
				return this.input_id
			}
			let suffix = ''
			if (this.option_value != null) {
				suffix = '-' + this.option_value
			}
			return 'vender-toggle-' + this._uid + suffix
		},

		/**
		 * Indica si el toggle debe mostrarse activo según el v-model actual.
		 *
		 * @returns {boolean}
		 */
		is_checked() {
			if (this.mode === 'array') {
				if (!Array.isArray(this.value)) {
					return false
				}
				return this.value.indexOf(this.option_value) !== -1
			}

			if (typeof this.value === 'boolean') {
				return this.value
			}

			return Number(this.value) === Number(this.true_value)
		},
	},
	methods: {
		/**
		 * Propaga el cambio del input al v-model del padre.
		 *
		 * @param {Event} event Evento change del checkbox nativo.
		 * @returns {void}
		 */
		on_change(event) {
			if (this.disabled) {
				return
			}

			let checked = event.target.checked

			if (this.mode === 'array') {
				let new_array = Array.isArray(this.value) ? this.value.slice() : []
				let index = new_array.indexOf(this.option_value)

				if (checked && index === -1) {
					new_array.push(this.option_value)
				}
				if (!checked && index !== -1) {
					new_array.splice(index, 1)
				}

				this.$emit('input', new_array)
				return
			}

			if (typeof this.value === 'boolean') {
				this.$emit('input', checked)
				return
			}

			this.$emit('input', checked ? this.true_value : this.false_value)
		},

		/**
		 * Permite activar el toggle haciendo click en el texto de la etiqueta.
		 *
		 * @returns {void}
		 */
		on_label_click() {
			if (this.disabled) {
				return
			}

			let input = document.getElementById(this.toggle_input_id)
			if (input) {
				input.click()
			}
		},
	},
}
</script>
