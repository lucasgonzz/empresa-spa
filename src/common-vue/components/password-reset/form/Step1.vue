<template>
<div
v-if="view == 'email'">
	<b-form-group
	label="Ingresa tu correo para que te enviemos un código de recuperación.">
		<b-form-input
		v-model="register_user.email"
		@keyup.enter="sendCode"
		placeholder="Correo electronico"></b-form-input>
	</b-form-group>
	<btn-loader
	@clicked="sendCode"
	text="Enviar codigo"
	:loader="loading"></btn-loader>
	<b-button
	:to="{name: 'login'}"
	block 
	variant="outline-primary">
		Regresar
	</b-button>
</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	props: {
		register_user: Object,
	},
	components: {
		BtnLoader
	},
	data() {
		return {
			loading: false
		}
	},
	methods: {
		sendCode() {
			if (this.checkForm()) {
				this.loading = true
				this.$axios.post('password-reset/send-verification-code', {
					email       : this.register_user.email,
				})
				.then(res => {
					this.loading = false
					if (res.data.email_send) {
						this.$router.push({name: null, params: {view: 'codigo-de-verificacion'}})
					} else {
						this.$toast.error('El correo no corresponde a un usuario registrado')
					}
				})
				.catch(err => {
					console.log(err)
					this.loading = false
				})
			}
		},
		checkForm() {
			if (this.register_user.email == '') {
				this.$toast.error('Ingresa tu correo')
				return false
			}
			return true
		},
	}
}
</script>