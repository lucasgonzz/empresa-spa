<template>
	<div
	class="m-l-15">
		<model-component
		@modelDeleted="modelDeleted"
		@modelSaved="modelSaved"
		:has_many_parent_model="parent_model"
		:has_many_parent_model_name="parent_model_name"
		:has_many_prop="prop"
		:props_to_send_on_save_function="prop.has_many.props_to_send_on_save_function"
		:model_name="prop.has_many.model_name">
			<template
				v-for="prop in has_many_model_props"
				v-slot:[prop.key]
			>
				
				<slot 
					:name="'has-many-prop-'+prop.key"
				>
				</slot>
			</template>
		</model-component>	
	    <confirm
	    :model_name="prop.has_many.model_name"
	    :actions="[parent_model_name+'/deletePropModel']"
	    :id="'delete-'+prop.key"></confirm>
	    
	    <div
		class="has-many-table-container"
		@mouseenter="setTableHoverState(true)"
		@mouseleave="setTableHoverState(false)">
			<!-- Boton contextual para ampliar la vista cuando el usuario interactua con la tabla -->
			<b-button
			v-if="show_expand_button"
			class="has-many-expand-button"
			size="sm"
			variant="outline-primary"
			@click="openExpandModal">
				<i class="icon-eye"></i>
				Ampliar
			</b-button>

			<table-component
			disable_scroll    
		    :models="parent_model[prop.key]"
		    is_from_has_many
		    :model_name="prop.has_many.model_name"></table-component>
		</div>
	    
		<b-button
		v-if="!prop.has_many.models_from_parent_prop && (typeof prop.has_many.show_btn_create == 'undefined' || prop.has_many.show_btn_create)"
		class="m-t-15"  
		@click="create(prop.has_many.model_name, parent_model)"
		size="sm"
		variant="primary">
			<i class="icon-plus"></i>
			Agregar {{ singular(prop.has_many.model_name) }}
		</b-button>

		<b-modal
		hide-footer
		:title="'Detalle de '+plural(prop.has_many.model_name)"
		size="xl"
		:id="expand_modal_id"
		v-model="show_expand_modal">
			<table-component
			disable_scroll
			:models="parent_model[prop.key]"
			is_from_has_many
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
		</b-modal>
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
			// Estado visual para mostrar/ocultar el boton de expandir sobre la tabla compacta.
			show_expand_button: false,
			// Estado de control para abrir/cerrar el modal de visualizacion ampliada.
			show_expand_modal: false,
			// Estado legado existente para operaciones de borrado.
			deleting: 0,
		}
	},
	computed: {
		has_many_model_props() {
			return this.modelPropertiesFromName(this.prop.has_many.model_name)
		},	
		prop_model_to_delete() {
			return this.$store.state[this.parent_model_name].prop_model_to_delete
		},
		expand_modal_id() {
			// ID unico por propiedad para evitar colisiones de modal en formularios con multiples HasMany.
			return 'has-many-expand-modal-'+this.parent_model_name+'-'+this.prop.key
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
			// Se clona el modelo base para no mutar la referencia original del schema del has_many.
			let model_to_add = {...this.prop.has_many.model}
			this.$set(this.parent_model, this.prop.key, this.parent_model[this.prop.key].concat([model_to_add]))
		},
		setTableHoverState(is_hovered) {
			// Sincroniza el estado de hover para mostrar el CTA de ampliacion solo cuando corresponde.
			this.show_expand_button = is_hovered
		},
		openExpandModal() {
			// Abre el modal de detalle ampliado manteniendo la misma informacion de la tabla compacta.
			this.show_expand_modal = true
		},
		modelDeleted(model) {
			// alert('hasMany modelDeleted')
			this.$emit('modelDeleted')
		},
		modelSaved(model) {
			// alert('hasMany modelSaved')
			this.$emit('modelSaved', model)
		},
	}
}
</script>
<style scoped>
.has-many-table-container {
	position: relative;
}

.has-many-expand-button {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	z-index: 1000;
}
</style>