<template>
	<div class="display-empty-state">
		<div class="display-empty-state__icon">
			<i :class="icon_class"></i>
		</div>
		<p class="display-empty-state__title">
			{{ title }}
		</p>
		<p
		v-if="hint"
		class="display-empty-state__hint">
			{{ hint }}
		</p>
		<div
		v-if="$slots.default"
		class="display-empty-state__action">
			<slot></slot>
		</div>
	</div>
</template>
<script>
/**
 * Estado vacío de las tablas del display. Presentacional puro: no lee el store ni emite
 * nada, todo llega por props para poder reusarlo con distinto texto/ícono según el caso
 * (sin filtros vs. filtros sin resultados).
 */
export default {
	props: {
		icon_class: {
			type: String,
			default: 'icon-list',
		},
		title: {
			type: String,
			required: true,
		},
		hint: {
			type: String,
			default: null,
		},
	},
}
</script>
<style scoped lang="sass">
.display-empty-state
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	text-align: center
	padding: 48px 20px

.display-empty-state__icon
	width: 52px
	height: 52px
	border-radius: 50%
	background: var(--bg-hover, #f1f3f5)
	color: var(--color-text-secondary, #6c757d)
	font-size: 1.35rem
	display: flex
	align-items: center
	justify-content: center
	margin-bottom: 14px
	/* Los iconos del set traen margin-right en su :before; adentro del círculo circular eso lo descentra. */
	[class^='icon-']:before
		margin-right: 0

.display-empty-state__title
	margin: 0
	font-size: 1rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.display-empty-state__hint
	margin: 6px 0 0
	max-width: 320px
	font-size: .85rem
	line-height: 1.45
	color: var(--color-text-secondary, #6c757d)

.display-empty-state__action
	margin-top: 16px
</style>
