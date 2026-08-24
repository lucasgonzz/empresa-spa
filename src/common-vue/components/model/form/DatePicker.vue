<template>
	<div
	class="cont-date-picker">
		<label
		v-if="label">
			{{ label }} 
		</label>
		<!--
			El id usa "_" por razones historicas; el data-testid usa "-", que es la convencion de
			e2e/README.md (<model_name>-<key>) y la misma que emiten FieldTextInput/FieldSelectInput.
			Sin esto, un campo de tipo date era el unico del formulario generico sin forma de
			seleccionarlo por testid (caso concreto: la fecha de emision de la factura de compra,
			que es la que fecha el comprobante en el Libro IVA y en Posicion Fiscal).
			`prop` puede venir null (es su default), por eso el testid se calcula en un computed
			que devuelve null en ese caso -- un :data-testid null no se renderiza.
		-->
		<input 
		@change="setDate"
		v-model="date_value"
		type="date" 
		:id="model_name+'_'+prop.key"
		:data-testid="testid"
		class="custom-date-picker">
	</div>
</template>
<script>
import moment from 'moment'
export default {
	props: {
		label: {
			type: String,
			default: null
		},
		value: {
			type: String,
			default: null
		},
		prop: {
			type: Object,
			default: null
		},
		model_name: String,
	},
	computed: {
		/**
		 * data-testid del input, con la convencion <model_name>-<key> de e2e/README.md.
		 *
		 * @returns {String|null} null si el componente se uso sin prop (su default), para que el
		 *                        atributo no se renderice en vez de salir como "algo-undefined".
		 */
		testid() {
			if (!this.prop || !this.prop.key) {
				return null
			}
			return this.model_name + '-' + this.prop.key
		},
	},
	created() {
		if (this.value) {
			this.date_value = moment(this.value, 'YYYY-MM-DD').format('YYYY-MM-DD') 
			this.setDate()
		}
	},
	data() {
		return {
			date_value: '',
		}
	},
	methods: {
		setDate() {
			this.$emit('setDate', {
				value: this.date_value,
				prop: this.prop,
			})
		},
	},
}
</script>
<style>
.cont-date-picker {
	display: flex;
	flex-direction: column;
	margin-bottom: 15px;
}

label {
  	display: block !important;
}
/*
	Mismo chasis que el resto de los campos del formulario del modal (ver el bloque .form-control en
	model/ModelForm.vue): borde de 1px, esquinas de 10px, la altura de los controles del sistema y un
	anillo suave al enfocar. Este input no lleva .form-control, asi que aquel bloque no lo alcanzaba y
	era el unico campo del formulario que seguia con el rectangulo gris de 5px.

	Los !important son los que ya estaban: hacen falta para ganarle a `input, select` de
	src/sass/_inputs.sass, que es global.

	Los colores van por token para que el campo responda al modo oscuro; antes el color del texto
	estaba fijo en #333 y el fondo en #fff, o sea texto gris sobre blanco adentro de un modal negro.
*/
.custom-date-picker {
	min-height: var(--toolbar-control-h, 36px);
	border: 1px solid var(--color-border, #c4c4c4) !important;
	border-radius: 10px !important;
	background-color: var(--bg-card, #fff) !important;
	padding: 0.25rem 0.7rem !important;
	font-size: 0.95rem;
	line-height: 1.45;
	width: 190px !important;
	max-width: 100%;
	color: var(--color-text-primary, #333) !important;
	box-shadow: none !important;
}

.custom-date-picker:focus {
	border: 1px solid var(--color-primary, #007bff) !important;
	box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15) !important;
	outline: none;
}
</style>