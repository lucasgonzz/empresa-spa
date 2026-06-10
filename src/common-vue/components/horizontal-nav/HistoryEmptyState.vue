<template>
<div class="nav-history-empty-state">
	<!-- Icono circular que identifica visualmente el tipo de historial vacío -->
	<div class="nav-history-empty-state__icon">
		<i :class="icon_class"></i>
	</div>
	<!-- Título principal del estado vacío -->
	<p class="nav-history-empty-state__title">
		{{ title }}
	</p>
	<!-- Texto secundario con contexto para el usuario -->
	<p class="nav-history-empty-state__hint">
		{{ hint }}
	</p>
</div>
</template>
<script>
/**
 * Placeholder visual para modales de historial sin registros.
 * Presenta icono, título y texto de ayuda con estilo limpio y centrado.
 */
export default {
	props: {
		// Clase del icono del set del proyecto (p. ej. icon-history)
		icon_class: {
			type: String,
			required: true,
		},
		// Mensaje principal que indica que aún no hay datos
		title: {
			type: String,
			required: true,
		},
		// Descripción breve que orienta al usuario sobre cuándo verá registros
		hint: {
			type: String,
			required: true,
		},
	},
}
</script>
<style scoped lang="sass">
.nav-history-empty-state
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	gap: 6px
	padding: 2.5rem 1.5rem
	border: 1px dashed #dee2e6
	border-radius: 8px
	background: #fafbfc
	text-align: center

.nav-history-empty-state__icon
	display: flex
	align-items: center
	justify-content: center
	width: 52px
	height: 52px
	margin-bottom: 4px
	border-radius: 50%
	background: #f0f2f5
	color: #6c757d
	font-size: 1.4rem

.nav-history-empty-state__title
	margin: 0
	font-size: 1rem
	font-weight: 600
	color: #343a40

.nav-history-empty-state__hint
	margin: 0
	max-width: 320px
	font-size: 0.85rem
	line-height: 1.45
	color: #6c757d
</style>
