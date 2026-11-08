<template>
	<section class="robotito-pregunta">
		<button
		v-if="!abierta"
		type="button"
		class="robotito-pregunta__abrir"
		@click="abrir">
			<robot pose="pensar"></robot>
			Preguntale a Robotito
		</button>
		<form v-else @submit.prevent="$emit('enviar')">
			<label for="robotito-pregunta-texto">¿En qué paso necesitás ayuda?</label>
			<textarea
			id="robotito-pregunta-texto"
			ref="texto"
			rows="2"
			maxlength="1500"
			:readonly="bloqueada"
			:value="value"
			@input="$emit('input', $event.target.value)"></textarea>
			<p v-if="error" role="status">{{ error }}</p>
			<div class="robotito-pregunta__acciones">
				<button type="button" :disabled="enviando" @click="cerrar">Volver</button>
				<button type="submit" :disabled="enviando || !value.trim()">{{ enviando ? 'Enviando…' : 'Enviar pregunta' }}</button>
			</div>
		</form>
	</section>
</template>

<script>
import Robot from '@/components/implementacion/Robot'

export default {
	components: { Robot },
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
				if (this.$refs.texto) this.$refs.texto.focus()
			})
		},
		cerrar() {
			this.abierta = false
			this.$nextTick(() => this.$emit('cambio'))
		},
	},
}
</script>

<style lang="sass" scoped>
.robotito-pregunta
	margin-top: .6rem
	padding-top: .6rem
	border-top: 1px solid #cbd5e1
	font-size: .875rem
	label
		display: block
		margin: 0 0 .3rem
	textarea
		display: block
		width: 100%
		padding: .35rem .5rem
		border: 1px solid #94a3b8
		border-radius: 6px
		font: inherit
		resize: vertical
	p
		margin: .35rem 0
		color: #991b1b
	button
		padding: .25rem .5rem
		border: 1px solid #94a3b8
		border-radius: 6px
		background: transparent
		color: inherit
		font: inherit
	&__abrir, &__acciones
		display: flex
		align-items: center
		gap: .35rem
	&__abrir .robot-implementacion
		width: 20px
	&__acciones
		justify-content: flex-end
		flex-wrap: wrap
		margin-top: .4rem
</style>
