<template>
<div
v-if="view == 'codigo-de-verificacion'">
	<p class="text-left">
		Enviamos un código de verificación a <strong>{{ register_user.email }}</strong>, si no encontrás el correo <strong>revisá la carpeta de spam</strong>. El código vence en 30 minutos.
	</p>
	<b-form-group>
		<b-form-input
		v-model="register_user.verification_code"
		class="verification-code-input"
		type="text"
		inputmode="numeric"
		pattern="[0-9]*"
		autocomplete="one-time-code"
		maxlength="6"
		@input="keepOnlyDigits"
		@keyup.enter="checkVerificationCode"
		placeholder="Código"></b-form-input>
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
		/**
		 * El código está completo si tiene al menos 4 caracteres: la API nueva manda 4 dígitos
		 * y una API vieja todavía manda 6, así que se acepta cualquiera de los dos.
		 */
		is_code_typed() {
			if (this.register_user.verification_code.length < 4) {
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
		/**
		 * Deja solo los dígitos de lo que se tipea o se pega. El código se maneja siempre como
		 * texto (no `type="number"`), así un código que empezara con 0 no perdería el cero.
		 *
		 * @param {String} value Lo que hay ahora en el input.
		 */
		keepOnlyDigits(value) {
			let digits = String(value).replace(/\D/g, '')
			if (digits != value) {
				this.register_user.verification_code = digits
			}
		},
		checkVerificationCode() {
			if (this.is_code_typed) {
				this.loading = true
				this.$axios.post('/password-reset/check-verification-code', {
					...this.register_user,
					verification_code: String(this.register_user.verification_code),
				})
				.then(res => {
					this.loading = false
					if (res.data.verified) {
						this.$router.push({name: null, params: {view: 'nueva-clave'}})
					} else {
						this.register_user.verification_code = ''
						this.$toast.error('El código ingresado no es correcto')
					}
				})
				.catch(err => {
					this.loading = false
					console.log(err)
				})
			} else {
				this.$toast.error('Escribí el código completo')
			}
		},
	}
}
</script>
<style lang="sass">
.form-register
	.custom-checkbox
		text-align: left
	.verification-code-input
		text-align: center
		font-size: 1.6em
		letter-spacing: .35em
		font-weight: 600
		&::placeholder
			font-size: .6em
			letter-spacing: normal
			font-weight: normal
</style>
