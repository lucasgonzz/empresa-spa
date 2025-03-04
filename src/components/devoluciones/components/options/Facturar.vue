<template>
	<div>
		<b-form-checkbox
		class="m-t-15"
		v-if="se_puede_facturar"
		:value="1"
		:unchecked-value="0"
		v-model="facturar_nota_credito">
			Enviar nota de credito a AFIP
		</b-form-checkbox>
	</div>
</template>
<script>
export default {
	computed: {
		se_puede_facturar() {
			if (this.sale) {
				if (this.sale.afip_ticket) {
					return true
				}
			}
			return false
		},
		client() {
			return this.$store.state.devoluciones.client
		},
		sale() {
			return this.$store.state.devoluciones.sale
		},
		facturar_nota_credito: {
			get() {
				return this.$store.state.devoluciones.facturar_nota_credito
			},
			set(value) {
				this.$store.commit('devoluciones/set_facturar_nota_credito', value)
			}
		},
	}
}
</script>