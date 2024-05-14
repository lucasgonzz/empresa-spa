<template>
	<b-card
	v-if="hasExtencion('ask_save_current_acount') 
	&& client
	&& !budget"
	class="m-b-25 m-t-25 b-r-1 shadow">

		<b-form-checkbox
		:value="1"
		size="lg"
		:disabled="disabled"
		:unchecked-value="0"
		v-model="omitir_en_cuenta_corriente">
			OMITIR en cuenta corriente
		</b-form-checkbox>

	</b-card>
</template>
<script>
export default {
	computed: {
		omitir_en_cuenta_corriente: {
			set(value) {
				this.$store.commit('vender/set_omitir_en_cuenta_corriente', value)
			},
			get() {
				return this.$store.state.vender.omitir_en_cuenta_corriente
			}
		},
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
		budget() {
			return this.$store.state.vender.budget
		},
		client() {
			return this.$store.state.vender.client
		},
		disabled() {
			if (this.previus_sale.id || this.budget !== null) {
				return true
			}
			return false
		}
	},
}
</script>