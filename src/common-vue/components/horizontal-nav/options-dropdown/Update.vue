<template>
<b-modal
:title="'Actualizar '+plural(model_name)"
hide-footer
:id="model_name+'-update-models'">
	<b-form-group
	v-for="prop in form"
	:label="prop.label">
		<div
		v-if="prop.type == 'number'">
			<b-form-input
			:placeholder="prop.placeholder"
			v-model="prop.value"></b-form-input>

			<b-form-checkbox
			class="m-t-10"
			v-if="typeof prop.round != 'undefined'"
			v-model="prop.round"
			:value="1"
			:unchecked-value="0">
				Redondear
			</b-form-checkbox>
		</div>

		<b-form-select
		v-else-if="prop.type == 'select'"
		v-model="prop.value"
		@chenge="setChange"
		:options="getOptions(prop, form, prop.store)"></b-form-select>

		<search-component
		v-else-if="prop.type == 'search'"
		:id="prop.store+'-'+prop.key"
		:model_name="modelNameFromRelationKey(prop)"
		:prop="prop"
		@setSelected="setSelected"></search-component>
	</b-form-group>
	<btn-loader
	@clicked="update"
	text="Actualizar"
	:loader="loading"></btn-loader>
</b-modal>
</template>
<script>
export default {
	props: {
		model_name: String,
		loading: Boolean,
	},
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		properties_to_update() {
			return this.propertiesToUpdate(this.model_name)
		},
	},
	data() {
		return {
			form: [],
		}
	},
	created() {
		this.setForm()
	},
	methods: {
		update() {
			this.$emit('update', this.form)
		},
		setChange(value) {
			console.log('setChange')
			console.log(value)
		},
		setForm() {
			this.properties_to_update.forEach(prop => {
				if ((prop.type_to_update && prop.type_to_update == 'number') || prop.type == 'number') {
					this.form.push({
						label: 'Disminuir el '+this.propText(prop),
						key: 'decrement_'+prop.key,
						type: 'number',
						placeholder: 'Porcentaje para disminuir '+this.propText(prop),
						value: '',
						round: 0,
					})
					this.form.push({
						label: 'Aumentar el '+this.propText(prop),
						key: 'increment_'+prop.key,
						type: 'number', 
						placeholder: 'Porcentaje para aumentar '+this.propText(prop),
						value: '',
						round: 0,
					})
					this.form.push({
						label: 'Setear el '+this.propText(prop),
						key: 'set_'+prop.key,
						type: 'number', 
						placeholder: 'Valor para setear '+this.propText(prop),
						value: '',
					})
				} else if (prop.type == 'select') {
					this.form.push({
						label: this.propText(prop),
						key: prop.key, 
						store: this.modelNameFromRelationKey(prop),
						depends_on: prop.depends_on,
						type: 'select',
						value: 0,
					})
					// this.form[prop.key] = 0 
				} else if (prop.type == 'search') {
					this.form.push({
						label: this.propText(prop),
						store: prop.store,
						depends_on: prop.depends_on,
						key: prop.key,
						type: 'search',
						value: '',
					})
					console.log('search para '+prop.key)
					// this.form[prop.key] = '' 
				}
			})
			console.log('form:')
			console.log(this.form)
		},
		setSelected(result) {
			let index = this.form.findIndex(form => {
				return form.key == result.prop.key  
			})
			this.form[index].value = result.model.id 
			console.log(this.form[index])
			
		}
	}
}
</script>