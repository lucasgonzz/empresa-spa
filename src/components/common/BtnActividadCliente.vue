<template>
	<!--
		🔴 `@click.stop` NO ES DECORATIVO. Este botón vive en la columna de opciones de una fila
		de la tabla genérica, y el `<tr>` entero tiene su propio `@click` que abre el modal de
		edición del registro (`common-vue/components/display/table/Tr.vue`). Sin `.stop` el click
		burbujea y el operador termina con el modal de actividad Y el de edición encima. Es la
		misma razón por la que lo llevan sus dos botones vecinos (cuenta corriente y WhatsApp).
	-->
	<b-button
	v-if="hasExtencion('tracking_buyers')"
	class="m-l-15"
	variant="outline-info"
	title="Ver qué hizo este cliente en la tienda online"
	@click.stop="abrir">
		<i class="bi bi-graph-up m-r-5"></i>
		Actividad
	</b-button>
</template>
<script>
/**
 * Botón de fila que abre el modal "Actividad en la tienda" para un cliente del ERP o para un
 * comprador de la tienda.
 *
 * Lo usan Clientes (`client/components/clients/Index.vue`, por `client_id`) y Tienda Online →
 * Clientes (`online/components/buyer/Index.vue`, por `buyer_id`), los dos desde el slot
 * `table_left_options` de la tabla genérica.
 *
 * 🔴 Se manda UN id, no los dos: el endpoint contesta 422 si vienen juntos. Y no son
 * intercambiables — un `Buyer` NO es un `Client`: el vínculo `comercio_city_client_id` es
 * opcional y manual, así que hay compradores que solo se alcanzan desde Tienda Online.
 *
 * 🔴 El gate es `hasExtencion('tracking_buyers')`, la MISMA extensión con la que el backend
 * gatea las dos rutas. Es el interruptor del tracking de las dos puntas: sin ella la tienda no
 * manda un solo evento y la ingesta no escribe una sola fila, así que el botón sería un click
 * muerto contra un endpoint que además contesta 403.
 *
 * **No emite eventos ni recibe la actividad.** Commitea a quién hay que mirar en
 * `store/actividad_cliente` y abre el modal por id; el pedido lo dispara el propio modal en su
 * `@show`. El modal se monta UNA vez por vista, como hermano del `<view-component>`: adentro
 * del slot se instanciaría una vez por fila de la tabla.
 *
 * ⚠️ En Vue 2 `initMethods` corre DESPUÉS de `initProps`, así que un método de un mixin global
 * que se llame igual que una prop la PISA. Verificado el 17/8/2026: ningún mixin global declara
 * `client_id`, `buyer_id` ni `nombre`. Si alguna vez hay que agregar uno con esos nombres, este
 * componente se rompe en silencio (Vue solo tira un warning de desarrollo). Es exactamente lo
 * que le pasó al botón de WhatsApp del comprobante el 7/8/2026.
 */
export default {
	props: {
		/**
		 * Id del cliente del ERP. Es la puerta de Clientes. Un cliente puede tener varios
		 * compradores en la tienda y la actividad viene SUMADA entre todos ellos.
		 */
		client_id: {
			type: [Number, String],
			default: null,
		},
		/**
		 * Id del comprador de la tienda. Es la puerta de Tienda Online → Clientes, y la única
		 * que alcanza a los compradores que no están asociados a ningún cliente del sistema.
		 */
		buyer_id: {
			type: [Number, String],
			default: null,
		},
		/**
		 * Nombre para el título del modal. Solo se muestra; no viaja al backend.
		 */
		nombre: {
			type: String,
			default: '',
		},
	},
	methods: {
		abrir() {
			this.$store.commit('actividad_cliente/setAbiertoPara', {
				client_id: this.client_id || null,
				buyer_id: this.buyer_id || null,
				nombre: this.nombre || '',
			})
			// El commit va ANTES del show: el `@show` del modal es el que dispara el pedido y
			// necesita saber a quién está mirando cuando corre.
			this.$bvModal.show('actividad-cliente')
		},
	},
}
</script>
