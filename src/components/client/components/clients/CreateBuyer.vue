<template>
	<btn-loader
	v-if="model.id && !model.buyer"
	variant="outline-primary"
	:loader="loading"
	@clicked="createBuyer"
	text="Crear usuario para la tienda" />
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	components: {
		BtnLoader,
	},
	props: {
		model: Object,
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		createBuyer() {
			if (this.check()) {
				this.loading = true 
				this.$api.post('buyer', {
					...this.model,
				})
				.then(res => {
					this.loading = false
					this.$store.commit('buyer/add', res.data.model)
					this.$toast.success('Usuario creado')
				})
				.catch(err => {
					this.loading = false
					console.log(err)
					this.$toast.error('Error al crear usuario')
				})
			}
		},
		check() {
			if (!this.model.email || this.model.email == '') {
				this.$toast.error('Ingrese un email para el cliente')
				return false
			}
			return true
		}
	}
}
</script>