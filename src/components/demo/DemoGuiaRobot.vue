<template>
	<section class="demo-guia-robot" aria-label="Guía de Vender" @keydown.esc.stop.prevent="$emit('cerrar')">
		<header class="demo-guia-robot__encabezado">
			<robot class="demo-guia-robot__figura" :pose="pensando ? 'pensar' : 'senalar'"></robot>
			<div>
				<strong>Tu guía de Vender</strong>
				<p aria-live="polite">{{ pensando ? 'Estoy pensando cómo seguir…' : texto }}</p>
			</div>
			<button type="button" aria-label="Cerrar guía de Vender" @click="$emit('cerrar')">×</button>
		</header>
		<p v-if="aviso" class="demo-guia-robot__aviso" role="status">{{ aviso }}</p>
		<form @submit.prevent="$emit('enviar')">
			<textarea
			aria-label="Respondé a la guía de Vender"
			placeholder="Respondé o cambiá de idea"
			rows="2"
			maxlength="4000"
			:value="value"
			@input="$emit('input', $event.target.value)"
			@keydown.enter.exact.prevent="$emit('enviar')"></textarea>
			<div class="demo-guia-robot__acciones">
				<button type="button" @click="$emit('pausar')">Pausar guía</button>
				<button type="submit" :disabled="enviando || !value.trim()">Enviar</button>
			</div>
		</form>
	</section>
</template>

<script>
import Robot from '@/components/implementacion/Robot'

export default {
	components: { Robot },
	props: {
		texto: { type: String, default: '' },
		value: { type: String, default: '' },
		aviso: { type: String, default: '' },
		pensando: Boolean,
		enviando: Boolean,
	},
}
</script>

<style lang="sass" scoped>
.demo-guia-robot
	color: #182a5b
	font-size: 14px
	&__encabezado
		display: grid
		grid-template-columns: 36px minmax(0, 1fr) auto
		align-items: start
		gap: 8px
	&__figura
		width: 36px
	&__encabezado p, &__aviso
		margin: 3px 0 8px
		line-height: 1.35
		overflow-wrap: anywhere
	&__aviso
		max-height: 4em
		overflow: auto
	textarea
		display: block
		width: 100%
		padding: 5px 8px
		border: 1px solid #a6b3d4
		border-radius: 6px
		font: inherit
		resize: vertical
	button
		padding: 3px 7px
		border: 1px solid #c2cbe1
		border-radius: 6px
		background: #f5f7ff
		color: #182a5b
		cursor: pointer
	button:disabled
		opacity: .55
		cursor: default
	&__acciones
		display: flex
		justify-content: space-between
		gap: 8px
		margin-top: 5px
</style>
