<template>
	<div class="robotito-aviso" :class="{ 'robotito-aviso--movil': movil }">
		<button
		ref="iniciar"
		type="button"
		class="robotito-aviso__iniciar"
		:disabled="ocupado"
		:aria-label="'Iniciar recorrido de Robotito: ' + guia.titulo"
		:title="guia.titulo"
		@click="$emit('iniciar')">
			<span class="robotito-aviso__texto">
				<strong>Robotito te espera</strong>
				<small>{{ guia.titulo }}</small>
			</span>
			<robot></robot>
		</button>
		<button
		type="button"
		class="robotito-aviso__descartar"
		:disabled="ocupado"
		aria-label="Descartar recorrido de Robotito"
		title="Descartar recorrido"
		@click="$emit('descartar')">×</button>
	</div>
</template>

<script>
import Robot from '@/components/implementacion/Robot'

export default {
	components: { Robot },
	props: {
		guia: { type: Object, required: true },
		ocupado: Boolean,
		movil: Boolean,
	},
	mounted() {
		if (typeof IntersectionObserver !== 'function') return
		const self = this
		this._observador = new IntersectionObserver(function (entradas) {
			if (entradas.some(entrada => entrada.isIntersecting && entrada.intersectionRatio > 0)) {
				self.$emit('visible')
				self._observador.disconnect()
			}
		})
		this._observador.observe(this.$refs.iniciar)
	},
	beforeDestroy() {
		if (this._observador) this._observador.disconnect()
	},
}
</script>

<style lang="sass" scoped>
.robotito-aviso
	position: relative
	flex: 0 0 auto
	margin: 0
	max-width: 240px
	color: #eef2ff
	background: #1e2a55
	border: 1px solid #667ab8
	border-radius: 12px
	box-shadow: 0 3px 10px #0f172a33
	button
		color: inherit
		border: 0
		background: transparent
		&:focus-visible
			outline: 2px solid #a5b4fc
			outline-offset: -2px
	&__iniciar
		display: flex
		width: 100%
		align-items: center
		justify-content: space-between
		gap: .5rem
		padding: 4px 28px 4px 7px
		border-radius: 10px
		text-align: left
		&:hover
			background: rgba(99, 102, 241, .25)
		.robot-implementacion
			order: -1
			width: 34px
			flex-shrink: 0
	&__texto
		display: flex
		min-width: 0
		flex-direction: column
		line-height: 1.2
		small
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
	&__descartar
		position: absolute
		inset: 0 0 0 auto
		width: 26px
		border-radius: 8px
		font-size: 1.2rem
		&:hover
			background: rgba(99, 102, 241, .25)
	&--movil
		display: flex
		margin: 0 0 0 auto
		background: transparent
		border: 0
		box-shadow: none
		.robotito-aviso__iniciar
			width: auto
			min-height: 44px
			padding: 3px
		.robotito-aviso__texto
			display: none
		.robotito-aviso__descartar
			position: static
		#app:has(.support-chat-overlay) &
			z-index: 1054
</style>
