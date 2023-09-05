<template>
	<div 
	class="register-form animate__animated animate__wobble">
		<h4>
			Arranca tu prueba gratis ahora
		</h4>
		<b-form-input
		v-model="form.name"
		placeholder="Nombre"></b-form-input>
		<b-form-input
		v-model="form.doc_number"
		placeholder="N° de documento"></b-form-input>
		<b-form-input
		v-model="form.phone"
		placeholder="Telefono"></b-form-input>
		<b-form-input
		v-model="form.email"
		placeholder="E-mail"></b-form-input>
		<b-form-input
		v-model="form.company_name"
		placeholder="Nombre de la Empresa"></b-form-input>
		<b-form-input
		v-model="form.password"
		placeholder="Crear contraseña"></b-form-input>
		<b-button
		@click="register"
		variant="primary">
			Comenzar a usar
		</b-button>
	</div>
</template>
<script>
export default {
	data() {
		return {
			form: {
				name: '',
				doc_number: '',
				phone: '',
				email: '',
				company_name: '',
				password: '',
			},
			}
	},
	methods: {
		register() {
			this.$store.commit('auth/setMessage', 'Creando cuenta')
			this.$store.commit('auth/setLoading', true)
			this.$axios.post('user', this.form)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				if (res.data.repeated) {
					this.$toast.error('Ya hay un usuario registrado con ese numero de documento')
				} else {
					this.$store.dispatch('auth/me')
				}
			}) 
			.catch(err => {
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Hubo un error al registrarse')
			})
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.register-form
	padding: 30px
	// max-width: 500px
	@media screen and (max-width: 992px)
		margin-top: 25px
	@media screen and (min-width: 992px)
		border-radius: 15px
		box-shadow: rgba(68, 68, 68, 0.06) 0px 54px 125px, rgba(68, 68, 68, 0.04) 0px 4.44956px 24.0676px, rgba(68, 68, 68, 0.03) 0px -0.0333488px 4.06435px
	@media screen and (min-width: 1500px)
		float: right
		width: 500px
	h4 
		margin-bottom: 30px
	input	
		margin-bottom: 20px
		padding: 25px 17px
		border: 1px solid $blue
	button
		padding: 15px
		width: 200px
		border-radius: 50px
		font-size: 1.2em
		margin-top: 10px
</style>