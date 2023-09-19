<template>
	<div
	class="m-l-15">
		<model-component
		:has_many_parent_model="parent_model"
		:has_many_parent_model_name="parent_model_name"
		:has_many_prop="prop"
		:model_name="prop.has_many.model_name"></model-component>	

	    <confirm
	    :model_name="prop.has_many.model_name"
	    :actions="[parent_model_name+'/deletePropModel']"
	    :id="'delete-'+prop.key"></confirm>
	    
	    <table-component
	    :models="parent_model[prop.key]"
	    :model_name="prop.has_many.model_name"></table-component>
	    
		<b-button
		v-if="!prop.has_many.models_from_parent_prop && (typeof prop.has_many.show_btn_create == 'undefined' || prop.has_many.show_btn_create)"
		class="m-t-15"  
		@click="create(prop.has_many.model_name, parent_model)"
		size="sm"
		variant="primary">
			<i class="icon-plus"></i>
			Agregar {{ singular(prop.has_many.model_name) }}
		</b-button>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import TableComponent from '@/common-vue/components/display/table/Index'

import Confirm from '@/common-vue/components/Confirm'

export default {
	name: 'HasMany',
	props: {
		prop: Object,
		parent_model_name: String,
		parent_model: Object,
	},
	components: {
		ModelFormComponent: () => import('@/common-vue/components/model/ModelForm'),
		BtnLoader,
		TableComponent,

		ModelComponent: () => import('@/common-vue/components/model/Index'),
		Confirm,
	},
	data() {
		return {
			deleting: 0,
		}
	},
	computed: {
		prop_model_to_delete() {
			return this.$store.state[this.parent_model_name].prop_model_to_delete
		},
		// text_delete_() {
		// 	if (this.prop_model_to_delete) {
		// 		return this.prop_model_to_delete.text 
		// 	}
		// 	return ''
		// },
	},
	methods: {
		addHasMany() {
			let model_to_add = {...this.prop.has_many.model}
			this.$set(this.parent_model, this.prop.key, this.parent_model[this.prop.key].concat([model_to_add]))
		},
		deleteModel(model) {
		}
	}
}
</script>