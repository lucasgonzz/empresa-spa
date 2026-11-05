<template>
	<button
		v-if="aviso"
		type="button"
		class="boton-aviso-implementacion"
		aria-label="Ver avance de Implementación"
		title="Ver avance de Implementación"
		@click.stop="abrir"
	>
		<robot></robot>
		<span v-if="mostrar_texto">Implementación</span>
	</button>
</template>

<script>
import Robot from './Robot'

export default {
	components: { Robot },
	props: {
		mostrar_texto: { type: Boolean, default: false },
	},
	computed: {
		aviso() {
			const estado = this.$store.state.implementacion
			return estado.disponible && !estado.apertura && this.$store.getters['implementacion/aviso_pendiente']
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
	z-index: 1
	display: inline-flex
	align-items: center
	gap: .3rem
	padding: 0 .25rem
	min-width: 2.1rem
	min-height: 2.1rem
	border: 1px solid #7294f5
	border-radius: .75rem
	background: #273761
	color: #fff
	font: inherit
	font-size: .75rem
	animation: despegue .65s cubic-bezier(.23,.86,.33,1.23) both
	.robot-implementacion
		width: 1.55rem
	&:focus-visible
		outline: 2px solid #fff
		outline-offset: 2px
	&:hover
		background: #344b86

@keyframes despegue
	from
		transform: translateY(55%) scale(.35)
		opacity: 0
	to
		transform: translateY(0) scale(1)
		opacity: 1
@media (prefers-reduced-motion: reduce)
	.boton-aviso-implementacion
		animation: none
</style>
