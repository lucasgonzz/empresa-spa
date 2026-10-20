<template>
	<!--
		🔴 `@click.stop` no es decorativo: el botón vive en la columna de opciones de una fila de la
		tabla genérica y el `<tr>` entero tiene su propio `@click` que abre el modal de edición del
		pedido (`common-vue/components/display/table/Tr.vue`). Sin `.stop` el operador termina con
		el modal de envío Y el de edición abiertos, uno encima del otro. Misma razón que
		`BtnWhatsappChat`, el botón vecino.
	-->
	<span
	v-if="mostrar"
	class="envio-btn">
		<b-button
		class="m-l-15"
		variant="outline-primary"
		title="Envío del pedido: destinatario, dirección en el mapa y forma de envío"
		:data-testid="'order-envio-btn-' + order.id"
		@click.stop="abrir">
			<i class="bi bi-truck"></i>
			Envío
		</b-button>

		<envio-modal
		:order="order"></envio-modal>
	</span>
</template>
<script>
import EnvioModal from '@/components/online/components/orders/envio/EnvioModal'

/**
 * Botón de fila "Envío" de Pedidos online (misión zipnova-envios, 14/9/2026).
 *
 * Desde la misión formas-envio-direcciones-maps (19/10/2026) se dibuja para TODO pedido con envío
 * a domicilio (`deliver == 1`), salga por Zipnova o por una forma de envío propia del comercio
 * ("Acordar con el vendedor"): en los dos casos el vendedor necesita el destinatario y la
 * dirección en el mapa para gestionar la entrega. Se sigue dibujando, además, si el pedido trae
 * una opción de Zipnova (`envio_opcion`) o un `envio` generado, como antes. Un pedido con retiro
 * por local no lo muestra.
 *
 * Abre `EnvioModal`, que es donde se ve el destinatario, la dirección (que abre el mapa), la forma
 * de envío elegida y, si va por Zipnova, el estado del envío y sus acciones. Va montado desde el
 * slot `table_left_options` de `online/components/orders/Index.vue`, igual que el botón de
 * WhatsApp.
 */
export default {
	components: {
		// Import estático a propósito: el botón y su modal van juntos. Con un import perezoso,
		// un clic apenas pintada la fila (red lenta) llegaría antes de que el modal exista y
		// `$bvModal.show()` no abriría nada. EnvioBtn ya entra perezoso desde Index.vue.
		EnvioModal,
	},
	props: {
		// El pedido de la fila, tal como viene del store (con `envio` por withAll)
		order: {
			type: Object,
			required: true,
		},
	},
	computed: {
		// Pedido con envío a domicilio (Zipnova o forma propia), o con algo de Zipnova encima
		mostrar() {
			if (!this.order) {
				return false
			}
			return Number(this.order.deliver) === 1 || !!this.order.envio_opcion || !!this.order.envio
		},
	},
	methods: {
		/**
		 * Abre el modal de envío de este pedido (id único por pedido, ya que cada fila monta el suyo).
		 *
		 * @returns {void}
		 */
		abrir() {
			this.$bvModal.show('order-envio-' + this.order.id)
		},
	},
}
</script>
