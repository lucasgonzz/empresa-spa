<template>
	<b-form-group
	label="Metodo de pago">
		<b-form-select
		v-model="pago.current_acount_payment_method_id"
		:options="options"></b-form-select>
	</b-form-group>
</template>
<script>
export default {
	props: ['pago'],
	computed: {
		payment_methods() {
			return this.$store.state.current_acount_payment_methods.models
		},
		options() {
			let options = []
			options.push({
				value: 0,
				text: 'Seleccione el metodo de pago'
			})
			this.payment_methods.forEach(item => {
				options.push({
					value: item.id,
					text: item.name
				})
			})
			return options
		},
	}
}
</script>