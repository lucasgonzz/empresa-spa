<template>
	<div class="test-mail-button m-t-15 m-b-15">
		<hr>

		<h5>Probar configuración de correo</h5>

		<!-- Aclaracion obligatoria: el endpoint prueba la config YA GUARDADA, no lo que hay sin guardar en pantalla -->
		<p class="text-muted m-b-15">
			Este botón prueba el correo que usa tu negocio con la configuración <strong>ya guardada</strong>.
			Si tu casilla propia está activada y completa, usa esa casilla. En los demás casos, usa el correo predeterminado de ComercioCity.
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
		<p v-if="resultado" class="m-t-10" role="status" aria-live="polite">
			{{ resultado }}
		</p>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

/**
 * Botón independiente para probar el remitente efectivo configurado
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
			resultado: '',
		}
	},
	created() {
		// Por defecto se propone el email del usuario logueado como destino de la prueba
		if (this.user && this.user.email) {
			this.email_destino = this.user.email
		}
	},
	methods: {
		detalleResultado(datos, mensaje) {
			if (datos && datos.origen === 'propia') return 'Casilla propia. ' + mensaje
			if (datos && datos.origen === 'comerciocity') return 'Correo predeterminado de ComercioCity. ' + mensaje
			return mensaje
		},
		/**
		 * Envia el correo de prueba usando la configuracion SMTP ya guardada en la base.
		 * Muestra el resultado seguro del backend y qué alternativa de correo se probó.
		 *
		 * @returns {void}
		 */
		sendTestMail() {
			// Validacion minima en frontend: no permitir enviar sin un destino cargado
			if (!this.email_destino) {
				this.$toast.error('Ingresá un correo de destino')
				return
			}

			if (this.sending) return
			this.resultado = ''
			this.sending = true
			this.$store.commit('auth/setMessage', 'Enviando correo de prueba')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('online-configuration/test-mail', {
				email_destino: this.email_destino,
			})
			.then(res => {
				this.sending = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				let mensaje = (res.data && res.data.message) || 'Correo de prueba enviado correctamente'
				this.resultado = this.detalleResultado(res.data, mensaje) + ' Revisá la bandeja de entrada y el correo no deseado; la aceptación del servidor no garantiza la llegada.'
				this.$toast.success(mensaje)
			})
			.catch(err => {
				this.sending = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				// La API devuelve mensajes aptos para el usuario, sin diálogo SMTP ni secretos.
				let error_message = 'No se pudo enviar el correo de prueba'
				if (err.response && err.response.data && err.response.data.message) {
					error_message = err.response.data.message
				}
				this.resultado = this.detalleResultado(err.response && err.response.data, error_message)
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
