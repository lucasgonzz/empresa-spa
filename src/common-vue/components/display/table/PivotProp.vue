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
				@keyup.tab="changeFocus()"
				:class="getInputSize(prop) && inputId(prop)"
				v-if="showProp(prop) && prop.type == 'textarea'"
				:type="prop.type"
				:placeholder="'Ingrese '+propText(prop)"
				v-model="model.pivot[prop.key]"></b-form-textarea>

				<b-form-select
				:id="inputId(prop)"
				@keyup.enter="changeFocus()"
				@keyup.tab="changeFocus()"
				v-else-if="showProp(prop) && prop.type == 'select'"
				v-model="model.pivot[prop.key]"
				:class="getInputSize(prop) && inputId(prop)"
				:options="getOptions({key: prop.key, text: propText(prop), select_prop_name: prop.select_prop_name, get_options_function: prop.get_options_function}, model)"></b-form-select>

				<b-form-checkbox
				:class="inputId(prop)"
				@keyup.enter="changeFocus()"
				@keyup.tab="changeFocus()"
				v-else-if="showProp(prop) && prop.type == 'checkbox'"
				:value="1"
				:unchecked-value="0"
				v-model="model.pivot[prop.key]">
				</b-form-checkbox>

				<b-form-input
				:id="inputId(prop)"
				@keyup.enter="changeFocus()"
				@keyup.tab="changeFocus()"
				v-else-if="showProp(prop)"
				:type="prop.type"
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
	methods: {
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
		changeFocus(prop) {

			const matching_inputs = document.querySelectorAll('input[id*="'+this.model_name+'"][class*="input-search"]');

            if (matching_inputs.length > 0) {
                const target_input = matching_inputs[0]; // Si hay más de uno, tomamos el primero
                console.log("Input encontrado:", target_input);
                
                // Ejemplo: enfocar ese input
                setTimeout(() => {
                	target_input.focus()
                }, 200)
            } else {
                console.warn('No se encontró ningún input que coincida con los criterios.');
            }

			// let props = Object.keys(this.model.pivot)

			// console.log('this.model.pivot:')
			// console.log(this.model)

			// console.log('this.prop:')
			// console.log(this.prop)

			// console.log('this.model_name:')
			// console.log(this.model_name)

			// console.log('prop enter:')
			// console.log(props)

			// let index = props.findIndex(prop => {
			// 	return prop == this.prop.key
			// })

			// let id = props[index + 1]
			// let elements = document.getElementsByClassName(this.model_name+'-'+id)

			// if (elements.length) {

			// 	elements[elements.length-1].focus()
	
			// 	this.updateTableScroll(elements[elements.length-1])
			// }


		},
		updateTableScroll(element) {
			let table = document.getElementById(this.cont_table_id)
			console.log('table: ')
			console.log(table)

			console.log('scroll: '+table.scrollLeft)
			table.scrollLeft += element.offsetWidth
			console.log('scroll: '+table.scrollLeft)
		}
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