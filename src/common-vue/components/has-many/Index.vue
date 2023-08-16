<template>
<div>
	
	<model
	:show_btn_pdf="show_btn_pdf"
	:model_name="model_name">
		<template v-slot:default="props">
			<slot name="modal_buttons" :model="props.model"></slot> 
		</template>
	</model>	

	<b-modal
	hide-footer
	:title="plural(model_name)"
	size="xl"
	:id="plural(model_name)">
		<nav-component
		:print_history="print_history"
		:model_name="model_name"></nav-component>

		<list
		:model_name="model_name">
			<template v-slot:table_right_options="props">
				<slot name="table_right_options" :model="props.model"></slot>
			</template>
		</list>

		<footer-component
		:model_name="model_name">
			<template v-slot:footer_buttons>
				<slot name="footer_buttons"></slot>
			</template>
		</footer-component>
	</b-modal>
</div>
</template>
<script>
import Model from '@/common-vue/components/model/Index'
import NavComponent from '@/common-vue/components/has-many/NavComponent'
import List from '@/common-vue/components/has-many/List'
import FooterComponent from '@/common-vue/components/has-many/FooterComponent'
export default {
	components: {
		Model,
		NavComponent,
		List,
		FooterComponent,
	},
	props: {
		model_name: String,
		show_btn_pdf: {
			type: Boolean,
			default: false,
		},
		print_history: {
			type: Boolean,
			default: false,
		},
	}
}
</script>