<template>
	<button
		v-if="aviso"
		type="button"
		class="boton-aviso-implementacion"
		title="Ver avance de Implementación"
		@click.stop="abrir"
	>
		<robot></robot>
		<span class="vineta">
			<strong>{{ mensaje }}</strong>
			<span class="llamada"><i class="bi bi-hand-index-thumb" aria-hidden="true"></i> Tocá para ver</span>
		</span>
	</button>
</template>

<script>
import Robot from './Robot'

export default {
	components: { Robot },
	computed: {
		aviso() {
			const estado = this.$store.state.implementacion
			return estado.disponible && !estado.apertura && this.$store.getters['implementacion/aviso_pendiente']
		},
		mensaje() {
			if (this.aviso.etapa === 4 && this.aviso.estado !== 'error') {
				return 'Ya importamos tu información.'
			}
			return this.aviso.titulo
		},
	},
	methods: {
		abrir(event) {
			const rect = event.currentTarget.getBoundingClientRect()
			this.$store.commit('implementacion/abrir', {
				hito: this.aviso,
				origen: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
				foco: event.currentTarget,
			})
		},
	},
}
</script>

<style lang="sass" scoped>
.boton-aviso-implementacion
	position: relative
	display: inline-flex
	align-items: center
	gap: .45rem
	padding: 0
	border: 0
	border-radius: 1rem
	background: transparent
	font: inherit
	text-align: left
	.robot-implementacion
		width: 4.65rem
		flex-shrink: 0
		filter: drop-shadow(0 3px 5px #15295580)
	&:focus-visible
		outline: 2px solid #3776ef
		outline-offset: 2px
	&:hover .vineta
		background: #263f87

.vineta
	position: relative
	padding: .45rem .65rem
	border: 1px solid #81a5f6
	border-radius: .7rem
	background: #182a5b
	color: #fff
	font-size: .82rem
	line-height: 1.2
	box-shadow: 0 4px 12px #15295545
	&::before
		content: ''
		position: absolute
		left: -.32rem
		top: calc(50% - .27rem)
		width: .55rem
		height: .55rem
		background: inherit
		border-left: inherit
		border-bottom: inherit
		transform: rotate(45deg)

.llamada
	display: block
	margin-top: .25rem
	color: #cfddff
	font-size: .73rem
	i
		display: inline-block
		margin-right: .12rem
		animation: indicar-click 1.4s ease-in-out infinite

@keyframes indicar-click
	0%, 100%
		transform: translateY(0)
	50%
		transform: translateY(-.2rem) scale(1.2)

@media (max-width: 767px)
	.boton-aviso-implementacion .robot-implementacion
		width: 3rem
	.vineta
		max-width: 9rem
		font-size: .73rem

@media (prefers-reduced-motion: reduce)
	.llamada i
		animation: none
</style>
