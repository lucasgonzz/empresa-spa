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
			:class="'informe-lista__item--' + tono_de(item)">
				<span
				class="informe-lista__punto"
				aria-hidden="true"></span>
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

	// La viñeta es un punto del color del tono (tinta apagada si es neutro).
	&__punto
		flex-shrink: 0
		width: 8px
		height: 8px
		border-radius: 50%
		margin-top: .5em
		background: var(--color-text-secondary, #6c757d)

	&__item--ok .informe-lista__punto
		background: var(--informe-tono-ok, #1B9E5A)

	&__item--alerta .informe-lista__punto
		background: var(--informe-tono-alerta, #D96A00)

	&__texto
		white-space: pre-wrap
		min-width: 0
</style>
