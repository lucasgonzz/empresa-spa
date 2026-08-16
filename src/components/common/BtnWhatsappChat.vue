<template>
	<!--
		🔴 `@click.stop` NO ES DECORATIVO. Estos botones viven en la columna de opciones de una
		fila de la tabla genérica, y el `<tr>` entero tiene su propio `@click` que abre el modal
		de edición del registro (`common-vue/components/display/table/Tr.vue`). Sin `.stop` el
		click burbujea y el operador termina con el sidebar abierto Y el modal de edición encima.
		Es la misma razón por la que lo lleva el botón vecino de cuenta corriente.
	-->
	<b-button
	v-if="hasExtencion('whatsapp') && telefono_normalizado"
	class="m-l-15"
	variant="success"
	title="Abrir la conversación de WhatsApp"
	@click.stop="abrir">
		<i class="bi bi-whatsapp"></i>
		WhatsApp
	</b-button>
</template>
<script>
import { normalizar_telefono } from '@/utils/whatsapp_phone'

/**
 * Botón de fila que abre el sidebar de conversación de WhatsApp para un teléfono.
 *
 * Lo usan Clientes (`client/components/clients/Index.vue`) y Pedidos online
 * (`online/components/orders/Index.vue`), los dos desde el slot `table_left_options` de la
 * tabla genérica. Compradores NO lo usa: ese botón se declara en `models/buyer.js` y no tiene
 * template en el que colgarlo, así que se engancha desde `mixins/model_functions.js`.
 *
 * **No emite eventos ni recibe el chat.** Despacha `abrir_chat_whatsapp()`, que es un método
 * del mixin global (`mixins/route_functions.js`, entra por `Vue.mixin`), y de ahí en más el
 * estado vive en `store/whatsapp_chat.js`, que es singleton. No hace falta chequear antes si el
 * chat existe: `createChat` es idempotente por teléfono (crea o recupera).
 *
 * `display_name` viaja hasta la base y le pone el nombre al contacto cuando el chat se crea: lo
 * reenvía `whatsapp_chat/abrirChat` y lo guarda `WhatsappChatController::store()`. Solo aplica al
 * crear — si el chat ya existía, no le pisa el nombre que tenía.
 *
 * ⚠️ Sobre el nombre de la prop `phone`: en Vue 2 `initMethods` corre DESPUÉS de `initProps` y
 * hace `vm[key] = bind(...)`, así que un método de un mixin global PISA cualquier prop que se
 * llame igual. Vivía un `phone()` muerto en `common-vue/mixins/dates.js` que rompió justamente
 * el botón de WhatsApp del comprobante (7/8/2026); ya se borró, y hoy ningún mixin global
 * declara `phone`, `client_id` ni `display_name` (verificado el 15/8/2026). Si alguna vez hay
 * que agregar un método con alguno de esos nombres, este componente se rompe en silencio: Vue
 * solo tira un warning de desarrollo.
 */
export default {
	props: {
		/**
		 * Teléfono crudo del contacto, tal como lo trae el modelo. Se normaliza acá adentro;
		 * el llamador no tiene que limpiarlo.
		 */
		phone: {
			type: String,
			default: '',
		},
		/**
		 * Id del cliente del ERP, cuando el contacto es uno. Deja el chat ya vinculado y ahorra
		 * el paso manual de "Vincular cliente". En Pedidos no se pasa: el comprador de la tienda
		 * es un `Buyer`, que no es un `Client`.
		 */
		client_id: {
			type: [Number, String],
			default: null,
		},
		display_name: {
			type: String,
			default: '',
		},
	},
	computed: {
		telefono_normalizado() {
			return normalizar_telefono(this.phone)
		},
	},
	methods: {
		/**
		 * El `.catch` ya lo pone `abrir_chat_whatsapp()` (loguea y muestra un toast), así que
		 * acá no se encadena nada: el botón no tiene estado propio que revertir si falla.
		 */
		abrir() {
			this.abrir_chat_whatsapp({
				phone: this.telefono_normalizado,
				client_id: this.client_id,
				display_name: this.display_name,
			})
		},
	},
}
</script>
