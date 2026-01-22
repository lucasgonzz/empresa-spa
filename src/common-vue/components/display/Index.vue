<template>
	<div
	class="display">
		<load-pages-info
		:model_name="model_name"></load-pages-info>
		<color-info
		:model_name="model_name"></color-info>

		<table-component
		@onRowSelected="clicked"
		:papelera="papelera"
		:usar_filtros="usar_filtros"
		:show_empty_text="show_empty_text"
		:show_actualizado="show_actualizado"
		:set_model_on_row_selected="set_model_on_row_selected"
		:order_list_by="order_list_by"
		:properties="properties"
		:loading="loading_prop"
		:models="models_to_show"
		:model_name="model_name"
		:set_model_on_click="set_model_on_click"
		:on_click_set_property="on_click_set_property"
		:table_height_para_restar="table_height_para_restar"
		:set_table_height="set_table_height"
		v-if="_display == 'table'">
			<template v-slot:btn-edit="slotProps">
				<slot name="buttons" :model="slotProps.model"></slot>
			</template>  
			
			<template v-slot:table_left_options="slotProps">
				<slot name="table_left_options" :model="slotProps.model"></slot>
			</template>
			<template v-slot:table_right_options="slotProps">
				<slot name="table_right_options" :model="slotProps.model"></slot>
			</template>
			<template #btn_add_to_show>
				<!-- <btn-add-to-show
				v-if="show_btn_add_to_show"
				:model_name="model_name"
				@add="addModelsToShow"></btn-add-to-show> -->
			</template>
			
			<template
			v-for="prop in properties"
			v-slot:[get_table_prop_slot_name(prop)]="props">
				<slot :name="'table-prop-'+prop.key" :model="props.model"></slot>
			</template>
		</table-component>

		<cards-component
		:show_created_at="show_created_at"
		:properties="properties"
		:loading="loading_prop"
		:models="models_to_show"
		:model_name="model_name"
		:set_model_on_click="set_model_on_click"
		:on_click_set_property="on_click_set_property"
		@clicked="clicked"
		v-if="_display == 'cards'">
			<template v-slot:table_right_options="slotProps">
				<slot name="table_right_options" :model="slotProps.model"></slot>
			</template>
		</cards-component>

	</div>
</template>
<script>
import TableComponent from '@/common-vue/components/display/table/Index'
import CardsComponent from '@/common-vue/components/display/cards/Index'
export default {
	props: {
		loading: {
			type: Boolean,
			default: null
		},
		models: {
			type: Array,
			default() {
				return []
			},
		},
		model_name: String,
		properties: {
			type: Array,
		},
		set_model_on_click: {
			type: Boolean,
			default: true,
		},
		on_click_set_property: {
			type: String,
			default: null,
		},
		show_models_if_empty: {
			type: Boolean,
			default: false,
		},
		show_btn_edit: {
			type: Boolean,
			default: true,
		},
		display: {
			type: String,
			default: null
		},
		show_created_at: {
			type: Boolean,
			default: true,
		},
		check_permissions: {
			type: Boolean,
			default: false,
		},
		order_list_by: {
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
		set_model_on_row_selected: {
			type: Boolean,
			default: true,
		},
		slice_models: {
			type: Boolean,
			default: false,
		},
		mostrar_models_que_vinienen_por_prop_siempre: {
			type: Boolean,
			default: false,
		},
		show_actualizado: {
			type: Boolean,
			default: true,
		},
		show_empty_text: {
			type: Boolean,
			default: true,
		},
		usar_filtros: {
			type: Boolean,
			default: true,
		},
		papelera: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			index_to_show: 300,
		}
	},
	computed: {
		is_filtered() {
			return this.$store.state[this.model_name].is_filtered 
		},
		_display() {
			if (this.display) {
				return this.display
			}
			return this.$store.state[this.model_name].display
		},
		loading_prop() {
			if (this.loading) {
				return this.loading
			}
			if (this.papelera) {
				return this.$store.state.papelera[this.model_name].loading
			}
			return this.$store.state[this.model_name].loading
		},
		models_to_show() {
			if (this.is_from_models_que_vinieron_por_props) {
				if (this.slice_models) {
					console.log(this.models.slice(0, this.index_to_show) )
					return this.models.slice(0, this.index_to_show) 
				}
				return this.models
			} else {
				if (this.papelera) {
					console.log('retornando papelera:')
					if (this.is_from_filter) {
						let filtered = this.$store.state.papelera[this.model_name].filtered 
						return filtered
					} else if (this.order_list_by) {
						return this.$store.state.papelera[this.model_name].models
					}
					return this.$store.state.papelera[this.model_name].models.slice(0, this.index_to_show) 
				}

				if (this.is_from_filter) {
					let filtered = this.$store.state[this.model_name].filtered 
					return filtered
				} else if (this.order_list_by) {
					return this.$store.state[this.model_name].models
				}
				return this.$store.state[this.model_name].models.slice(0, this.index_to_show) 
			}
		},
		is_from_models_que_vinieron_por_props() {
			// return (this.models.length || this.show_models_if_empty) || !this.is_filtered
			return  this.mostrar_models_que_vinienen_por_prop_siempre || ((this.models.length || this.show_models_if_empty) && !this.is_filtered)
		},
		is_from_filter() {
			return typeof this.is_filtered != 'undefined' && this.is_filtered
		},
		show_btn_add_to_show() {
			if (this.is_from_models_que_vinieron_por_props && !this.slice_models) {
				return false
			} else if (this.is_from_filter) {
				return this.filter_page < this.total_filter_pages
			} else {
				// console.log('models_to_show: '+this.models_to_show.length)
				// console.log('state: '+this.$store.state[this.model_name].models.length)
				if (this.is_from_models_que_vinieron_por_props && this.slice_models) {
					return this.models_to_show.length < this.models.length
				}
				return this.models_to_show.length < this.$store.state[this.model_name].models.length
			}
		},
		filter_page() {
			return this.$store.state[this.model_name].filter_page
		},
		total_filter_pages() {
			return this.$store.state[this.model_name].total_filter_pages
		},
	},
	methods: {
		clicked(model) {
			this.$emit('clicked', model)
		},
		addModelsToShow() {
			if (this.is_from_filter) {
				this.$store.dispatch(this.model_name+'/loadMoreFiltered')
			} else {
				this.index_to_show += 30
			}
		}
	},
	components: {
		ColorInfo: () => import('@/common-vue/components/display/ColorInfo'),
		LoadPagesInfo: () => import('@/common-vue/components/display/LoadPagesInfo'),
		BtnAddToShow: () => import('@/common-vue/components/display/BtnAddToShow'),
		TableComponent,
		CardsComponent,
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.display
	table 
		@media screen and (max-width: 768px)
			border-radius: 0px !important
	.list-title
		text-align: left
		font-weight: bold
		margin-top: 15px
		@if ($theme == 'dark') 
			color: rgba(255,255,255,.9)
		@media screen and (max-width: 768px)
			padding-left: 15px	
</style>