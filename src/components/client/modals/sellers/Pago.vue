<template>
<b-modal
title="Pago a vendedor"
hide-footer
id="seller-commission-pago">
	<b-form-input
	class="m-b-15"
	v-model="form.pago"
	@keyup.enter="hacerPago"
	placeholder="Ingrese el pago para el vendedor"></b-form-input>
	<btn-loader
	@clicked="hacerPago"
	text="Hacer Pago"
	:loader="loading"></btn-loader>
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			form: {
				pago: '',
			},
			loading: false,
		}
	},
	computed:{
		selected_model() {
			return this.$store.state.seller_commission.selected_model
		},
	},
	methods: {
		hacerPago() {
			console.log('selected_model')
			console.log(this.selected_model)
			this.loading = true 
			this.$api.post('seller-commission/pago', {
				...this.form,
				seller_id: this.selected_model.id
			})
			.then(res => {
				this.loading = false 
				this.$store.dispatch('seller_commission/getModels')
				this.$toast.success('Pago registrado')
				this.$bvModal.hide('seller-commission-pago')
				this.form.pago = ''
			})
			.catch(err => {
				this.loading = false 
				this.$toast.error(error)
				console.log(err)
			})
		}
	}
}
</script>