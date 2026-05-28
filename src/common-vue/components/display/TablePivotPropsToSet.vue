<template>
	<div>
		<b-form-group
		v-if="prop.type == 'text' || prop.type == 'textarea' || prop.type == 'number' || prop.type == 'select' || prop.type == 'checkbox' || prop.type == 'date'"
		:key="'pivot-prop-'+prop.key"
		class="pivot-input">
			<p
			v-if="prop.only_show">
				{{ propertyText(model, prop, true) }}
			</p>
			<div
			v-else>
				<b-form-textarea
				:class="getInputSize(prop)"
				v-if="prop.type == 'textarea'"
				:type="prop.type"
				:placeholder="'Ingrese '+propText(prop)"
				v-model="model.pivot[prop.key]"></b-form-textarea>
				<b-form-select
				v-else-if="prop.type == 'select'"
				v-model="model.pivot[prop.key]"
				:class="getInputSize(prop)"
				:options="getOptions({key: prop.key, text: propText(prop), select_prop_name: prop.select_prop_name})"></b-form-select>
				<b-form-checkbox
				v-else-if="prop.type == 'checkbox'"
				:value="1"
				:unchecked-value="0"
				v-model="model.pivot[prop.key]">
				</b-form-checkbox>
				<b-form-input
				v-else
				:type="prop.type"
				:step="prop.type == 'number' ? get_number_input_step(prop) : undefined"
				@blur="normalize_pivot_variable_decimal_on_blur(prop)"
				:class="getInputSize(prop)"
				:placeholder="'Ingrese '+propText(prop)"
				v-model="model.pivot[prop.key]"></b-form-input>
			</div>
		</b-form-group>
		<b-button
		v-else-if="prop.type == 'button'"
		@click="callMethod(prop, model)"
		variant="primary"
		size="sm">
			{{ propText(prop) }}
		</b-button>
		<div
		v-else-if="prop.function">
			{{ getFunctionValue(prop, model) }}
		</div>
	</div>
</template>
<script>
export default {
	props: {
		prop: Object,
		model: Object,
	},
	mounted() {
		this.normalize_pivot_variable_decimal_on_blur(this.prop)
	},
	methods: {
		/**
		 * Formatea en pivot un número con decimales variables al montar o al perder foco.
		 *
		 * @param {Object} prop definición de la columna pivot.
		 * @returns {void}
		 */
		normalize_pivot_variable_decimal_on_blur(prop) {
			if (!prop || prop.type != 'number' || !prop.variable_decimals) {
				return
			}
			if (!this.model || !this.model.pivot) {
				return
			}
			const pivot_key = prop.key
			const current_value = this.model.pivot[pivot_key]
			if (current_value === null || current_value === undefined || current_value === '') {
				return
			}
			const normalized_value = this.normalize_variable_decimal_pivot_value(prop, current_value)
			if (normalized_value !== current_value) {
				this.$set(this.model.pivot, pivot_key, normalized_value)
			}
		},
	},
}
</script>