<template>
	<div>
		<b-form-group
		v-if="prop.type == 'text' || prop.type == 'textarea' || prop.type == 'number' || prop.type == 'select' || prop.type == 'checkbox' || prop.type == 'date' || prop.only_show"
		class="pivot-input">
			<p
			v-if="prop.only_show">
				{{ propertyText(model, prop, true, pivot_parent_model) }}
			</p>
			<div
			v-else>
				<b-form-textarea
				@keyup.enter="changeFocus()"
				:class="getInputSize(prop) && inputId(prop)"
				v-if="showProp(prop) && prop.type == 'textarea'"
				:type="prop.type"
				:placeholder="'Ingrese '+propText(prop)"
				v-model="model.pivot[prop.key]"></b-form-textarea>

				<b-form-select
				:id="inputId(prop)"
				:data-testid="inputId(prop)"
				@keyup.enter="changeFocus()"
				v-else-if="showProp(prop) && prop.type == 'select'"
				v-model="model.pivot[prop.key]"
				:class="getInputSize(prop) && inputId(prop)"
				:options="getOptions({key: prop.key, text: propText(prop), select_prop_name: prop.select_prop_name, get_options_function: prop.get_options_function}, model)"></b-form-select>

				<b-form-checkbox
				:class="inputId(prop)"
				@keyup.enter="changeFocus()"
				v-else-if="showProp(prop) && prop.type == 'checkbox'"
				:value="1"
				:unchecked-value="0"
				v-model="model.pivot[prop.key]">
				</b-form-checkbox>

				<b-form-input
				:id="inputId(prop)"
				:data-testid="inputId(prop)"
				@keyup.enter="changeFocus()"
				@blur="normalize_pivot_variable_decimal_on_blur(prop)"
				v-else-if="showProp(prop)"
				:type="prop.type"
				:step="prop.type == 'number' ? get_number_input_step(prop) : undefined"
				:class="getInputSize(prop) && inputId(prop)"
				:placeholder="'Ingrese '+propText(prop)"
				v-model="model.pivot[prop.key]"></b-form-input>
			</div>
			
		</b-form-group>
		<b-button
		v-else-if="prop.type == 'button'"
		@click="callMethod(prop, model)"
		variant="primary"
		size="sm">
			{{ propText(prop) }}
		</b-button>
		<div
		v-else-if="prop.function">
			{{ getFunctionValue(prop, model) }}
		</div>
	</div>
</template>
<script>
export default {
	props: {
		prop: Object,
		model: Object,
		model_name: String,
		index: Number,
		cont_table_id: String,
		pivot_parent_model: Object,
	},
	mounted() {
		this.normalize_pivot_variable_decimal_on_blur(this.prop)
	},
	methods: {
		/**
		 * Al salir del campo o al montar la celda, formatea costos con 2 o 4 decimales según uso.
		 *
		 * @param {Object} prop definición de la columna pivot.
		 * @returns {void}
		 */
		normalize_pivot_variable_decimal_on_blur(prop) {
			if (!prop || prop.type != 'number' || !prop.variable_decimals) {
				return
			}
			if (!this.model || !this.model.pivot) {
				return
			}
			const pivot_key = prop.key
			const current_value = this.model.pivot[pivot_key]
			if (current_value === null || current_value === undefined || current_value === '') {
				return
			}
			const normalized_value = this.normalize_variable_decimal_pivot_value(prop, current_value)
			if (normalized_value !== current_value) {
				this.$set(this.model.pivot, pivot_key, normalized_value)
			}
		},
		showProp(prop) {
			if (prop.v_if) {
				if (prop.v_if.b_t_many_model_prop) {
					if (prop.v_if.check_array_length) {
						let model = this.model
						if (prop.v_if.check_on_store_models) {
							console.log('buscando model para checkprop desde store')
							model = this.$store.state[prop.v_if.check_on_store_models].models.find(_model => {
								return _model.id == this.model.id 
							})
						}
						return model[prop.v_if.b_t_many_model_prop].length 
					}
				}
			}

			if (prop.if_has_extencion) {
				return this.hasExtencion(prop.if_has_extencion)
			}
			return true 
		},
		inputId(prop) {
			return this.model_name+'-'+prop.key+'-'+this.model.id
		},
		/*
			Vuelve el foco al input del search component cuando el usuario presiona Enter
			en una celda del pivot, para poder seguir buscando y agregando sin usar el mouse.
			El Tab no pasa por aca: lo maneja el navegador y avanza al siguiente input de la
			fila, respetando el orden de columnas configurado por el usuario.
		*/
		changeFocus() {
			const matching_inputs = document.querySelectorAll('input[id*="'+this.model_name+'"][class*="input-search"]')

			if (!matching_inputs.length) {
				console.warn('No se encontró ningún input de búsqueda para devolver el foco')
				return
			}

			const target_input = matching_inputs[0] // Si hay más de uno, tomamos el primero
			setTimeout(() => {
				target_input.focus()
			}, 200)
		},
	}
}
</script>
<style lang="sass">
.input-sm 
	width: 70px !important
.input-md 
	width: 150px !important
.input-lg
	width: 350px !important
</style>