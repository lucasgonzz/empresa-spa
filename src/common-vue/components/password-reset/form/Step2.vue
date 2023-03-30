<template>
<div
v-if="view == 'codigo-de-verificacion'">
	<p class="text-left">
		Enviamos un código de verificación a <strong>{{ register_user.email }}</strong>, si no encuentras el correo <strong>revisa la lista de SPAM</strong>.
	</p>
	<b-form-group>
		<b-form-input
		v-model="register_user.verification_code"
		type="number"
		@keyup.enter="checkVerificationCode"
		placeholder="Ingrese el código de verificacion"></b-form-input>
	</b-form-group>
	<btn-loader
	@clicked="checkVerificationCode"
	text="Verificar"
	:loader="loading"></btn-loader>
</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	props: {
		register_user: Object,
		verification_code_send: Boolean,
		code_verified: Boolean,
	},
	components: {
		BtnLoader
	},
	computed: {
		is_code_typed() {
			if (this.register_user.verification_code.length < 6) {
				return false
			}
			return true
		},
	},
	data() {
		return {
			loading: false
		}
	},
	methods: {
		checkVerificationCode() {
			if (this.is_code_typed) {
				this.loading = true
				this.$axios.post('/password-reset/check-verification-code', {
					...this.register_user,
				})
				.then(res => {
					this.loading = false
					if (res.data.verified) {
						this.$router.push({name: null, params: {view: 'nueva-clave'}})
					} else {
						this.register_user.verification_code = ''
						this.$toast.error('El codigo ingresado no es correcto')
					}
				})
				.catch(err => {
					this.loading = false
					console.log(err)
				})
			} else {
				this.$toast.error('Escriba el código completo')
			}
		},
	}
}
</script>
<style lang="sass">
.form-register
	.custom-checkbox
		text-align: left
</style>