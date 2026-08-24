<template>
	<div
	class="agent-template-picker"
	:class="'agent-template-picker--' + variant">
		<button
		v-for="item in templates"
		:key="item.key"
		type="button"
		class="agent-template-picker__item"
		:class="{'agent-template-picker__item--selected': item.key === selected_key}"
		:aria-pressed="item.key === selected_key ? 'true' : 'false'"
		@click="$emit('selected', item)">
			<i
			v-if="variant === 'card' && item.key === selected_key"
			class="bi bi-check-circle-fill agent-template-picker__check"></i>
			<i :class="[item.icon_class, 'agent-template-picker__icon']"></i>
			<span class="agent-template-picker__name">{{ item.name }}</span>
			<span
			v-if="variant === 'card'"
			class="agent-template-picker__description">{{ item.description }}</span>
		</button>
	</div>
</template>
<script>
/**
 * Selector visual de plantillas, reutilizable entre personalidad (variante `card`) y
 * habilidades por rubro (variante `chip`). Presentacional puro: no lee el store ni conoce el
 * textarea al que alimenta, solo recibe la lista y la clave seleccionada, y avisa con `selected`
 * cuándo el dueño elige una.
 */
export default {
	props: {
		/** Lista de plantillas: { key, name, description, icon_class, text }. */
		templates: {
			type: Array,
			required: true,
		},
		/** Clave de la plantilla marcada como seleccionada (null = ninguna). */
		selected_key: {
			type: String,
			default: null,
		},
		/** 'card' (con descripción, para personalidad) o 'chip' (compacto, para rubros). */
		variant: {
			type: String,
			default: 'card',
		},
	},
}
</script>
<style lang="sass">
.agent-template-picker
	&--card
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))
		gap: 8px
	&--chip
		display: flex
		flex-wrap: wrap
		gap: 6px
	&__item
		display: flex
		flex-direction: column
		align-items: flex-start
		gap: 4px
		border: 1px solid var(--color-border)
		background: var(--bg-card)
		border-radius: 10px
		padding: 12px
		cursor: pointer
		text-align: left
		position: relative
		transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease
		&:hover
			border-color: var(--color-primary)
			background: var(--bg-hover)
		&--selected
			box-shadow: inset 0 0 0 1px var(--color-primary)
	&__check
		position: absolute
		top: 8px
		right: 8px
		color: var(--color-primary)
		font-size: .8rem
	&__icon
		font-size: 1.05rem
		color: var(--color-text-secondary)
	&__item--selected &__icon
		color: var(--color-primary)
	&__name
		font-weight: 700
		font-size: .875rem
		color: var(--color-text-primary)
	&__item--selected &__name
		color: var(--color-primary)
	&__description
		font-size: .75rem
		color: var(--color-text-secondary)
	&--chip &__item
		flex-direction: row
		align-items: center
		gap: 6px
		border-radius: 999px
		padding: 5px 12px
	&--chip &__icon
		font-size: .9rem
	&--chip &__name
		font-weight: 500
	&--chip &__item--selected
		background: var(--color-primary)
		border-color: var(--color-primary)
		box-shadow: none
	&--chip &__item--selected &__icon
		color: #fff
	&--chip &__item--selected &__name
		color: #fff
</style>
