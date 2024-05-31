<template>
	<b-modal 
	id="payment-method-modal" 
	title="Métodos de pago" 
	hide-footer>

	<!-- 
		Total a repartir
		Boton "completar" en cada input
		Almacenar los metodos de pago y sus montos en un array
		para enviar al api
	 -->
		
		<b-form-group
		v-for="payment_method in payment_methods"
		:label="payment_method.name">
			<b-form-input
			placeholder="Ingrese el monto"></b-form-input>
			<hr>
		</b-form-group>

		<b-button
		block
		variant="primary">
			Guardar
		</b-button>

	</b-modal>
</template>
<script>
export default {
	mounted() {
		this.total_a_repartir = this.total_vender
	},
	computed: {
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models 
		},
		total_vender() {
			return this.$store.state.vender.total 
		},
	},
	data() {
		return {
			total_a_repartir: 0,
		}
	}
}
</script>