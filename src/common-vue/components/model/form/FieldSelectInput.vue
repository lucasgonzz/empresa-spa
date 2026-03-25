<template>
	<div>
		<model-component
		v-if="typeof prop.options == 'undefined'"
		:model_name="relation_model_name"></model-component>

		<b-form-select
		:id="model_name + '-' + prop.key"
		@input="$emit('input-change')"
		:disabled="disabled"
		v-model="local_value"
		:options="options"></b-form-select>
	</div>
</template>

<script>
export default {
	components: {
		ModelComponent: () => import('@/common-vue/components/model/Index'),
	},
	props: {
		prop: {
			type: Object,
			required: true,
		},
		model_name: {
			type: String,
			required: true,
		},
		relation_model_name: {
			type: String,
			required: true,
		},
		value: {
			type: [String, Number, null],
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		options: {
			type: Array,
			default: () => [],
		},
	},
	computed: {
		local_value: {
			get() {
				return this.value
			},
			set(value) {
				this.$emit('input', value)
			},
		},
	},
}
</script>
