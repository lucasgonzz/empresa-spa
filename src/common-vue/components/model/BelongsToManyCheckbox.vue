<template>
	<div>
		<div
		v-if="prop.belongs_to_many.order_by">
			<div
			v-for="group in groups">
				<hr>
				<p>
					<strong>
						<i class="icon-down"></i>
						{{ capitalize(group[0][prop.belongs_to_many.order_by]) }} 
					</strong>
				</p>
				<hr>
				<b-form-checkbox 
				v-for="model_checkbox in group"
				:key="model_checkbox.id"
				:value="model_checkbox.id"
				:id="'checkbox-'+model_checkbox.id"
				@change="change(model_checkbox)"
				v-model="models_id">
					{{ model_checkbox.name }}
				</b-form-checkbox>
			</div>
		</div>
		<div
		v-else>
			<b-form-checkbox 
			v-for="model_checkbox in modelsStoreFromName(prop.store)"
			:key="model_checkbox.id"
			:value="model_checkbox.id"
			:id="'checkbox-'+model_checkbox.id"
			@change="change(model_checkbox)"
			v-model="models_id">
				{{ model_checkbox.name }}
			</b-form-checkbox>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
		prop: Object,
	},
	data() {
		return {
			models_id: []
		}
	},
	computed: {
		groups() {
			let groups = []
			let models = []
			this.group_by.forEach(group => {
				models = this.modelsStoreFromName(this.prop.store).filter(model => {
					return model[this.prop.belongs_to_many.order_by] == group 
				})
				groups.push(models)	
			})
			return groups 
		},
		group_by() {
			let group_by = []
			let last_group_by = ''

			this.modelsStoreFromName(this.prop.store).forEach(model => {

				let group_by_name = model[this.prop.belongs_to_many.order_by]

				if (group_by_name != last_group_by
					&& !this.ya_esta_agregado(group_by, group_by_name)) {

					group_by.push(model[this.prop.belongs_to_many.order_by])
					last_group_by = model[this.prop.belongs_to_many.order_by]
				}
			})
			console.log('group_by:')
			console.log(group_by)
			return group_by
		},
	},
	created() {
		console.log('se creo')
		this.setModelsId()
	},
	methods: {
		setModelsId() {
			this.model[this.prop.key].forEach(model => {
				this.models_id.push(model.id)
			})
		},
		change(model) {
			// console.log('change')
			// console.log(model)
			this.addToRelationModels(model)
			// this.model[this.prop.key+'_id'] = this.models_id
			// console.log('valores:')
			// this.$set(this.model, this.prop.key, this.models_id)
			console.log(this.model)
		},
		addToRelationModels(model_to_add) {
			console.log(this.prop.key)
			console.log(this.model[this.prop.key])
			let index = this.model[this.prop.key].findIndex(model => {
				return model.id == model_to_add.id 
			})
			if (index != -1) {
				this.model[this.prop.key].splice(index, 1)
			} else {
				this.model[this.prop.key].push(model_to_add)
			}
		},
		ya_esta_agregado(group_by, group_by_name) {

			let index = group_by.findIndex(_group_by => _group_by == group_by_name)
			return index != -1
		},
	}
}
</script>