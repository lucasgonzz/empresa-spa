<template>
	<div
	class="login-form">
		<img 
		@click="clickImage"
		src="@/assets/logo.png">
		<p class="title">
			Iniciar sesion
		</p>
		<b-form-group>
			<b-form-input
			@keyup.enter="login"
			v-model="form[attempt_prop]"
			:placeholder="'Ingrese su '+attempt_text"></b-form-input>
		</b-form-group>
		<b-form-group>
			<b-form-input
			@keyup.enter="login"
			v-model="form.password"
			type="password"
			placeholder="Contraseña"></b-form-input>
		</b-form-group>
		<b-form-group>
			<b-form-checkbox
			v-model="form.remember"
			:value="1"
			:unchecked-value="0">
				Recordarme
			</b-form-checkbox>
		</b-form-group>
		<btn-loader
		class="m-b-15"
		@clicked="login"
		text="Ingresar"
		:loader="loading"></btn-loader>
		<b-button
		size="sm"
		block
		variant="outline-primary"
		:to="{name: 'passwordReset', params: {view: 'email'}}">
			Olvide mi contraseña
		</b-button>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	components: {
		BtnLoader,
	},
	data() {
		return {
			form: {
				password: '',
				remember: 0,
			},
			loading: false,
		}
	},
	methods: {
		login() {
			if (this.check() && !this.loading) {
				this.loading = true 
				this.$axios.post('login', this.form)
				.then(res => {
					this.loading = false
					if (res.data.login) {
						this.$store.commit('auth/setAuthenticated', true)
						this.$store.commit('auth/setUser', res.data.user)
					} else if (res.data.user_last_activity) {
						this.$toast.error('Su cuenta esta siendo utilizada en otro dispositivo, cierre la cuenta en el otro dispositivo. En caso de que la cuenta no este siendo utilizada en el otro dispositivo, espere '+this.user_last_activity_minutes+' minutos')
					} else {
						this.$toast.error('Sus credenciales son incorrectas')
					}
				})
				.catch(err => {
					console.log(err)
					this.loading = false 
					this.$toast.error('Error al ingresar')
				})
			}
		},
		check() {
			if (this.form[this.attempt_prop] == '') {
				this.$toast.error('Ingrese el '+this.attempt_text)
				return false
			}
			if (this.form.password == '') {
				this.$toast.error('Ingrese la contraseña')
				return false
			}
			return true 
		},
		clickImage() {
			console.log(this.use_home_page)
			if (this.use_home_page) {
				this.$router.push({name: 'home'})
			}
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.login-form
	img 
		width: 130px
		// margin-bottom: 1em
	@media screen and (min-width: 768px)
		@if ($theme == 'dark')
			background: #333
		@else 
			background: #FFF
		padding: 15px
		border-radius: 5px
		// box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px
</style>