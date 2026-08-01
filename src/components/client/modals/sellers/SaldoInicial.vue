<template>
<b-modal
title="Pago a vendedor"
hide-footer
id="seller-commission-saldo-inicial">
	<b-form-input
	class="m-b-15"
	v-model="form.debe"
	@keyup.enter="save"
	placeholder="Ingresar en el debe (se le debe del vendedor)"></b-form-input>
	<b-form-input
	class="m-b-15"
	v-model="form.haber"
	@keyup.enter="save"
	placeholder="Ingresar en el haber (se le pago al vendedor)"></b-form-input>
	<btn-loader
	@clicked="save"
	text="Gaurdar"
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
				debe: '',
				haber: '',
			},
			loading: false,
		}
	},
	computed:{
		selected_model() {
			return this.$store.state.seller_commission.selected_model
		},
		moneda_id() {
			return this.$store.state.seller_commission.moneda_id
		},
	},
	methods: {
		save() {
			this.loading = true
			this.$api.post('seller-commission/saldo-inicial', {
				...this.form,
				seller_id: this.selected_model.id,
				moneda_id: this.moneda_id,
			})
			.then(res => {
				this.loading = false
				this.$store.dispatch('seller_commission/getModels')
				this.$toast.success('Guardado')
				this.$bvModal.hide('seller-commission-saldo-inicial')
				this.form.debe = ''
				this.form.haber = ''
				this.$store.commit('seller/add', res.data.model)
			})
			.catch(err => {
				this.loading = false
				let mensaje = 'Error al guardar'
				if (err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				this.$toast.error(mensaje)
			})
		}
	}
}
</script>