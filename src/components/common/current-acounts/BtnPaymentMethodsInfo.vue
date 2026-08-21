<template>
	<!--
		Era azul macizo y decia "Met Pago". Ese azul era el mismo peso visual que el boton de
		accion del footer, para algo que solo abre un detalle de lectura, y compartia celda con
		otro boton celeste ("Ver Info", que muestra quien pago el movimiento). Queda neutro, con
		icono y con el nombre entero, que es lo unico que lo distingue del vecino.
	-->
	<b-button
	v-if="model.current_acount_payment_methods.length"
	@click="showPaymentMethods"
	variant="light"
	title="Ver los métodos de pago de este movimiento">
		<i class="bi bi-credit-card"></i>
		Métodos
		<b-badge
		v-if="model.is_provisorio">
			Provisorio
		</b-badge>
	</b-button>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		showPaymentMethods() {
			this.$store.commit('current_acount/setToShowPaymentMethods', this.model)
			this.$bvModal.show('payment-methods-details')
		}
	}
}
</script>
