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
			:class="'informe-articulos__item--' + tono_de(item)">
				<!-- La foto del artículo, o un placeholder con la inicial (§2.3). -->
				<span class="informe-articulos__foto">
					<img
					v-if="item.imagen_url"
					:src="item.imagen_url"
					alt=""
					loading="lazy">
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
