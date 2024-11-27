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
			{{ text }}
		</b-form-checkbox>

	</b-card>
</template>
<script>
export default {
	computed: {
		text() {
			if (this.owner.text_omitir_cc) {
				return this.owner.text_omitir_cc
			}
			return 'OMITIR en cuenta corriente'
		},
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
			if (this.budget !== null) {
			// if (this.previus_sale.id || this.budget !== null) {
				return true
			}
			return false
		}
	},
}
</script>