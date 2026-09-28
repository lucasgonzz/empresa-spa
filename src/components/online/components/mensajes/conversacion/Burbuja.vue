<template>
	<div
	class="tienda-mensajes-burbuja"
	:class="{
		'tienda-mensajes-burbuja--in': del_comprador,
		'tienda-mensajes-burbuja--out': !del_comprador,
	}"
	data-testid="tienda-mensajes-burbuja">
		<!-- Mensaje que mandó el sistema solo (pedido confirmado, pago acreditado...): el rótulo
		dice de qué se trata. Sin él se leía como si el comercio lo hubiera escrito a mano. -->
		<div
		v-if="rotulo"
		class="tienda-mensajes-burbuja__rotulo">
			<i class="bi bi-lightning-charge-fill"></i>
			{{ rotulo }}
		</div>

		<p
		v-if="message.text"
		class="tienda-mensajes-burbuja__texto">{{ message.text }}</p>

		<!-- Artículo que acompaña al mensaje (la pregunta respondida de un producto, o el que el
		comprador mandó desde la ficha). Tarjetita liviana: imagen y nombre. -->
		<div
		v-if="message.article"
		class="tienda-mensajes-burbuja__articulo">
			<img
			v-if="message.article.image_url"
			:src="message.article.image_url"
			class="tienda-mensajes-burbuja__articulo-imagen"
			alt="">
			<span
			v-else
			class="tienda-mensajes-burbuja__articulo-sin-imagen">
				<i class="bi bi-box-seam"></i>
			</span>
			<span
			class="tienda-mensajes-burbuja__articulo-nombre"
			:title="message.article.name">
				{{ message.article.name }}
			</span>
		</div>

		<div class="tienda-mensajes-burbuja__pie">
			<span class="tienda-mensajes-burbuja__hora">
				{{ hora }}
			</span>
			<!-- ✓ enviado / ✓✓ el comprador ya lo leyó. Solo en los salientes: el `read` de un
			mensaje del comercio lo marca la tienda cuando el comprador abre sus mensajes. -->
			<span
			v-if="!del_comprador"
			class="tienda-mensajes-burbuja__estado"
			:title="leido ? 'Leído por el comprador' : 'Enviado'">
				<i
				class="bi"
				:class="leido ? 'bi-check2-all tienda-mensajes-burbuja__estado--leido' : 'bi-check2'"></i>
			</span>
		</div>
	</div>
</template>
<script>
import moment from 'moment'
import { es_verdadero, rotulo_del_mensaje } from '@/components/online/components/mensajes/helpers'

/**
 * Burbuja de un mensaje de la conversación de la tienda. Basada en
 * `whatsapp/conversation/MessageBubble.vue` (mismos tokens de burbuja entrante y saliente), sin
 * nada de lo que es propio de WhatsApp: ni medios, ni respuestas de la IA, ni simulación.
 */
export default {
	props: {
		message: {
			type: Object,
			required: true,
		},
	},
	computed: {
		del_comprador() {
			return es_verdadero(this.message.from_buyer)
		},
		leido() {
			return es_verdadero(this.message.read)
		},
		rotulo() {
			return rotulo_del_mensaje(this.message)
		},
		hora() {
			return this.message.created_at ? moment(this.message.created_at).format('HH:mm') : ''
		},
	},
}
</script>
<style lang="sass">
@import '@/components/online/components/mensajes/_tokens'

.tienda-mensajes-burbuja
	max-width: 78%
	padding: 6px 10px
	border-radius: 10px
	margin-bottom: 4px
	box-shadow: 0 1px 1px var(--wa-burbuja-sombra)
	&--in
		align-self: flex-start
		background: var(--wa-burbuja-in)
		color: var(--wa-burbuja-in-texto)
	&--out
		align-self: flex-end
		background: var(--wa-burbuja-out)
		// 🔴 El texto de la saliente NO hereda: en modo oscuro esa burbuja es verde petróleo y el
		// gris del tema claro queda ilegible encima (mismo motivo que en WhatsApp).
		color: var(--wa-burbuja-out-texto)
	&__rotulo
		display: flex
		align-items: center
		gap: 4px
		margin-bottom: 3px
		font-size: .7rem
		font-weight: 700
		// --wa-sender y no --wa-verde: el rótulo va sobre la burbuja saliente, que en claro es
		// verde pálido, y el verde de la marca encima no se lee (1,8:1).
		color: var(--wa-sender)
	&__texto
		margin: 0
		white-space: pre-wrap
		word-break: break-word
		text-align: left
	&__articulo
		display: flex
		align-items: center
		gap: 8px
		margin-top: 6px
		padding: 6px
		border-radius: 8px
		border: 1px solid var(--wa-borde)
		background: var(--wa-panel)
		color: var(--wa-texto)
		min-width: 0
	&__articulo-imagen
		width: 44px
		height: 44px
		object-fit: cover
		border-radius: 6px
		flex-shrink: 0
	&__articulo-sin-imagen
		width: 44px
		height: 44px
		border-radius: 6px
		flex-shrink: 0
		display: flex
		align-items: center
		justify-content: center
		background: var(--wa-hover)
		color: var(--color-text-secondary)
		font-size: 1.2rem
	&__articulo-nombre
		min-width: 0
		font-size: .8rem
		font-weight: 600
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
	&__pie
		display: flex
		flex-direction: row
		justify-content: flex-end
		align-items: center
		gap: 4px
		margin-top: 2px
	&__hora
		font-size: .68rem
		opacity: var(--wa-texto-muy-tenue-op)
	// 🔴 El check se destiñe con `color` y NO con `opacity`: el de "leído" es hijo de este span y
	// trae su propio color, y la opacidad del padre se lo lavaría (mismo tropiezo que ya documentó
	// la burbuja de WhatsApp).
	&__estado
		font-size: .85rem
		line-height: 1
		color: var(--color-text-secondary)
		&--leido
			color: var(--tm-check-leido)

// En teléfono el sidebar ocupa la pantalla entera y el 78% ya deja buen margen.
@media screen and (max-width: 767px)
	.tienda-mensajes-burbuja
		max-width: 85%
</style>
