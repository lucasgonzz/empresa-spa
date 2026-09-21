<template>
	<div class="informe-articulos">
		<h4
		v-if="bloque.titulo"
		class="informe-articulos__titulo">
			{{ bloque.titulo }}
		</h4>
		<div class="informe-articulos__grilla">
			<div
			v-for="(item, index) in items"
			:key="index"
			class="informe-articulos__item"
			:class="['informe-articulos__item--' + tono_de(item), { 'informe-articulos__item--clickeable': !!item.article_id }]"
			:role="item.article_id ? 'button' : null"
			:tabindex="item.article_id ? 0 : null"
			@click="abrir_articulo(item)"
			@keydown.enter="abrir_articulo(item)">
				<!--
					La foto del artículo, o un placeholder con la inicial (§2.3). La imagen tiene
					su propio click con .stop (§2.1 del plan): abre la foto ampliada en vez del
					modal del artículo que dispara el click de la tarjeta. El placeholder (sin
					foto que ampliar) no lo intercepta: ahí el click cae en la tarjeta, como en
					cualquier otro punto de la tarjeta.
				-->
				<span class="informe-articulos__foto">
					<img
					v-if="item.imagen_url"
					:src="item.imagen_url"
					alt=""
					loading="lazy"
					@click.stop="ampliar_imagen(item)">
					<span
					v-else
					class="informe-articulos__inicial"
					aria-hidden="true">
						{{ inicial_de(item) }}
					</span>
				</span>
				<span class="informe-articulos__texto">
					<span class="informe-articulos__nombre">{{ item.nombre }}</span>
					<span
					v-if="item.linea_1"
					class="informe-articulos__linea">
						{{ item.linea_1 }}
					</span>
					<span
					v-if="item.linea_2"
					class="informe-articulos__linea informe-articulos__linea--segunda">
						{{ item.linea_2 }}
					</span>
				</span>
			</div>
		</div>
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
		inicial_de(item) {
			let nombre = (item && item.nombre) ? String(item.nombre).trim() : ''
			return nombre ? nombre.charAt(0).toUpperCase() : '·'
		},
		/**
		 * Click en la tarjeta (misión mostrador-fotos-y-modales): burbujea hasta
		 * Informe.vue, que lo reenvía al bridge que trae el artículo completo y abre su
		 * modal. Sin article_id (contenido depositado antes de esta misión) la tarjeta no
		 * es clickeable: ver la clase --clickeable y el role/tabindex condicionales.
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
		 * Click en la foto (con .stop en el template, para no abrir también el modal).
		 *
		 * @param {Object} item
		 */
		ampliar_imagen(item) {
			if (!item || !item.imagen_url) {
				return
			}
			this.$emit('ampliar-imagen', { url: item.imagen_url, alt: item.nombre })
		},
	},
}
</script>

<style lang="sass">
.informe-articulos
	margin: 0 0 22px 0

	&__titulo
		font-size: .95rem
		font-weight: 600
		margin: 0 0 10px 0
		color: var(--color-text-primary, #212529)

	&__grilla
		display: grid
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr))
		gap: 10px

	&__item
		display: flex
		align-items: center
		gap: 12px
		padding: 10px 12px
		border-radius: 14px
		background: var(--bg-section, #f8f9fa)
		border: 1px solid var(--color-border-secondary, #e9ecef)
		min-width: 0
		transition: background .12s ease

		// Solo la tarjeta con article_id se comporta como botón (§2.1 del plan): un
		// informe depositado antes de esta misión no lo trae y sigue viéndose igual.
		&--clickeable
			cursor: pointer

			&:hover
				background: var(--bg-hover, #f1f3f5)

			&:focus-visible
				outline: 2px solid var(--color-primary, #007bff)
				outline-offset: 2px

	&__foto
		flex-shrink: 0
		width: 48px
		height: 48px
		border-radius: 10px
		overflow: hidden
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border-secondary, #e9ecef)
		display: flex
		align-items: center
		justify-content: center

		img
			width: 100%
			height: 100%
			object-fit: cover
			display: block
			// Su click (con .stop en el template) amplía la foto en vez de abrir el
			// modal: el cursor la distingue del resto de la tarjeta.
			cursor: zoom-in

	&__inicial
		font-size: 1.2rem
		font-weight: 700
		color: var(--color-text-secondary, #6c757d)

	&__texto
		display: flex
		flex-direction: column
		gap: 1px
		min-width: 0

	&__nombre
		font-weight: 600
		font-size: .92rem
		line-height: 1.3
		color: var(--color-text-primary, #212529)
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	&__linea
		font-size: .82rem
		color: var(--color-text-secondary, #6c757d)
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	// El tono tiñe la primera línea (es donde va el dato: "Stock: 3").
	&__item--ok .informe-articulos__linea:not(.informe-articulos__linea--segunda)
		color: var(--informe-tono-ok, #1B9E5A)
		font-weight: 600

	&__item--alerta .informe-articulos__linea:not(.informe-articulos__linea--segunda)
		color: var(--informe-tono-alerta, #D96A00)
		font-weight: 600
</style>
