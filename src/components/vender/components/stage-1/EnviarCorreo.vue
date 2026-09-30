<template>
	<!--
		Checkbox "Enviar correo al cliente": al guardar, el comprobante le llega por mail.

		Elemento `enviar_correo` del diseño de Vender (mision diseno-vender-configurable,
		28/9/2026). Hasta esa mision estaba adentro de stage-1/SelectClient.vue, debajo del
		buscador de clientes; salio a su propio componente para que el diseño lo pueda ubicar o
		sacar sin arrastrar al buscador.

		`v-if` triple: extension + cliente elegido + cliente CON mail. En la demo esto pide un
		cliente de prueba con email cargado; si no lo tiene, el tour saltea el paso. El ancla
		`vender.checkbox_enviar_mail` es la del tour de la demo (clip 2.8) y no se cambia.

		Sacar el cliente apaga el envio: lo hace clearSelected() de SelectClient.vue, que es el que
		sabe cuando se saca el cliente.
	-->
	<div
	v-if="hasExtencion('enviar_mail_a_clientes') && client && client.email"
	data-tour="vender.checkbox_enviar_mail"
	class="vender-enviar-correo">
		<b-form-checkbox
		:value="1"
		:unchecked-value="0"
		v-model="send_mail">
			Enviar correo al cliente
		</b-form-checkbox>
	</div>
</template>

<script>
export default {
	name: 'VenderEnviarCorreo',
	computed: {
		/**
		 * Cliente elegido en la venta.
		 *
		 * @returns {Object|null}
		 */
		client() {
			return this.$store.state.vender.client
		},

		/**
		 * Si al guardar se le manda el comprobante por mail al cliente (1/0, como lo guarda el store).
		 *
		 * @returns {number}
		 */
		send_mail: {
			get() {
				return this.$store.state.vender.send_mail
			},
			set(value) {
				this.$store.commit('vender/set_send_mail', value)
			},
		},
	},
}
</script>

<style lang="sass">
/* Mismo alto que los controles de la etapa (36px) para que el checkbox quede centrado con ellos */
/* cuando comparte fila con el buscador de clientes o con los interruptores. */
.vender-enviar-correo
	display: flex
	align-items: center
	min-height: 36px
</style>
