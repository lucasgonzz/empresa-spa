<template>
	<div>
		<div class="d-flex w-100">
			<!--
				Al perder el foco se notifica al componente padre para que pueda ejecutar
				validaciones como el chequeo de repetidos sin depender solo de Enter.
			-->
			<b-form-input
			autocomplete="off"
			:id="model_name + '-' + prop.key"
			:disabled="disabled"
			:type="prop.type"
			@keyup.enter="$emit('enter')"
			@blur="$emit('blur')"
			v-model="local_value"></b-form-input>

			<b-button
			v-if="prop.key == 'cuit'"
			@click="$emit('search-cuit')"
			class="m-l-5"
			variant="primary">
				<i class="icon-search"></i>
			</b-button>

			<bar-code-scanner
			class="m-l-5"
			v-if="prop.use_bar_code_scanner && has_bar_code_scanner"
			@setBarCode="$emit('set-bar-code', $event)"></bar-code-scanner>
		</div>

		<div
		class="m-t-10"
		v-if="prop.is_price">
			{{ price_value }}
		</div>
	</div>
</template>

<script>
export default {
	components: {
		BarCodeScanner: () => import('@/common-vue/components/bar-code-scanner/Index'),
	},
	props: {
		model_name: {
			type: String,
			required: true,
		},
		prop: {
			type: Object,
			required: true,
		},
		value: {
			type: [String, Number, null],
			default: '',
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		prop_text: {
			type: String,
			required: true,
		},
		price_value: {
			type: String,
			default: '-',
		},
		has_bar_code_scanner: {
			type: Boolean,
			default: false,
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
