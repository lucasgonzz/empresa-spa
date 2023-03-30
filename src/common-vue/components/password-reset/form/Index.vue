<template>
	<b-card
	class="form-register s-1">
		<img 
		class="apretable c-p logo-reset"
		src="@/assets/logo.png" >
		<p class="title">
			Recuperar contraseña
		</p>
			
		<step-1
		@setVerificationCodeSend="setVerificationCodeSend"
		:register_user="register_user"></step-1>

		<step-2
		@setCodeVerified="setCodeVerified"
		:register_user="register_user"
		:code_verified="code_verified"
		:verification_code_send="verification_code_send"></step-2>

		<step-3
		:register_user="register_user"
		:code_verified="code_verified"
		:verification_code_send="verification_code_send"></step-3>
	</b-card>
</template>
<script>
import Step1 from '@/common-vue/components/password-reset/form/Step1'
import Step2 from '@/common-vue/components/password-reset/form/Step2'
import Step3 from '@/common-vue/components/password-reset/form/Step3'
export default {
	components: {
		Step1,
		Step2,
		Step3,
	},
	data() {
		return {
			register_user: {
				email: '',
				verification_code: '',
				password: '',
				password_confirm: '',
			},
			verification_code_send: false,
			code_verified: false,
		}
	},
	methods: {
		setVerificationCodeSend(value) {
			this.verification_code_send = value
		},
		setCodeVerified(value) {
			this.code_verified = value
		},
	}
}
</script>
<style lang="sass">
.logo-reset
	width: 130px
	margin-bottom: 1em
</style>