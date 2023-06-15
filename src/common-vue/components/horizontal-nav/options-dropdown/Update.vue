<template>
<b-modal
:title="'Actualizar '+plural(model_name)"
hide-footer
:id="model_name+'-update-models'">
	<b-form-group
	v-for="prop in form"
	:label="prop.label">
		<b-form-input
		v-if="prop.type == 'number'"
		:placeholder="prop.placeholder"
		v-model="prop.value"></b-form-input>

		<b-form-select
		v-else-if="prop.type == 'select'"
		v-model="prop.value"
		:options="getOptions(prop, form, prop.store)"></b-form-select>

		<search-component
		v-else-if="prop.type == 'search'"
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
		setForm() {
			this.properties_to_update.forEach(prop => {
				if ((prop.type_to_update && prop.type_to_update == 'number') || prop.type == 'number') {
					this.form.push({
						label: 'Disminuir el '+this.propText(prop),
						key: 'decrement_'+prop.key,
						type: 'number',
						placeholder: 'Porcentaje para disminuir '+this.propText(prop),
						value: '',
					})
					this.form.push({
						label: 'Aumentar el '+this.propText(prop),
						key: 'increment_'+prop.key,
						type: 'number', 
						placeholder: 'Porcentaje para aumentar '+this.propText(prop),
						value: '',
					})
					this.form.push({
						label: 'Setear el '+this.propText(prop),
						key: 'set_'+prop.key,
						type: 'number', 
						placeholder: 'Valor para setear '+this.propText(prop),
						value: '',
					})
				} else if (prop.type == 'select' || prop.type == 'search') {
					this.form.push({
						label: this.propText(prop),
						key: prop.key, 
						store: this.modelNameFromRelationKey(prop),
						depends_on: prop.depends_on,
						type: 'select',
						value: 0,
					})
					// this.form[prop.key] = 0 
				} 
				// else if (prop.type == 'search') {
				// 	this.form.push({
				// 		label: this.propText(prop),
				// 		store: prop.store,
				// 		depends_on: prop.depends_on,
				// 		key: prop.key,
				// 		type: 'search',
				// 		value: '',
				// 	})
				// 	console.log('search para '+prop.key)
				// 	// this.form[prop.key] = '' 
				// }
			})
			console.log('form:')
			console.log(this.form)
		},
		setSelected(result) {
			console.log('result')
			this.form[result.prop.key] = result.model
		}
	}
}
</script>