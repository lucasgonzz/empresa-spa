<template>
	<div class="color-field">
		<div class="color-field__row">
			<!--
				Input nativo de color. Siempre necesita un hex de 7 caracteres valido,
				por eso usa "picker_value" (con respaldo local) en vez de escribir
				directo sobre el modelo cuando todavia no hay un valor cargado.
			-->
			<input
			type="color"
			class="color-field__picker"
			:value="picker_value"
			@input="onPickerInput">

			<b-form-input
			type="text"
			class="color-field__text"
			maxlength="7"
			v-model="text_value"
			@blur="onBlur"></b-form-input>
		</div>
	</div>
</template>
<script>
/**
 * Selector de color reutilizable para "Configuracion online" (grupo 202, prompt 03).
 *
 * Reemplaza el input de texto plano que antes obligaba a escribir el hexadecimal a
 * mano. Combina un <input type="color"> nativo (picker visual) con un input de texto
 * (para pegar o corregir el hex a mano), sincronizados en las dos direcciones.
 *
 * Escribe siempre sobre `model[prop.key]`. Nunca deja el modelo con un valor invalido:
 * si el usuario escribe algo que no es un hex valido, al perder el foco se vuelve al
 * ultimo valor valido y se avisa con un toast.
 */
export default {
	name: 'ColorField',
	props: {
		// Definicion declarativa de la propiedad (viene de src/models/online_configuration.js)
		prop: {
			type: Object,
			required: true,
		},
		// Objeto del formulario (online_configuration) sobre el que se escribe el color
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Valor de texto editable por el usuario (puede quedar momentaneamente invalido mientras escribe)
			text_value: this.normalize_or_fallback(this.model[this.prop.key]),
		}
	},
	computed: {
		/**
		 * Valor a mostrar en el <input type="color">. El input nativo exige siempre un
		 * hex de 7 caracteres, asi que si el modelo todavia no tiene un valor cargado
		 * (vacio o null) se usa un respaldo local sin escribirlo en el modelo.
		 *
		 * @returns {String} Hex de 7 caracteres (#RRGGBB)
		 */
		picker_value() {
			return this.is_valid_hex(this.model[this.prop.key]) ? this.model[this.prop.key] : '#FFFFFF'
		},
	},
	watch: {
		/**
		 * Si el modelo cambia desde afuera (ej: se aplico una paleta con IA, o se
		 * cargo otro registro), refleja el nuevo valor en el input de texto.
		 */
		'model.id'() {
			this.text_value = this.normalize_or_fallback(this.model[this.prop.key])
		},
	},
	methods: {
		/**
		 * Valida si un string es un hex de color valido (#RGB o #RRGGBB, con o sin #).
		 *
		 * @param {String} value Valor a validar
		 * @returns {Boolean}
		 */
		is_valid_hex(value) {
			if (!value) {
				return false
			}
			return /^#?[0-9a-fA-F]{6}$/.test(value.trim())
		},
		/**
		 * Normaliza un valor a formato #RRGGBB en mayusculas. Si no es valido, devuelve
		 * el ultimo valor conocido del modelo (o un blanco por defecto si tampoco hay).
		 *
		 * @param {String} value Valor a normalizar
		 * @returns {String}
		 */
		normalize_or_fallback(value) {
			if (this.is_valid_hex(value)) {
				let normalized = value.trim()
				if (normalized[0] !== '#') {
					normalized = '#' + normalized
				}
				return normalized.toUpperCase()
			}
			return '#FFFFFF'
		},
		/**
		 * Actualiza el modelo cuando el usuario elige un color con el picker nativo.
		 * El input type="color" siempre entrega un hex valido, asi que no hace falta
		 * validar antes de escribir.
		 *
		 * @param {Event} event Evento nativo del <input type="color">
		 * @returns {void}
		 */
		onPickerInput(event) {
			let new_value = event.target.value.toUpperCase()
			this.text_value = new_value
			this.$set(this.model, this.prop.key, new_value)
		},
		/**
		 * Al perder el foco del input de texto: si lo que escribio el usuario es un hex
		 * valido (con o sin #, mayusculas o minusculas), lo normaliza y lo guarda en el
		 * modelo. Si no es valido, descarta el cambio, vuelve al ultimo valor valido y
		 * avisa con un toast. Nunca deja el modelo con un valor invalido.
		 *
		 * @returns {void}
		 */
		onBlur() {
			if (this.is_valid_hex(this.text_value)) {
				let normalized = this.normalize_or_fallback(this.text_value)
				this.text_value = normalized
				this.$set(this.model, this.prop.key, normalized)
				return
			}

			this.$toast.error('Ese no es un color válido')
			this.text_value = this.normalize_or_fallback(this.model[this.prop.key])
		},
	},
}
</script>
<style scoped lang="sass">
.color-field
	width: 100%
	&__row
		display: flex
		align-items: center
		gap: 10px
	&__picker
		width: 40px
		height: 40px
		padding: 2px
		border: 1px solid #d9d9d9
		border-radius: 8px
		background: transparent
		cursor: pointer
		flex-shrink: 0
	&__text
		max-width: 140px
</style>
