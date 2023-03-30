<template>
	<div
	v-if="show_view">
		
		<slot name="modals"></slot>

    	<model
    	v-if="show_modal"
    	:show_btn_remove_belongs_to_many="show_btn_remove_belongs_to_many"
    	@modelSaved="modelSaved"
    	:check_permissions="check_permissions"
    	:show_btn_pdf="show_btn_pdf"
    	:show_btn_delete="show_btn_delete"
    	:size="modal_size"
    	:model_name="model_name">
    		<template v-slot:model_modal_header="slotProps">
    			<slot name="model_modal_header" :model="slotProps.model"></slot>
    		</template>
    		<template v-slot:default="slotProps">
    			<slot name="modal_buttons" :model="slotProps.model"></slot>
    		</template>
    		<template v-slot:belongs="slotProps">
    			<slot name="belongs" :model="slotProps.model"></slot>
    		</template>
    	</model>

		<b-row>
			<b-col
			cols="12"
			:xl="col_xl">
				<slot name="header"></slot>
				<horizontal-nav
				:ask_selectable="ask_selectable"
				:show_excel_drop_down="show_excel_drop_down"
				:check_permissions="check_permissions"
				:show_filter_modal="show_filter_modal"
				:show_btn_create="_show_btn_create"
				:show_plus_dropdown="show_plus_dropdown"
				:show_display="show_display"
				:model_name="model_name">
					<template v-slot:btn_create>
						<slot name="horizontal_nav_btn_create"></slot>
					</template>
					<template v-slot:buttons>
						<slot name="horizontal_nav_buttons"></slot>
					</template>
				</horizontal-nav>
			</b-col>
			<b-col
			cols="12"
			:xl="col_xl">
				<slot name="body"></slot>
			</b-col>
			<b-col
			v-if="can_show_list"
			class="col-full-width-sm"
			cols="12"
			:xl="col_xl">
				<list
				:order_list_by="order_list_by"
				:check_permissions="check_permissions"
				:models_to_show="models_to_show"
				:show_models_if_empty="show_models_if_empty"
				:show_previus_days="show_previus_days"
				:show_search_nav="show_search_nav"
				:model_name="model_name"
				@clicked="clicked">
					<template v-slot:display_top>
						<slot name="display_top"></slot>
					</template>
					<template v-slot:default="slotProps">
						<slot :model="slotProps.model"></slot>
					</template>
				</list>
			</b-col>
		</b-row>
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
			default: false,
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
		ask_selectable: {
			type: Boolean,
			default: false,
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
			return require(`@/models/${this.model_name}`).default.properties 
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
			this.$emit('modelSaved', model)
		},
		clicked(model) {
			console.log('22222')
			this.$emit('clicked', model)
		}
	}
}
</script>