<template>
	<p class="informe-parrafo">{{ bloque.texto }}</p>
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
.informe-parrafo
	font-size: .95rem
	line-height: 1.6
	margin: 0 0 14px 0
	white-space: pre-wrap
	color: var(--color-text-primary, #212529)
</style>
