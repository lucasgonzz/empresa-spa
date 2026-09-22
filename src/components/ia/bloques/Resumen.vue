<template>
	<!-- Primer bloque de todo informe (§1.4): dos o tres oraciones, en cuerpo grande. -->
	<p class="informe-resumen">{{ bloque.texto }}</p>
</template>

<script>
export default {
	props: {
		bloque: {
			type: Object,
			required: true,
		},
	},
}
</script>

<style lang="sass">
.informe-resumen
	font-size: 1.12rem
	line-height: 1.6
	color: var(--color-text-primary, #212529)
	margin: 0 0 22px 0
	white-space: pre-wrap
</style>
