<template>
	<div>
		<b-form-group
		v-if="prop.type == 'text' || prop.type == 'textarea' || prop.type == 'number' || prop.type == 'select' || prop.type == 'checkbox' || prop.type == 'date' || prop.only_show"
		class="pivot-input">
			<p
			v-if="prop.only_show">
				{{ propertyText(model, prop, true) }}
			</p>
			<div
			v-else>
				<b-form-textarea
				:id="inputId(prop)"
				@keyup.enter="changeFocus()"
				@keyup.tab="changeFocus()"
				:class="getInputSize(prop)"
				v-if="prop.type == 'textarea'"
				:type="prop.type"
				:placeholder="'Ingrese '+propText(prop)"
				v-model="model.pivot[prop.key]"></b-form-textarea>

				<b-form-select
				:id="inputId(prop)"
				@keyup.enter="changeFocus()"
				@keyup.tab="changeFocus()"
				v-else-if="prop.type == 'select'"
				v-model="model.pivot[prop.key]"
				:class="getInputSize(prop)"
				:options="getOptions({key: prop.key, text: propText(prop), select_prop_name: prop.select_prop_name})"></b-form-select>

				<b-form-checkbox
				:id="inputId(prop)"
				@keyup.enter="changeFocus()"
				@keyup.tab="changeFocus()"
				v-else-if="prop.type == 'checkbox'"
				:value="1"
				:unchecked-value="0"
				v-model="model.pivot[prop.key]">
				</b-form-checkbox>

				<b-form-input
				:id="inputId(prop)"
				@keyup.enter="changeFocus()"
				@keyup.tab="changeFocus()"
				v-else
				:type="prop.type"
				:class="getInputSize(prop)"
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
	},
	methods: {
		inputId(prop) {
			return this.model_name+'-'+prop.key+'-'+this.model.id
		},
		changeFocus(prop) {
			let props = Object.keys(this.model.pivot)
			let index = props.findIndex(prop => {
				return prop == this.prop.key
			})

			let id = props[index + 1]
			let element = document.getElementById(this.model_name+'-'+id)
			element.focus()

			this.updateTableScroll(element)
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