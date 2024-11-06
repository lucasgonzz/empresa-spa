<template>
	<div
	v-if="show_view">
		
		<slot name="modals"></slot>

    	<model
    	v-if="show_modal"
    	:show_btn_remove_belongs_to_many="show_btn_remove_belongs_to_many"
    	@modelSaved="modelSaved"
    	@modelDeleted="modelDeleted"
    	:properties_to_show="properties_for_model_modal"
    	:check_permissions="check_permissions"
    	:show_btn_pdf="show_btn_pdf"
    	:show_btn_delete="show_btn_delete"
    	:show_btn_save="show_btn_save"
    	:size="modal_size"
    	:model_name="model_name"
    	:prop_to_send_on_save="prop_to_send_on_save"
    	:props_to_send_on_save="props_to_send_on_save"
    	:emit_on_saved_instead_continue="emit_on_saved_instead_continue"
    	:not_show_delete_text="not_show_delete_text"
    	:delete_text="delete_text"
    	:save_check_function="save_check_function"
    	:show_only_guardar="show_only_guardar">
    		<template #model_modal_title>
    			<slot name="model_modal_title"></slot>
    		</template>
    		
    		<template v-slot:model_modal_header="slotProps">
    			<slot name="model_modal_header" :model="slotProps.model"></slot>
    		</template>
    		<template v-slot:default="slotProps">
    			<slot name="modal_buttons" :model="slotProps.model"></slot>
    		</template>
    		<template v-slot:belongs="slotProps">
    			<slot name="belongs" :model="slotProps.model"></slot>
    		</template> 
    		<template
    		v-for="prop in properties"
			v-slot:[prop.key]="props">
				<slot :name="prop.key" :model="props.model">
				</slot>
    		</template>
    	</model>

		<slot name="header"></slot>

		<view-header
		v-if="show_view_header"
		:show_btn_create="show_btn_create"
		:show_excel_drop_down="show_excel_drop_down"
		:check_permissions="check_permissions"
		:has_permission_create_dropdown="has_permission_create_dropdown"
		:ask_selectable="ask_selectable"
		:change_from_dates_option="change_from_dates_option"
		:model_name="model_name">
			<template v-slot:btn_create>
				<slot name="horizontal_nav_btn_create"></slot>
			</template>
			<template v-slot:horizontal_nav_center>
				<slot name="horizontal_nav_center"></slot>
			</template>
			<template #options_drop_down>
				<slot name="options_drop_down"></slot>
			</template>
			<template #excel_drop_down_options>
				<slot name="excel_drop_down_options"></slot>
			</template>
		</view-header>
		
		<horizontal-nav
		v-else
		:ask_selectable="ask_selectable"
		:show_excel_drop_down="show_excel_drop_down"
		:has_permission_create_dropdown="has_permission_create_dropdown"
		:check_permissions="check_permissions"
		:show_filter_modal="show_filter_modal"
		:show_btn_create="_show_btn_create"
		:show_plus_dropdown="show_plus_dropdown"
		:show_display="show_display"
		:change_from_dates_option="change_from_dates_option"
		:items="horizontal_nav_items" 
		:set_view="horizontal_nav_set_view"
		:set_sub_view="horizontal_nav_set_sub_view"
		:model_name="model_name">
			<template v-slot:btn_create>
				<slot name="horizontal_nav_btn_create"></slot>
			</template>
			<template v-slot:horizontal_nav_center>
				<slot name="horizontal_nav_center"></slot>
			</template>
			<template #options_drop_down>
				<slot name="options_drop_down"></slot>
			</template>
			<template #excel_drop_down_options>
				<slot name="excel_drop_down_options"></slot>
			</template>
		</horizontal-nav>
	
		<slot name="body"></slot>
		
		<list
		:usar_filtros="usar_filtros"
		:model_name_for_get_models="model_name_for_get_models"
		:show_empty_text="show_empty_text"
		:show_actualizado="show_actualizado"
		:properties_to_show="properties_to_show"
		:table_height_para_restar="table_height_para_restar"
		:order_list_by="order_list_by"
		:check_permissions="check_permissions"
		:check_permissions_previus_days="check_permissions_previus_days"
		:models_to_show="models_to_show"
		:show_models_if_empty="show_models_if_empty"
		:show_previus_days="show_previus_days"
		:show_search_nav="show_search_nav"
		:model_name="model_name"
		:set_table_height="set_table_height"
		:mostrar_models_que_vinienen_por_prop_siempre="mostrar_models_que_vinienen_por_prop_siempre"
		:set_model_on_row_selected="set_model_on_row_selected"
		:slice_models="slice_models"
		@clicked="clicked">
			<template v-slot:display_top>
				<slot name="display_top"></slot>
			</template>
			<template v-slot:table_right_options="slotProps">
				<slot name="table_right_options" :model="slotProps.model"></slot>
			</template>
    		<template
    		v-for="prop in properties"
			v-slot:[get_table_prop_slot_name(prop)]="props">
				<slot :name="'table-prop-'+prop.key" :model="props.model"></slot>
    		</template>
		</list>

		<slot name="view_footer"></slot>
	</div>
</template>
<script>
import Model from '@/common-vue/components/model/Index'
import List from '@/common-vue/components/view/List'
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'

export default {
	components: {
		Model,

		List,
		HorizontalNav,
		ViewHeader: () => import('@/common-vue/components/view/header/Index'),
	},
	props: {
		model_name: {
			type: String,
		},
		modal_size: {
			type: String,
			default: 'lg'
		},
		show_btn_create: {
			type: Boolean,
			default: true,
		},
		show_btn_save: {
			type: Boolean,
			default: true,
		},
		show_plus_dropdown: {
			type: Boolean,
			default: false,
		},
		check_can_create: {
			type: Boolean,
			default: false
		},
		show_previus_days: {
			type: Boolean,
			default: null,
		},
		show_search_nav: {
			type: Boolean,
			default: false,
		},
		show_filter_modal: {
			type: Boolean,
			default: false,
		},
		show_btn_pdf: {
			type: Boolean,
			default: false,
		},
		show_btn_delete: {
			type: Boolean,
			default: true,
		},
		show_modal: {
			type: Boolean,
			default: true,
		},
		show_display: {
			type: Boolean,
			default: true,
		},
		change_from_dates_option: {
			type: Boolean,
			default: false,
		},
		horizontal_nav_items: {
			type: Array,
			default: null,
		},
		horizontal_nav_set_view: {
			type: Boolean,
			default: false,
		},
		horizontal_nav_set_sub_view: {
			type: Boolean,
			default: false,
		},
		col_xl: {
			type: String,
			default: '12'
		},
		models_to_show: {
			type: Array,
			default: () => {
				return []
			},
		},
		show_models_if_empty: Boolean,
		check_permissions: {
			type: Boolean,
			default: true,
		},
		show_btn_remove_belongs_to_many: {
			type: Boolean,
			default: true,
		},
		order_list_by: {
			type: String,
			default: null,
		},
		check_auth: {
			type: Boolean,
			default: true,
		},
		show_excel_drop_down: {
			type: Boolean,
			default: false,
		},
		has_permission_create_dropdown: {
			type: Boolean,
			default: false,
		},
		ask_selectable: {
			type: Boolean,
			default: false,
		},
		prop_to_send_on_save: {
			type: Object,
		 	default: null,
		},
		props_to_send_on_save: {
			type: Array,
			default: () => []
		},
		emit_on_saved_instead_continue: {
			type: Boolean,
			default: false,
		},
		not_show_delete_text: {
			type: Boolean,
			default: false,
		},
		delete_text: {
			type: String,
			default: null,
		},
		table_height_para_restar: {
			type: Number,
			default: null,
		},
		set_table_height: {
			type: Boolean,
			default: true,
		},
		mostrar_models_que_vinienen_por_prop_siempre: {
			type: Boolean,
			default: false,
		},
		save_check_function: {
			type: String,
			default: null,
		},
		set_model_on_row_selected: {
			type: Boolean,
			default: true,
		},
    	check_permissions_previus_days: {
    		type: Boolean,
    		default: true,
    	},
		slice_models: {
			type: Boolean,
			default: false,
		},
		show_only_guardar: {
			type: Boolean,
			default: true,
		},
		properties_to_show: {
			type: Array,
			default: null,
		},
		show_actualizado: {
			type: Boolean,
			default: true,
		},
		show_empty_text: {
			type: Boolean,
			default: true,
		},
		model_name_for_get_models: {
			type: String,
			default: null,
		},
		show_view_header: {
			type: Boolean,
			default: true,
		},
		usar_filtros: {
			type: Boolean,
			default: true,
		},
	},
	computed: {
		show_view() {
			if (this.check_auth) {
				console.log('check_auth: '+this.authenticated)
				return this.authenticated
			}
			return true
		},
		can_show_list() {
			if (this.check_permissions) {
				return this.can(this.model_name+'.index')
			}
			return true 
		},
		model() {
			return this.$store.state[this.model_name].model
		},
		delete() {
			return this.$store.state[this.model_name].delete
		},
		display() {
			return this.$store.state[this.model_name].display
		},
		properties() {
			if (this.properties_to_show) {
				return this.properties_to_show
			}
			return require(`@/models/${this.model_name}`).default.properties 
		},
		properties_for_model_modal() {
			return this.get_properties_to_show(this.model_name)
		},
		_show_btn_create() {
			if (this.check_can_create) {
				return this.can(this.model_name+'.store')
			}
			return this.show_btn_create
		}
	},
	methods: {
		modelSaved(model) {
			console.log('22222')
			this.$emit('modelSaved', model)
		},
		modelDeleted(model) {
			console.log('modelo eliminado')
			this.$emit('modelDeleted')
		},
		clicked(model) {
			this.$emit('clicked', model)
		}
	}
}
</script>