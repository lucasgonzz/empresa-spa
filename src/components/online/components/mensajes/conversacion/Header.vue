<template>
	<div
	class="tienda-mensajes-header"
	data-testid="tienda-mensajes-header">
		<div class="tienda-mensajes-header__identidad">
			<strong
			class="tienda-mensajes-header__nombre"
			:title="nombre">
				{{ nombre }}
			</strong>
			<span
			v-if="buyer && (buyer.email || buyer.phone)"
			class="tienda-mensajes-header__contacto">
				<!-- Cada dato en su propio <span> recortable: en el sidebar de 320px un email largo no
				puede empujar el teléfono (ni la ×) fuera del panel. -->
				<span
				v-if="buyer.email"
				class="tienda-mensajes-header__dato"
				:title="buyer.email">
					<i class="bi bi-envelope"></i>
					<span class="tienda-mensajes-header__dato-texto">{{ buyer.email }}</span>
				</span>
				<span
				v-if="buyer.phone"
				class="tienda-mensajes-header__dato"
				:title="buyer.phone">
					<i class="bi bi-telephone"></i>
					<span class="tienda-mensajes-header__dato-texto">{{ buyer.phone }}</span>
				</span>
			</span>
			<!-- El comprador de la tienda puede estar vinculado a un cliente del sistema (se vincula
			desde Pedidos o desde Clientes de Tienda Online). Si lo está, se dice con quién. -->
			<span
			v-if="cliente_vinculado"
			class="tienda-mensajes-header__cliente"
			:title="'Vinculado con el cliente del sistema ' + cliente_vinculado">
				<i class="bi bi-person-check"></i>
				<span class="tienda-mensajes-header__dato-texto">Cliente: {{ cliente_vinculado }}</span>
			</span>
		</div>

		<!-- Cierra el sidebar. Botón pelado y no b-button: tiene que leerse como la × de un panel,
		igual que en la conversación de WhatsApp. Se dibuja SIEMPRE, también mientras los datos del
		comprador todavía viajan: sin esto, al abrir por link directo el único modo de cerrar sería
		Escape. -->
		<button
		class="tienda-mensajes-header__cerrar"
		type="button"
		title="Cerrar la conversación"
		data-testid="tienda-mensajes-cerrar"
		@click="cerrar">
			<i class="bi bi-x-lg"></i>
		</button>
	</div>
</template>
<script>
import { nombre_del_comprador } from '@/components/online/components/mensajes/helpers'

/**
 * Header de la conversación de la tienda: quién es el comprador, cómo contactarlo, con qué cliente
 * del sistema está vinculado y la × que cierra el sidebar. Sin acciones de IA, plantillas ni
 * simulación: el pedido es solo intercambio manual.
 */
export default {
	computed: {
		buyer() {
			return this.$store.getters['tienda_mensajes/buyer_abierto']
		},
		buyer_id() {
			return this.$store.state.tienda_mensajes.selected_buyer_id
		},
		nombre() {
			return nombre_del_comprador(this.buyer, this.buyer_id)
		},
		cliente_vinculado() {
			if (!this.buyer || !this.buyer.comercio_city_client) {
				return ''
			}
			return this.buyer.comercio_city_client.name || ''
		},
	},
	methods: {
		cerrar() {
			this.$store.commit('tienda_mensajes/setSidebarAbierto', false)
		},
	},
}
</script>
<style lang="sass">
.tienda-mensajes-header
	display: flex
	flex-direction: row
	justify-content: space-between
	align-items: flex-start
	gap: 8px
	padding: 10px 12px
	background: var(--wa-panel)
	border-bottom: 1px solid var(--wa-borde)
	color: var(--wa-texto)
	&__identidad
		display: flex
		flex-direction: column
		gap: 2px
		// `min-width: 0` para que los textos largos se recorten en vez de empujar la ×.
		min-width: 0
		flex: 1
	&__nombre
		font-size: .95rem
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
	&__contacto
		display: flex
		flex-direction: row
		flex-wrap: wrap
		column-gap: 12px
		row-gap: 2px
		min-width: 0
	&__dato,
	&__cliente
		display: inline-flex
		align-items: center
		gap: 5px
		min-width: 0
		max-width: 100%
		font-size: .75rem
		color: var(--color-text-secondary)
		i
			flex-shrink: 0
	&__dato-texto
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
	&__cerrar
		flex-shrink: 0
		width: 32px
		height: 32px
		border: none
		border-radius: 8px
		background: transparent
		color: var(--wa-texto)
		opacity: var(--wa-texto-tenue-op)
		display: flex
		align-items: center
		justify-content: center
		&:hover
			background: var(--wa-hover)
			opacity: 1
</style>
