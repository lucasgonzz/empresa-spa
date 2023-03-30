<template>
<b-modal 
id="cancel-order" 
title="Cancelar pedido" 
hide-footer>
	<b-form-group
	label="¿Por que no puede cumplir con el pedido?">
		<b-form-textarea
		placeholder="Ingresa la razon por la cual no podes cumplir con el pedido"
		v-model="description"></b-form-textarea>
	</b-form-group>
	<btn-loader
	variant="danger"
	@clicked="cancel"
	text="Cancelar Pedido"
	:loader="loading">
	</btn-loader>
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			loading: false,
			description: '',
		}
	},
	computed: {
		model() {
			return this.$store.state.order.model
		}
	},
	methods: {
		cancel() {
			if (this.check()) {
				this.loading = true
				this.$api.put(`/order/cancel/${this.model.id}`, {
					description: this.description,
				})
				.then(res => {
					this.loading = false
					this.$toast.success('Pedido cancelado')
					this.$store.commit('order/add', res.data.model)
					this.description = ''
					this.$bvModal.hide('cancel-order')
					this.$bvModal.hide('order')
				})
				.catch(err => {
					this.$toast.error('Error al cancelar pedido')
					this.loading = false
					console.log(err)
				})
			}
		},
		check() {
			if (this.description == '') {
				this.$toast.error('Ingrese una descripcion')
				return false 
			}
			return true
		}
	}
}
</script>
<style scoped lang="sass">
.img-cont
	display: flex
	img 
		width: 300px
</style>