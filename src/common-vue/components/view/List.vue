<template>
	<div
	class="w-100">
		<previus-days
		v-if="show_previus_days_"
		:check_permissions="check_permissions_previus_days"
		:model_name="model_name"></previus-days>

		<slot name="display_top"></slot>
		<display
		:set_model_on_row_selected="set_model_on_row_selected"
		:table_height_para_restar="table_height_para_restar"
		:order_list_by="order_list_by"
		:check_permissions="check_permissions"
		:mostrar_models_que_vinienen_por_prop_siempre="mostrar_models_que_vinienen_por_prop_siempre"
		:models="models_to_show"
		:model_name="model_name"
		:show_models_if_empty="show_models_if_empty"
		:properties="properties"
		:set_table_height="set_table_height"
		@clicked="clicked"
		:slice_models="slice_models"
		:model_name_spanish="model_name_spanish">
			<template v-slot:table_right_options="slotProps">
				<slot name="table_right_options" :model="slotProps.model"></slot>
			</template>
			
			<template
			v-for="prop in properties"
			v-slot:[get_table_prop_slot_name(prop)]="props">
				<slot :name="'table-prop-'+prop.key" :model="props.model"></slot>
			</template>
		</display>
	</div>
</template>
<script>
import PreviusDays from '@/common-vue/components/previus-days/Index'
import Display from '@/common-vue/components/display/Index'
export default {
	props: {
		model_name: String,
		model_name_spanish: String,
		show_previus_days: Boolean,
		show_search_nav: Boolean,
		check_permissions: Boolean,
		set_table_height: {
			type: Boolean,
			default: true,
		},
		mostrar_models_que_vinienen_por_prop_siempre: Boolean,
		models_to_show: {
			type: Array,
			default: () => {
				return []
			},
		},
		show_models_if_empty: {
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
	},
	computed: {
		to_show() {
			if (this.models_to_show.length || this.show_models_if_empty) {
				return this.models_to_show
			}
			return this.$store.state[this.model_name].to_show
		},
		models() {
			return this.$store.state[this.model_name].models
		},
		properties() {
			let props = require(`@/models/${this.model_name}`).default.properties
			let props_ordenadas = props.filter(prop => prop.table_position)
			if (props_ordenadas.length) {
				return props_ordenadas.sort((a, b) => a.table_position - b.table_position)
			} 
			return props
		},
		show_previus_days_() {
			if (this.show_previus_days !== null) {
				return this.show_previus_days
			}
			return this.$store.state[this.model_name].from_dates
		}
	},
	methods: {
		clicked(model) {
			this.$emit('clicked', model)
		}
	},
	components: {
		PreviusDays,
		Display,
	}
}
</script>