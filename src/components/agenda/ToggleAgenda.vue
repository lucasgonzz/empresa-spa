<template>
	<label
	class="toggle-agenda"
	:class="{ 'toggle-agenda--activo': value }"
	:for="id">
		<span class="toggle-agenda__texto">
			<slot></slot>
		</span>
		<span class="toggle-agenda__control">
			<input
			type="checkbox"
			:id="id"
			:data-testid="testid"
			:checked="value"
			@change="$emit('input', $event.target.checked)">
			<span class="toggle-agenda__pista">
				<span class="toggle-agenda__perilla"></span>
			</span>
		</span>
	</label>
</template>
<script>
/*
	Toggle tipo iOS para los dos interruptores del form de tarea ("Se repite", "Tiene un gasto
	asociado"). Mismo dibujo que el toggle de ModelForm.vue (pista con --toggle-track-off, verde al
	encender), envuelto en un label a todo el ancho para que el texto tambien sea clickeable.
	v-model con booleanos.
*/
export default {
	props: {
		value: {
			type: Boolean,
			default: false,
		},
		id: {
			type: String,
			required: true,
		},
		testid: {
			type: String,
			default: null,
		},
	},
}
</script>
<style lang="sass">
.toggle-agenda
	display: flex
	align-items: center
	justify-content: space-between
	gap: 12px
	width: 100%
	margin: 0
	padding: 10px 0
	cursor: pointer
	user-select: none

	&__texto
		font-size: 1rem
		color: var(--color-text-primary)

	&__control
		position: relative
		flex: none
		width: 44px
		height: 26px
		input
			opacity: 0
			width: 0
			height: 0
			position: absolute

	&__pista
		position: absolute
		inset: 0
		border-radius: 9999px
		background: var(--toggle-track-off, #d1d5db)
		// Sin borde, el apagado (gris muy claro en modo claro) se leía sin forma propia contra el
		// fondo blanco del modal -- exactamente el "fondo blanco" que reportó Lucas al crear una
		// tarea. El borde no cambia el color de fondo, solo le da un borde propio al control para
		// que se lea como pastilla y no como una mancha. Mismo token que ya usa el resto de los
		// campos del form (--color-border), en los dos estados: tambien se ve bien sobre el verde.
		border: 1px solid var(--color-border)
		transition: background 0.2s ease, border-color 0.2s ease

	// La perilla es blanca en los dos modos, como en iOS: es un control, no una superficie.
	&__perilla
		position: absolute
		width: 20px
		height: 20px
		left: 3px
		bottom: 3px
		border-radius: 50%
		background: #fff
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25)
		transition: transform 0.2s ease

	input:checked ~ .toggle-agenda__pista
		background: #22c55e
		.toggle-agenda__perilla
			transform: translateX(18px)

	input:focus-visible ~ .toggle-agenda__pista
		box-shadow: 0 0 0 2px var(--color-primary)
</style>
