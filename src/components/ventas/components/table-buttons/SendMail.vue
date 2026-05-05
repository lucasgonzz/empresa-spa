<template>
	<div
	v-if="hasExtencion('enviar_mail_a_clientes') && sale.client && sale.client.email">
		<b-button
		size="sm"
		class="m-l-5"
		:variant="button_variant"
		:disabled="enviando"
		:title="titulo_boton"
		@click.stop="enviar">
			<span
			v-show="enviando"
			class="spinner-border spinner-border-sm"></span>
			<i
			v-show="!enviando"
			class="icon-message"></i>
		</b-button>
	</div>
</template>
<script>
/**
 * Botón para encolar el correo de notificación de venta al cliente (misma lógica que al guardar con "Enviar correo").
 * La variante refleja si send_mail ya está marcado en la venta, en línea con el badge en Ventas.vue.
 */
export default {
	props: {
		/** Fila del listado de ventas (modelo sale con client). */
		sale: {
			type: Object,
			required: true,
		},
	},
	data() {
		/** Evita doble envío mientras la petición está en curso. */
		return {
			enviando: false,
		}
	},
	computed: {
		/**
		 * outline-success: aún no consta envío / flag send_mail apagado.
		 * success: mismo criterio que el badge verde en Ventas cuando send_mail es verdadero.
		 *
		 * @returns {string} Variante Bootstrap-Vue para el botón.
		 */
		button_variant() {
			return this.sale.send_mail ? 'success' : 'outline-success'
		},
		/** Texto de ayuda al pasar el mouse; no intrusivo en pantallas táctiles. */
		titulo_boton() {
			return this.sale.send_mail
				? 'Reenviar correo al cliente'
				: 'Enviar correo al cliente'
		},
	},
	methods: {
		/**
		 * POST al endpoint que encola ComercioCityMailHelper::new_sale y actualiza send_mail.
		 *
		 * @returns {void}
		 */
		enviar() {
			var self = this
			self.enviando = true
			self.$api.post('sale/' + self.sale.id + '/send-client-mail', {})
				.then(function (res) {
					self.enviando = false
					self.$store.commit('sale/add', res.data.model)
					self.$toast.success('Correo encolado para el cliente')
				})
				.catch(function (err) {
					self.enviando = false
					var data = err.response && err.response.data
					var msg = data && data.message ? data.message : 'No se pudo enviar el correo'
					self.$toast.error(msg)
					console.log(err)
				})
		},
	},
}
</script>
