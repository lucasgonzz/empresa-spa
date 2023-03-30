<template>
<div
v-if="view == 'nueva-clave'">
	<p>
		Ingrese su nueva contraseña.
	</p>
	<b-form-group>
		<b-form-input
		v-model="register_user.password"
		type="password"
		placeholder="Ingrese su nueva contraseña"></b-form-input>
	</b-form-group>
	<b-form-group>
		<b-form-input
		v-model="register_user.password_confirm"
		type="password"
		placeholder="Confirme su nueva contraseña"></b-form-input>
	</b-form-group>
	<btn-loader
	@clicked="updatePassword"
	text="Actualizar contraseña"
	:loader="loading"></btn-loader>
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
	computed: {
		check() {
			return !this.register_user.terminos_y_condiciones
		},
		is_code_typed() {
			if (this.register_user.verification_code.length < 6) {
				return false
			}
			return true
		},
		is_password_typed() {
			if (this.register_user.password.length > 6 && this.register_user.password == this.register_user.password_confirm) {
				return true
			}
			return false
		},
	},
	data() {
		return {
			loading: false
		}
	},
	methods: {
		updatePassword() {
			if (this.checkPassword()) {
				this.loading = true
				this.$axios.post('password-reset/update-password', {
					...this.register_user,
				})
				.then(() => {
					this.$store.dispatch('auth/me')
				})
				.catch(err => {
					this.loading = false
					console.log(err)
				})
			}
		},
		checkPassword() {
			if (this.register_user.password == '') {
				this.$toast.error('Ingrese una nueva contraseña')
				return false
			}
			if (this.register_user.password_confirm == '') {
				this.$toast.error('Confirme la nueva contraseña')
				return false
			}
			if (this.register_user.password != this.register_user.password_confirm) {
				this.$toast.error('Las contraseñas no coinciden')
				return false
			}
			return true
		}
	}
}
</script>
<style lang="sass">
.form-register
	.custom-checkbox
		text-align: left
</style>