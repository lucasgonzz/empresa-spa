<template>
	<section class="robotito-pregunta">
		<button
		v-if="!abierta"
		ref="abrir"
		type="button"
		class="robotito-pregunta__abrir"
		@click="abrir">
			<i class="bi bi-chat-dots" aria-hidden="true"></i>
			Preguntale a Robotito
		</button>
		<form v-else :aria-busy="enviando ? 'true' : 'false'" @submit.prevent="$emit('enviar')">
			<label for="robotito-pregunta-texto">¿Qué querés hacer ahora?</label>
			<textarea
			id="robotito-pregunta-texto"
			ref="texto"
			rows="2"
			maxlength="1500"
			placeholder="Contale a Robotito dónde te trabaste o qué querés ver."
			:readonly="bloqueada"
			:value="value"
			@input="$emit('input', $event.target.value)"></textarea>
			<p v-if="error" role="status">{{ error }}</p>
			<div class="robotito-pregunta__acciones">
				<button type="button" :disabled="enviando" @click="cerrar">Volver</button>
				<button class="robotito-pregunta__enviar" type="submit" :disabled="enviando || !value.trim()">{{ enviando ? 'Enviando…' : 'Enviar pregunta' }}</button>
			</div>
		</form>
	</section>
</template>

<script>
export default {
	props: {
		value: { type: String, default: '' },
		error: { type: String, default: '' },
		bloqueada: Boolean,
		enviando: Boolean,
	},
	data() {
		return { abierta: false }
	},
	methods: {
		abrir() {
			this.abierta = true
			this.$nextTick(() => {
				this.$emit('cambio')
				if (this.$refs.texto) this.$refs.texto.focus({ preventScroll: true })
			})
		},
		cerrar() {
			this.abierta = false
			this.$nextTick(() => {
				this.$emit('cambio')
				if (this.$refs.abrir) this.$refs.abrir.focus({ preventScroll: true })
			})
		},
	},
}
</script>

<style lang="sass" scoped>
.robotito-pregunta
	margin-top: 12px
	padding-top: 10px
	border-top: 1px solid var(--robotito-borde)
	font-size: 13px
	label
		display: block
		margin: 0 0 6px
		color: var(--robotito-texto)
		font-weight: 650
	textarea
		display: block
		box-sizing: border-box
		width: 100%
		min-height: 58px
		max-height: 110px
		padding: 8px 10px
		border: 1px solid var(--robotito-borde)
		border-radius: 10px
		background: var(--robotito-campo)
		color: var(--robotito-texto)
		font: inherit
		resize: none
		&::placeholder
			color: var(--robotito-suave)
	p
		margin: 6px 0
		color: var(--robotito-error)
	button
		min-height: 34px
		padding: 5px 9px
		border: 1px solid var(--robotito-borde)
		border-radius: 9px
		background: var(--robotito-cabecera)
		color: var(--robotito-texto)
		font: inherit
		font-weight: 650
		&:hover:not(:disabled)
			background: var(--robotito-campo)
		&:disabled
			opacity: .45
			cursor: default
	&__abrir, &__acciones
		display: flex
		align-items: center
		gap: 7px
	button.robotito-pregunta__abrir
		padding-left: 0
		padding-right: 0
		border: 0
		background: transparent
		color: var(--robotito-acento)
		&:hover
			background: transparent
			text-decoration: underline
	&__acciones
		justify-content: flex-end
		flex-wrap: wrap
		margin-top: 7px
	button.robotito-pregunta__enviar
		color: var(--robotito-acento)
</style>
