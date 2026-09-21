<template>
	<div class="informe-lista">
		<h4
		v-if="bloque.titulo"
		class="informe-lista__titulo">
			{{ bloque.titulo }}
		</h4>
		<ul class="informe-lista__items">
			<li
			v-for="(item, index) in items"
			:key="index"
			class="informe-lista__item"
			:class="['informe-lista__item--' + tono_de(item), { 'informe-lista__item--clickeable': !!item.article_id }]"
			:role="item.article_id ? 'button' : null"
			:tabindex="item.article_id ? 0 : null"
			@click="abrir_articulo(item)"
			@keydown.enter="abrir_articulo(item)">
				<span
				class="informe-lista__punto"
				aria-hidden="true"></span>
				<!--
					Miniatura del artículo, solo si el ítem lo referencia (§2.2 del plan): "volvió
					a venderse" o "se quedó sin stock" la traen; la libreta de la Agenda o una
					búsqueda sin resultado, no. Su click (con .stop) amplía la foto en vez de abrir
					el modal que dispara el click del renglón.
				-->
				<img
				v-if="item.imagen_url"
				:src="item.imagen_url"
				alt=""
				loading="lazy"
				class="informe-lista__foto"
				@click.stop="ampliar_imagen(item)">
				<span class="informe-lista__texto">{{ item.texto }}</span>
			</li>
		</ul>
	</div>
</template>

<script>
import tono from '@/components/ia/bloques/tono'

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
		 * Click en el renglón (misión mostrador-fotos-y-modales): burbujea hasta
		 * Informe.vue, que lo reenvía al bridge que trae el artículo completo y abre su
		 * modal. Sin article_id el renglón no es clickeable (agenda, búsquedas, y todo
		 * contenido depositado antes de esta misión).
		 *
		 * @param {Object} item
		 */
		abrir_articulo(item) {
			if (!item || !item.article_id) {
				return
			}
			this.$emit('abrir-articulo', item.article_id)
		},
		/**
		 * Click en la miniatura (con .stop en el template, para no abrir también el modal).
		 *
		 * @param {Object} item
		 */
		ampliar_imagen(item) {
			if (!item || !item.imagen_url) {
				return
			}
			this.$emit('ampliar-imagen', { url: item.imagen_url, alt: item.texto })
		},
	},
}
</script>

<style lang="sass">
.informe-lista
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
		border-radius: 8px
		// Compensado con un margin negativo igual: un renglón SIN article_id (la mayoría
		// del sistema hoy) queda pixel a pixel donde estaba, sin este padding pensado
		// para el hover del que sí es clickeable.
		padding: 3px 6px
		margin: -3px -6px
		transition: background .12s ease

		// Solo el renglón con article_id se comporta como botón (§2.2 del plan): un
		// informe depositado antes de esta misión no lo trae y sigue viéndose igual.
		&--clickeable
			cursor: pointer

			&:hover
				background: var(--bg-hover, #f1f3f5)

			&:focus-visible
				outline: 2px solid var(--color-primary, #007bff)
				outline-offset: 2px

	// La viñeta es un punto del color del tono (tinta apagada si es neutro).
	&__punto
		flex-shrink: 0
		width: 8px
		height: 8px
		border-radius: 50%
		margin-top: .58em
		background: var(--color-text-secondary, #6c757d)

	&__item--ok .informe-lista__punto
		background: var(--informe-tono-ok, #1B9E5A)

	&__item--alerta .informe-lista__punto
		background: var(--informe-tono-alerta, #D96A00)

	// Miniatura chica (§2.2 del plan: "tamaño acorde al diseño", más chica que las
	// tarjetas de 48px de Articulos.vue): acompaña al renglón sin ensancharlo.
	&__foto
		flex-shrink: 0
		width: 28px
		height: 28px
		border-radius: 6px
		object-fit: cover
		border: 1px solid var(--color-border-secondary, #e9ecef)
		// Su click (con .stop en el template) amplía la foto en vez de abrir el modal.
		cursor: zoom-in

	&__texto
		white-space: pre-wrap
		min-width: 0
</style>
