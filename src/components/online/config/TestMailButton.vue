<template>
	<div class="test-mail-button m-t-15 m-b-15">
		<hr>

		<h5>Probar configuración de correo</h5>

		<!-- Aclaracion obligatoria: el endpoint prueba la config YA GUARDADA, no lo que hay sin guardar en pantalla -->
		<p class="text-muted m-b-15">
			Este botón envía un correo de prueba usando la configuración <strong>ya guardada</strong>.
			Si modificaste algún campo de correo, guardá primero y después probá.
		</p>

		<b-form-row>
			<b-col
			md="6"
			class="m-b-10">
				<b-form-input
				type="email"
				placeholder="Correo de destino"
				v-model="email_destino"></b-form-input>
			</b-col>
			<b-col md="6">
				<btn-loader
				:block="false"
				:loader="sending"
				variant="outline-primary"
				text="Enviar correo de prueba"
				@clicked="sendTestMail"></btn-loader>
			</b-col>
		</b-form-row>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

/**
 * Boton independiente para probar el envio de correo SMTP propio configurado
 * en "Configuracion online" (grupo "Correo para notificaciones a clientes").
 *
 * Se agrega como componente separado, debajo del formulario declarativo generico
 * (ModelForm), en lugar de forzar el renderer generico de `properties` a soportar
 * un boton de accion especifico de este modelo.
 *
 * Pega a POST online-configuration/test-mail, endpoint agregado en el prompt 358,
 * que prueba con la configuracion SMTP YA GUARDADA en la base (no con los valores
 * sin guardar que pueda tener el formulario en pantalla).
 */
export default {
	name: 'TestMailButton',
	components: {
		BtnLoader,
	},
	data() {
		return {
			// Email de destino para el correo de prueba, precargado con el del usuario logueado
			email_destino: '',
			// Indicador de envio en curso (usado por BtnLoader para el spinner)
			sending: false,
		}
	},
	created() {
		// Por defecto se propone el email del usuario logueado como destino de la prueba
		if (this.user && this.user.email) {
			this.email_destino = this.user.email
		}
	},
	methods: {
		/**
		 * Envia el correo de prueba usando la configuracion SMTP ya guardada en la base.
		 * Muestra el mensaje real que devuelve el backend si falla (ej: contraseña
		 * incorrecta o puerto invalido), en vez de un error generico.
		 *
		 * @returns {void}
		 */
		sendTestMail() {
			// Validacion minima en frontend: no permitir enviar sin un destino cargado
			if (!this.email_destino) {
				this.$toast.error('Ingresá un correo de destino')
				return
			}

			this.sending = true
			this.$store.commit('auth/setMessage', 'Enviando correo de prueba')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('online-configuration/test-mail', {
				email_destino: this.email_destino,
			})
			.then(() => {
				this.sending = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Correo de prueba enviado correctamente')
			})
			.catch(err => {
				this.sending = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				// El valor real de este flujo es mostrar el motivo real del error (nunca un mensaje generico)
				let error_message = 'No se pudo enviar el correo de prueba'
				if (err.response && err.response.data && err.response.data.message) {
					error_message = err.response.data.message
				}
				this.$toast.error(error_message)
			})
		},
	},
}
</script>
<style scoped lang="sass">
.test-mail-button
	width: 100%
</style>
