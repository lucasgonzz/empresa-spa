<template>
	<div
	v-if="sale">
		<btn-loader
		size="sm"
		text="Enviar por el agente"
		icon_class="bi bi-robot"
		variant="outline-success"
		:block="false"
		:loader="loading"
		@clicked="send"></btn-loader>
	</div>
</template>
<script>
/**
 * Botón "Enviar por el agente" del modal de detalle de Ventas (grupo 137, Prompt 06).
 *
 * A diferencia de `WhatsappBtn.vue` (que abre `wa.me` y depende del celular del operador),
 * este botón manda el comprobante directo desde el backend usando la configuración del bot
 * de WhatsApp de la empresa (`POST sales/{id}/send-whatsapp-agent`, ver `SaleController` en
 * empresa-api). No reemplaza al botón existente: convive con él (ver `Index.vue`).
 */
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		sale: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		send() {
			this.loading = true
			this.$api.post('sales/' + this.sale.id + '/send-whatsapp-agent')
			.then(() => {
				this.loading = false
				this.$toast.success('Comprobante enviado por WhatsApp')
			})
			.catch(err => {
				this.loading = false
				console.log(err)
				/*
					El backend responde 422 con `message` legible ante condiciones esperables
					(sin teléfono, sin configuración, plantilla no aprobada, etc.).
				*/
				let data = err.response && err.response.data
				let message = (data && data.message) || 'No se pudo enviar el comprobante por WhatsApp'
				this.$toast.error(message)
			})
		},
	},
}
</script>
