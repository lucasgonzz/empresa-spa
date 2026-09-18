<template>
	<h3 class="informe-seccion">{{ bloque.titulo }}</h3>
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
.informe-seccion
	font-size: 1.05rem
	font-weight: 700
	letter-spacing: -0.005em
	margin: 26px 0 10px 0
	padding-top: 16px
	border-top: 1px solid var(--color-border-secondary, #e9ecef)
	color: var(--color-text-primary, #212529)

	// La primera sección después del resumen no necesita la línea de arriba.
	.informe-resumen + &
		border-top: none
		padding-top: 0
		margin-top: 6px
</style>
