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
				if (model[this.prop.belongs_to_many.order_by] != last_group_by) {
					group_by.push(model[this.prop.belongs_to_many.order_by])
					last_group_by = model[this.prop.belongs_to_many.order_by]
				}
			})
			return group_by
		},
	},
	created() {
		console.log('se creo')
		this.setModelsId()
	},
	methods: {
		setModelsId() {
			this.model[this.prop.key+'_id'].forEach(model_id => {
				this.models_id.push(model_id)
			})
		},
		change(model) {
			this.model[this.prop.key+'_id'] = this.models_id
			console.log('valores:')
			console.log(this.model[this.prop.key+'_id'])
			// let index = this.model[this.prop.key+'_id'].findIndex(id => {
			// 	return id == model.id  
			// })
			// console.log('index: '+index)
			// if (index == -1) {
			// 	this.model[this.prop.key+'_id'].push(model.id)
			// 	console.log('no testaba y se agrego')
			// } else {
			// 	this.model[this.prop.key+'_id'].splice(index, 1)
			// 	console.log('estaba y se quito')
			// }
		}
	}
}
</script>