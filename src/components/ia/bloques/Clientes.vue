<template>
	<div class="informe-clientes">
		<h4
		v-if="bloque.titulo"
		class="informe-clientes__titulo">
			{{ bloque.titulo }}
		</h4>
		<ul class="informe-clientes__items">
			<li
			v-for="(item, index) in items"
			:key="index"
			class="informe-clientes__item"
			:class="'informe-clientes__item--' + tono_de(item)">
				<span
				class="informe-clientes__punto"
				aria-hidden="true"></span>
				<span class="informe-clientes__texto">
					<!-- El nombre abre el modal del cliente (§2.3 del plan): mismo lenguaje
					visual que la mención de cliente del chat IA (MessageBubble.vue), para que
					se lea como el mismo gesto en todo el sistema. -->
					<span
					class="informe-clientes__nombre"
					role="button"
					tabindex="0"
					@click="abrir_cliente(item)"
					@keydown.enter="abrir_cliente(item)">
						{{ item.nombre }}
					</span>
					<span
					v-if="item.linea_1"
					class="informe-clientes__linea">
						{{ item.linea_1 }}
					</span>
					<span
					v-if="item.linea_2"
					class="informe-clientes__linea informe-clientes__linea--segunda">
						{{ item.linea_2 }}
					</span>
				</span>
				<!-- La deuda es un click aparte (§2.3 del plan): abre la cuenta corriente,
				no el modal del cliente. -->
				<button
				v-if="item.deuda"
				type="button"
				class="informe-clientes__deuda"
				:title="'Ver la cuenta corriente de ' + item.nombre"
				@click="ver_cuenta_corriente(item)">
					{{ item.deuda }}
				</button>
			</li>
		</ul>
	</div>
</template>

<script>
import tono from '@/components/ia/bloques/tono'

/**
 * Bloque `clientes` (misión mostrador-fotos-y-modales, 21/9/2026), hermano de
 * `articulos`: "clientes que más deben" (dia y caja) y "clientes del local en la
 * tienda". Clic en el nombre abre el modal del cliente; clic en la deuda (si vino) abre
 * su cuenta corriente. Los clientes no tienen foto en el sistema, así que no hay
 * miniatura — solo el punto del tono, como en Lista.vue.
 */
export default {
	mixins: [tono],
	props: {
		bloque: {
			type: Object,
			required: true,
		},
	},
	computed: {
		items() {
			return Array.isArray(this.bloque.items) ? this.bloque.items : []
		},
	},
	methods: {
		/**
		 * Click (o Enter) en el nombre: burbujea hasta Informe.vue, que lo reenvía al
		 * bridge que trae el cliente completo y abre su modal.
		 *
		 * @param {Object} item
		 */
		abrir_cliente(item) {
			if (!item || !item.client_id) {
				return
			}
			this.$emit('abrir-cliente', item.client_id)
		},
		/**
		 * Click en el chip de deuda: reusa el bridge que YA existe y está montado
		 * siempre que el mostrador puede verse (FloatingButton.vue en App.vue, gateado
		 * por la misma extensión asistente_ia que gatea al mostrador) — el mismo
		 * mecanismo que ya usa la mención de cliente del chat IA
		 * (asistente-ia/MessageBubble.vue → ai_chat/pedirCuentaCorrienteDeCliente →
		 * asistente-ia/CuentaCorrienteDeMencion.vue). No hace falta un bridge propio acá.
		 *
		 * @param {Object} item
		 */
		ver_cuenta_corriente(item) {
			if (!item || !item.client_id) {
				return
			}
			this.$store.commit('ai_chat/pedirCuentaCorrienteDeCliente', {
				client_id: item.client_id,
				nombre: item.nombre,
			})
		},
	},
}
</script>

<style lang="sass">
.informe-clientes
	margin: 0 0 18px 0

	&__titulo
		font-size: .95rem
		font-weight: 600
		margin: 0 0 8px 0
		color: var(--color-text-primary, #212529)

	&__items
		list-style: none
		margin: 0
		padding: 0
		display: flex
		flex-direction: column
		gap: 6px

	&__item
		display: flex
		align-items: flex-start
		gap: 10px
		font-size: .95rem
		line-height: 1.5
		color: var(--color-text-primary, #212529)

	// La viñeta es un punto del color del tono (tinta apagada si es neutro), igual
	// criterio que Lista.vue.
	&__punto
		flex-shrink: 0
		width: 8px
		height: 8px
		border-radius: 50%
		margin-top: .58em
		background: var(--color-text-secondary, #6c757d)

	&__item--ok .informe-clientes__punto
		background: var(--informe-tono-ok, #1B9E5A)

	&__item--alerta .informe-clientes__punto
		background: var(--informe-tono-alerta, #D96A00)

	&__texto
		flex: 1
		min-width: 0
		display: flex
		flex-direction: column
		gap: 1px

	// Mismo tinte que la mención de cliente del chat IA (asistente-ia/MessageBubble.vue
	// .asistente-ia-mencion--cliente): el mismo gesto visual en todo el sistema para
	// "este texto abre a una persona".
	&__nombre
		display: inline
		font-weight: 600
		color: var(--color-primary, #007bff)
		cursor: pointer
		text-decoration: underline
		text-decoration-color: rgba(0, 123, 255, .35)
		text-underline-offset: 2px
		border-radius: 4px

		&:hover
			text-decoration-color: var(--color-primary, #007bff)

		&:focus-visible
			outline: 2px solid var(--color-primary, #007bff)
			outline-offset: 2px

	&__linea
		font-size: .82rem
		color: var(--color-text-secondary, #6c757d)

	// La deuda es un chip aparte, tono-coloreado (casi siempre "alerta"): que se lea
	// como un dato accionable propio, no como parte del renglón.
	&__deuda
		flex-shrink: 0
		border: 1px solid var(--color-border-secondary, #e9ecef)
		background: var(--bg-card, #fff)
		color: var(--informe-tono-alerta, #D96A00)
		font-weight: 600
		font-size: .82rem
		border-radius: 999px
		padding: 3px 12px
		cursor: pointer
		transition: background .12s ease, border-color .12s ease

		&:hover
			background: var(--bg-hover, #f1f3f5)
			border-color: var(--informe-tono-alerta, #D96A00)

		&:focus-visible
			outline: 2px solid var(--color-primary, #007bff)
			outline-offset: 2px
</style>
