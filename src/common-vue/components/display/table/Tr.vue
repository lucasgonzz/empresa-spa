<template>
	<tr
	@click="onRowSelected(model)"
	:class="rowClass(model)">
		<td
		v-for="(prop, index) in props">
			<pivot-prop
			v-if="prop.is_pivot_prop"
			:cont_table_id="cont_table_id"
			:model="model"
			:index="index"
			:model_name="model_name"
			:prop="prop"></pivot-prop>

			<vue-load-image
			v-else-if="isImageProp(prop) && imageUrl(model, prop)"
			class="img-fluid">
				<img 
				slot="image"
				:src="imageUrl(model, prop)">

		        <b-spinner
				slot="preloader"
		        variant="primary"></b-spinner>

				<div slot="error">Imagen no encontrada</div>
			</vue-load-image>


			<div
			v-else-if="showInput(prop, model)">
				<b-form-textarea
				v-if="prop.type == 'textarea'"
				:class="getInputSize(prop)"
				:placeholder="propertyText(model, prop)"
				v-model="model[prop.key]"></b-form-textarea>

				<b-form-input
				v-if="prop.type == 'text'"
				:class="getInputSize(prop)"
				:placeholder="propertyText(model, prop)"
				v-model="model[prop.key]"></b-form-input>

				<p
				v-if="prop.type == 'checkbox'">
					<span
					v-if="model[prop.key]">
						Si
					</span>
					<span
					v-else>
						No
					</span>
				</p>
			</div>

			<b-button
			v-else-if="showProperty(prop, model) && prop.button"
			:variant="prop.button.variant"
			@click="callMethod(prop, model)">
				<i
				v-if="prop.button.icon"
				:class="'icon-'+prop.button.icon"></i>

				<span
				v-else-if="prop.button.button_text">
					{{ prop.button.button_text }}
				</span>
				
				<span
				v-else>
					{{ propertyText(model, prop) }}
				</span>
			</b-button>
			

			<template
			v-else>
				<template
				v-if="prop.from_pivot">
					{{ propertyText(model.pivot, prop) }}
				</template>
				<template
				v-else>
					{{ propertyText(model, prop) }}
				</template>
			</template>
		</td>
		<td>
			<span
			v-if="pivot">
				{{ date(model.pivot.created_at) }}
			</span>
			<span
			v-else>
				{{ date(model.updated_at) }}
			</span>
		</td>
		<td>
			<slot name="table_right_options" :model="model">
				&nbsp
			</slot>
		</td>
	</tr>
</template>
<script>
export default {
	props: {
		model: Object,
		pivot: Object,
		props: Array,
		model_name: String,
		select_mode: String,
		set_model_on_row_selected: Boolean,
		cont_table_id: String,
	},
	components: {
		VueLoadImage: () => import('vue-load-image'),
		PivotProp: () => import('@/common-vue/components/display/table/PivotProp'),
	},
	methods: {
		rowClass(model) {
			if (this.model_name && this.hasColor(this.model_name)) {
				return this[this.model_name+'GetColor'](model)
			}
		},
		onRowSelected(model) {
			console.log(this.select_mode)
			if (this.select_mode == 'single') {
				this.$emit('onRowSelected', model)
				if (this.set_model_on_row_selected) {
					this.setModel(model, this.model_name)
				}
			}
		},
		showInput(prop, model) {
			if (prop.show_in_input_if) {
				if (prop.show_in_input_if[1] == '<') {
					return model[prop.show_in_input_if[0]] < prop.show_in_input_if[2] 
				} else if (prop.show_in_input_if[1] == '=') {
					return model[prop.show_in_input_if[0]] == prop.show_in_input_if[2] 
				} else if (prop.show_in_input_if[1] == '>') {
					return model[prop.show_in_input_if[0]] > prop.show_in_input_if[2] 
				}
			}
		},
		width(prop) {
			if (prop.table_width && prop.table_width == 'lg') {
				return 'width-300'
			}
			return ''
		},
		propsToSet(prop) {
			let props = []
			if (this.pivot) {
				this.pivot.properties_to_set.forEach(prop => {
					if (!prop.can || (prop.can && this.can(prop.can))) {
						if (prop.from_store) {
							let models = this.modelsStoreFromName(prop.store)
							models.forEach(model => {
								props.push({
									type: prop.type,
									text: model.name,
									key: prop.store+'_'+model.id,
									size: prop.size,
								})
							})
						} else {
							props.push(prop)
						}
					}
				})
			}
			return props 
		},	
	}
}
</script>