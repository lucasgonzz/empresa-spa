<template>
	<div class="m-b-15">
		<search-component
		:disabled="disabled"
		:id="model_name + '-' + prop.key"
		:search_from_api="search_from_api"
		@setSelected="$emit('set-selected', $event)"
		:props_to_filter="props_to_filter"
		:model_name="relation_model_name"
		:model="model"
		show_btn_create
		:props_to_show="props_to_show"
		:search_modal_extra_properties="search_modal_extra_properties"
		:search_modal_omit_property_keys="search_modal_omit_property_keys"
		:str_limint="str_limint"
		:model_name_for_search_on_models="model_name_for_search_on_models"
		:search_function="search_function"
		:clear_query="clear_query"
		:save_if_not_exist="save_if_not_exist"
		:auto_select="auto_select"
		:props_to_send_to_api="props_to_send_to_api"
		:limpiar_resultados_de_busqueda="limpiar_resultados_de_busqueda"
		:function_props_to_send_to_api="function_props_to_send_to_api"
		:prop="prop"></search-component>
	</div>
</template>

<script>
export default {
	components: {
		SearchComponent: () => import('@/common-vue/components/search/Index'),
	},
	props: {
		prop: {
			type: Object,
			required: true,
		},
		model: {
			type: Object,
			required: true,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		model_name: {
			type: String,
			required: true,
		},
		relation_model_name: {
			type: String,
			required: true,
		},
		search_from_api: {
			type: Boolean,
			default: false,
		},
		props_to_filter: {
			type: Array,
			default: () => [],
		},
		props_to_show: {
			type: [Array, null],
			default: null,
		},
		search_modal_extra_properties: {
			type: Array,
			default() {
				return []
			},
		},
		search_modal_omit_property_keys: {
			type: Array,
			default() {
				return []
			},
		},
		str_limint: {
			type: [Number, String, null],
			default: null,
		},
		model_name_for_search_on_models: {
			type: String,
			required: true,
		},
		search_function: {
			type: [String, null],
			default: null,
		},
		clear_query: {
			type: Boolean,
			default: true,
		},
		save_if_not_exist: {
			type: Boolean,
			default: true,
		},
		auto_select: {
			type: Boolean,
			default: true,
		},
		props_to_send_to_api: {
			type: [Array, Object, null],
			default: null,
		},
		limpiar_resultados_de_busqueda: {
			type: [Boolean, null],
			default: null,
		},
		function_props_to_send_to_api: {
			type: [String, null],
			default: null,
		},
	},
}
</script>
