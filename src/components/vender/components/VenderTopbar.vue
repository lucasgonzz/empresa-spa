<template>
	<!-- Barra superior del módulo Vender con los atajos de teclado activos -->
	<div class="vender-topbar">
		<span class="vender-topbar__title">Vender</span>

		<!-- Lista de atajos activos; en el futuro serán configurables por usuario -->
		<div class="vender-topbar__shortcuts">
			<span
			v-for="shortcut in active_shortcuts"
			:key="shortcut.key"
			class="vender-topbar__shortcut">
				<kbd class="vender-topbar__kbd">{{ shortcut.key }}</kbd>
				<span class="vender-topbar__label">{{ shortcut.label }}</span>
			</span>
		</div>
	</div>
</template>

<script>
export default {
	name: 'VenderTopbar',
	computed: {
		/**
		 * Lista de atajos de teclado activos que se muestran en la barra.
		 * Hardcodeados por ahora; en el futuro se cargarán desde configuración de usuario.
		 *
		 * @returns {Array<{key: string, label: string}>}
		 */
		active_shortcuts() {
			return [
				{ key: 'F2', label: 'Guardar' },
				{ key: 'F3', label: 'Método de pago' },
				{ key: 'F4', label: 'Imprimir' },
				{ key: 'F5', label: 'Cliente' },
				{ key: 'F6', label: 'Buscar artículo' },
				{ key: 'F7', label: 'Código de barras' },
			]
		},
	},
}
</script>

<style scoped lang="sass">
/* Topbar superior del módulo Vender */
.vender-topbar
	display: flex
	align-items: center
	gap: 16px
	padding: 6px 12px
	background: var(--bg-section, #f8f9fa)
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)
	flex-shrink: 0

	/* Título del módulo */
	&__title
		font-weight: 600
		font-size: 0.85rem
		color: var(--color-text-secondary, #6c757d)
		letter-spacing: 0.05em
		text-transform: uppercase

	/* Contenedor de todos los atajos */
	&__shortcuts
		display: flex
		flex-wrap: wrap
		gap: 8px

	/* Chip de un atajo individual */
	&__shortcut
		display: flex
		align-items: center
		gap: 4px
		font-size: 0.78rem
		color: var(--color-text-secondary, #6c757d)

	/* Tecla de atajo */
	&__kbd
		display: inline-block
		padding: 1px 5px
		font-size: 0.72rem
		font-family: monospace
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border-tertiary, #dee2e6)
		border-radius: 3px
		box-shadow: 0 1px 0 var(--color-border-tertiary, #dee2e6)
		color: var(--color-text-primary, #212529)

	/* Descripción del atajo */
	&__label
		color: var(--color-text-secondary, #6c757d)
</style>
