<template>
	<div class="m-b-15">
		<search-component
		:disabled="disabled"
		:id="model_name + '-' + prop.key"
		:search_from_api="search_from_api"
		:data_tour="prop.data_tour"
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
		:preference_scope="preference_scope"
		:prop="prop">

			<!-- A la derecha del campo: lo llena el consumidor (ModelForm pone ahi el boton de columnas). -->
			<template #input_right>
				<slot name="input_right"></slot>
			</template>

		</search-component>
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
		/**
		 * 🔴 El tipo NO puede aceptar null y el default NO puede ser null. Vue 2 aplica el default de
		 * una prop unicamente cuando el valor llega `undefined` (validateProp, vue 2.7.14, linea 5028
		 * de vue.runtime.common.dev.js); un null EXPLICITO pasa derecho. Y encima no avisa nada,
		 * porque assertProp corta en seco con `value == null` (linea 5081): cero warnings en consola.
		 *
		 * Que pasaba mientras aca valia null: este componente reenvia la prop a search/Index.vue, que
		 * la declara con `default: true`. Al llegarle un null explicito, ese true no se aplicaba NUNCA
		 * y quedaba en null (falsy). Consecuencia: TODOS los buscadores de los formularios --categoria,
		 * subcategoria, proveedor, marca, los 69 campos `type: 'search'` de los 37 modelos-- abrian el
		 * modal sin precargar nada del store y sin limpiar los resultados de la busqueda anterior.
		 *
		 * ModelForm.vue pasa `prop.limpiar_resultados_de_busqueda`, que es `undefined` cuando el modelo
		 * no la declara: ESE si dispara el default de aca. Y cuando el modelo la declara
		 * (provider_order.js la pone en false para conservar la lista entre aperturas) el false viaja
		 * tal cual.
		 *
		 * Clase de error: "default de prop anulado por un null explicito del padre".
		 */
		limpiar_resultados_de_busqueda: {
			type: Boolean,
			default: true,
		},
		function_props_to_send_to_api: {
			type: [String, null],
			default: null,
		},
		/**
		 * Ambito de la preferencia de columnas de los resultados de busqueda (ver search/Modal.vue).
		 */
		preference_scope: {
			type: [String, null],
			default: null,
		},
	},
}
</script>
