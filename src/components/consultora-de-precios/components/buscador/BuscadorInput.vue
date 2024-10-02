<template>
	<div class="buscador">
		<b-form-input
		id="consultora-buscador-input"
		v-model="codigo"
		@keydown.enter="buscar"
		placeholder="Escanee un codigo..."></b-form-input>
	</div>
</template>
<script>
export default {
	data() {
		return {
			codigo: '',
		}
	},
	methods: {
		buscar() {
			this.$store.commit('auth/setLoading', true)
			this.$store.commit('auth/setMessage', 'Buscando')

			this.$api.get('consultora-de-precio/buscador/'+this.codigo)
			.then(res => {
				this.$store.commit('auth/setLoading', false)

				console.log(res)

				let resultado = res.data.article 

				if (!resultado) {

					this.$toast.error('No se encontro articulo')
					this.$store.commit('consultora_de_precio/set_article', null)
				} else {

					this.$store.commit('consultora_de_precio/set_article', resultado)
				}

				this.resetear_buscador()
			})
			.catch(err => {
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al buscar')
				this.resetear_buscador()
			})
		},
		resetear_buscador() {

			this.codigo = ''
			this.focus()
		},
		focus() {
			let input = document.getElementById('consultora-buscador-input')

			if (input) {

				input.focus()
			}
		}
	}
}
</script>
<style lang="sass">
.consultora-de-precios
	input  
		width: 500px
		margin: 30px auto
		padding: 15px 30px
		font-size: 30px
</style>