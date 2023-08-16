<template>
	<div
	class="w-100">
		<previus-days
		v-if="show_previus_days"
		:model_name="model_name"></previus-days>

		<slot name="display_top"></slot>

		<display
		:table_height_para_restar="table_height_para_restar"
		:order_list_by="order_list_by"
		:check_permissions="check_permissions"
		:models="models_to_show"
		:model_name="model_name"
		:show_models_if_empty="show_models_if_empty"
		:properties="properties"
		:set_table_height="set_table_height"
		@clicked="clicked"
		:model_name_spanish="model_name_spanish">
			<template v-slot:table_right_options="slotProps">
				<slot name="table_right_options" :model="slotProps.model"></slot>
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
			return require(`@/models/${this.model_name}`).default.properties 
		}
	},
	methods: {
		clicked(model) {
			console.log('22222')
			this.$emit('cliecked', model)
		}
	},
	components: {
		PreviusDays,
		Display,
	}
}
</script>