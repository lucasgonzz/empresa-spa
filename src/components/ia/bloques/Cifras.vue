<template>
	<!-- Hasta 6 cifras grandes con su etiqueta, detalle y variación, coloreadas por tono. -->
	<div class="informe-cifras">
		<div
		v-for="(item, index) in items"
		:key="index"
		class="informe-cifras__item"
		:class="'informe-cifras__item--' + tono_de(item)">
			<span class="informe-cifras__etiqueta">{{ item.etiqueta }}</span>
			<span class="informe-cifras__valor">{{ item.valor }}</span>
			<span
			v-if="item.detalle"
			class="informe-cifras__detalle">
				{{ item.detalle }}
			</span>
			<span
			v-if="item.variacion"
			class="informe-cifras__variacion">
				{{ item.variacion }}
			</span>
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
}
</script>

<style lang="sass">
.informe-cifras
	display: grid
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr))
	gap: 12px
	margin: 0 0 22px 0

	&__item
		display: flex
		flex-direction: column
		gap: 2px
		padding: 14px 16px
		border-radius: 14px
		background: var(--bg-section, #f8f9fa)
		border: 1px solid var(--color-border-secondary, #e9ecef)
		min-width: 0

	&__etiqueta
		font-size: .78rem
		font-weight: 600
		letter-spacing: .02em
		text-transform: uppercase
		color: var(--color-text-secondary, #6c757d)

	// La cifra grande: tinta por defecto, verde con tono ok, naranja con alerta.
	&__valor
		font-size: 1.55rem
		font-weight: 700
		letter-spacing: -0.02em
		line-height: 1.15
		color: var(--color-text-primary, #212529)
		overflow-wrap: anywhere

	&__detalle
		font-size: .85rem
		color: var(--color-text-secondary, #6c757d)

	&__variacion
		font-size: .82rem
		font-weight: 600
		color: var(--color-text-secondary, #6c757d)
		margin-top: 2px

	&__item--ok
		.informe-cifras__valor,
		.informe-cifras__variacion
			color: var(--informe-tono-ok, #1B9E5A)

	&__item--alerta
		.informe-cifras__valor,
		.informe-cifras__variacion
			color: var(--informe-tono-alerta, #D96A00)
</style>
