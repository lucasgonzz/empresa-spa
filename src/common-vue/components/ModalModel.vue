<template>
<b-modal
hide-footer
:title="title"
:id="modelPlural(model_name)">
	<view-component
	:show_models_if_empty="show_models_if_empty"
	:show_btn_pdf="show_btn_pdf"
	:show_previus_days="false"
	:models_to_show="models_to_show"
	:model_name="model_name">
		<template #header>
			<slot name="header"></slot>
		</template>
	</view-component>
</b-modal>
</template>
<script>
import ViewComponent from '@/common-vue/components/view/Index'
export default {
	components: {
		ViewComponent,
	},
	props: {
		model_name: String,
		show_btn_pdf: {
			type: Boolean,
			default: false,
		},
		models_to_show: {
			type: Array,
			default() {
				return []
			} 
		},
		show_models_if_empty: Boolean,
	},
	computed: {
		title() {
			return require('@/models/'+this.model_name).default.plural_model_name_spanish
		},
	}
}
</script>