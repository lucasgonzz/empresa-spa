<template>
	<div class="tienda-mensajes-buscador">
		<b-form-input
		v-model="texto"
		data-testid="tienda-mensajes-buscador"
		placeholder="Buscar por nombre, email o teléfono"
		@keyup.enter="buscar"
		@keyup="on_keyup"></b-form-input>
		<i class="bi bi-search"></i>
	</div>
</template>
<script>
/**
 * Buscador de la bandeja de Mensajes de la tienda. Calcado de `whatsapp/chats-list/ChatSearch.vue`
 * (cápsula con lupa, debounce de 400 ms): busca en el backend por nombre, apellido, email y
 * teléfono del comprador (`?buscar=` de `tienda-chats`), no filtra en el navegador, porque la
 * bandeja viene paginada y en memoria hay solo lo que ya se cargó.
 */
export default {
	data() {
		return {
			// Debounce local para no pegarle a la API en cada tecla.
			temporizador: null,
		}
	},
	computed: {
		texto: {
			get() {
				return this.$store.state.tienda_mensajes.buscar
			},
			set(value) {
				this.$store.commit('tienda_mensajes/setBuscar', value)
			},
		},
	},
	beforeDestroy() {
		clearTimeout(this.temporizador)
	},
	methods: {
		/**
		 * Debounce de 400 ms. Las teclas que no cambian el texto (flechas, Shift) también pasan por
		 * acá, pero el pedido sale igual una sola vez al terminar de tipear.
		 */
		on_keyup(event) {
			if (event && event.key == 'Enter') {
				return
			}
			clearTimeout(this.temporizador)
			let self = this
			this.temporizador = setTimeout(function () {
				self.buscar()
			}, 400)
		},
		buscar() {
			clearTimeout(this.temporizador)
			this.$store.dispatch('tienda_mensajes/getChats', { page: 1 })
		},
	},
}
</script>
<style lang="sass">
// Cápsula, no caja: misma decisión que el buscador de la bandeja de WhatsApp y el pill del
// buscador general (_toolbar_botones.sass).
.tienda-mensajes-buscador
	position: relative
	flex: 1
	// `min-width: 0` para que el item flex se pueda achicar debajo del ancho natural del input: sin
	// esto, en la franja de tablet empujaba al filtro fuera de la fila.
	min-width: 0
	display: flex
	align-items: center
	.form-control
		height: var(--toolbar-control-h)
		padding: 0 14px 0 36px
		border-radius: 999px
		border: 1px solid var(--wa-borde)
		background: var(--wa-input-bg)
		color: var(--wa-texto)
		font-size: .875rem
		box-shadow: var(--toolbar-btn-shadow)
		&:focus
			border-color: var(--wa-verde)
			box-shadow: var(--toolbar-btn-shadow)
			background: var(--wa-input-bg)
			color: var(--wa-texto)
		&::placeholder
			color: var(--wa-texto)
			opacity: var(--wa-texto-muy-tenue-op)
	.bi-search
		position: absolute
		left: 14px
		top: 50%
		transform: translateY(-50%)
		color: var(--wa-texto)
		opacity: var(--wa-texto-muy-tenue-op)
		font-size: 14px
		// La lupa es decoración: sin esto se come el click sobre el borde izquierdo del campo.
		pointer-events: none
</style>
