<template>
	<transition name="barra-deshacer">
		<div
		v-if="ultima_hecha"
		class="barra-deshacer"
		role="status"
		data-testid="agenda-barra-hecha">
			<i class="bi bi-check-circle-fill barra-deshacer__icono"></i>
			<span class="barra-deshacer__texto">
				Hecha: {{ ultima_hecha.detalle }}
			</span>
			<button
			type="button"
			class="barra-deshacer__boton"
			data-testid="agenda-deshacer-ultima"
			:disabled="deshaciendo"
			@click="deshacer">
				Deshacer
			</button>
		</div>
	</transition>
</template>
<script>
/*
	Barra "Hecha - Deshacer" que aparece abajo unos segundos despues de marcar como hecha una
	tarea SIN gasto desde el circulo de la fila.

	Es una barra propia y no el $toast del sistema porque vue-toast-notification no admite un
	boton adentro, y el punto de esto es justamente el boton: la fila desaparece de la lista en el
	momento (para eso se marca), asi que si el clic fue por error hace falta un lugar donde
	revertirlo sin ir a buscarla a "Realizadas".
*/
const SEGUNDOS_VISIBLE = 7

export default {
	data() {
		return {
			timer: null,
			deshaciendo: false,
		}
	},
	computed: {
		ultima_hecha() {
			return this.$store.state.agenda.ultima_hecha
		},
	},
	watch: {
		/**
		 * Cada "hecha" nueva reinicia la cuenta: si el usuario marca tres seguidas, la barra
		 * muestra la ultima y se va a los segundos de ESA, no de la primera.
		 */
		ultima_hecha(valor) {
			this.cancelar_timer()
			if (valor) {
				this.timer = setTimeout(() => {
					this.$store.commit('agenda/setUltimaHecha', null)
				}, SEGUNDOS_VISIBLE * 1000)
			}
		},
	},
	beforeDestroy() {
		this.cancelar_timer()
		this.$store.commit('agenda/setUltimaHecha', null)
	},
	methods: {
		cancelar_timer() {
			if (this.timer) {
				clearTimeout(this.timer)
				this.timer = null
			}
		},
		/**
		 * DELETE pending-completed/{id}. La tarea era sin gasto, asi que no hay nada mas que
		 * avisar: vuelve a la lista con la recarga que hace el store.
		 */
		deshacer() {
			if (!this.ultima_hecha || !this.ultima_hecha.pending_completed_id) {
				this.$store.commit('agenda/setUltimaHecha', null)
				return
			}
			let self = this
			this.deshaciendo = true
			this.$store.dispatch('agenda/deshacer', this.ultima_hecha.pending_completed_id)
			.then(() => {
				self.deshaciendo = false
				self.cancelar_timer()
				self.$store.commit('agenda/setUltimaHecha', null)
				self.$toast.success('Volvió a pendiente')
			})
			.catch(mensaje => {
				self.deshaciendo = false
				self.$toast.error(mensaje)
			})
		},
	},
}
</script>
<style lang="sass">
.barra-deshacer
	position: fixed
	left: 50%
	bottom: 24px
	transform: translateX(-50%)
	z-index: 1040
	display: flex
	align-items: center
	gap: 12px
	max-width: min(520px, calc(100vw - 32px))
	padding: 10px 12px 10px 16px
	border-radius: 14px
	background: var(--bg-card)
	color: var(--color-text-primary)
	border: 1px solid var(--color-border)
	box-shadow: 0 8px 24px var(--shadow-color)

	&__icono
		flex: none
		color: var(--color-primary)
		font-size: 1.1rem

	&__texto
		flex: 1
		min-width: 0
		font-size: 0.9rem
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__boton
		flex: none
		border: 0
		background: transparent
		color: var(--color-primary)
		font-weight: 600
		font-size: 0.9rem
		padding: 6px 10px
		border-radius: 8px
		cursor: pointer
		&:hover
			background: var(--bg-hover)
		&:disabled
			opacity: 0.5
			cursor: default

.barra-deshacer-enter-active, .barra-deshacer-leave-active
	transition: opacity 0.2s ease, transform 0.2s ease

.barra-deshacer-enter, .barra-deshacer-leave-to
	opacity: 0
	transform: translate(-50%, 12px)
</style>
