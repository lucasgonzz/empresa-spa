<template>
	<div class="m-l-15">
		<table-component
		:pivot_parent_model="model"
		:loading="false"
		:models="model[prop.key]"
		:model_name="prop.store"
		:pivot="prop.belongs_to_many"
		:order_list_by="prop.belongs_to_many.order_list_by"
		:order_list_from_pivot="true"
		:set_model_on_row_selected="false"
		show_pivot_created_at
		:show_btn_edit="false">
			<template v-slot:table_right_options="slotProps">
				<slot name="belongs" :model="slotProps.model"></slot>

				<b-button
				v-if="show_btn_remove_belongs_to_many"
				class="m-l-15"
				variant="danger"
				@click="$emit('remove-model', slotProps.model)">
					<i class="icon-trash"></i>
				</b-button>
			</template>
		</table-component>
	</div>
</template>

<script>
import TableComponent from '@/common-vue/components/display/table/Index'

export default {
	components: {
		TableComponent,
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
		show_btn_remove_belongs_to_many: {
			type: Boolean,
			default: true,
		},
	},
}
</script>
