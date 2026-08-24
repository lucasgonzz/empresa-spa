<template>
	<div
	class="whatsapp-chat-search">
		<b-form-input
		v-model="query"
		placeholder="Buscar chat, teléfono o cliente"
		@keyup.enter="search"
		@keyup="on_keyup"></b-form-input>
		<i class="bi bi-search"></i>
	</div>
</template>
<script>
export default {
	data() {
		return {
			// Debounce local para no pegarle a la API en cada tecla.
			search_timeout: null,
		}
	},
	computed: {
		query: {
			get() {
				return this.$store.state.whatsapp_chat.search_query
			},
			set(value) {
				this.$store.commit('whatsapp_chat/setSearchQuery', value)
			},
		},
	},
	methods: {
		/**
		 * Debounce de 400ms: evita disparar una búsqueda por cada tecla mientras se escribe.
		 */
		on_keyup() {
			clearTimeout(this.search_timeout)
			this.search_timeout = setTimeout(() => {
				this.search()
			}, 400)
		},
		search() {
			clearTimeout(this.search_timeout)
			this.$store.dispatch('whatsapp_chat/getChats')
		},
	},
}
</script>
<style lang="sass">
// Capsula, no caja: es la misma decision que ya documenta _toolbar_botones.sass para el pill del
// buscador general --"un campo de busqueda es una capsula, un boton de barra de herramientas tiene
// esquinas suaves pero no es una capsula"--. Antes era un .form-control crudo de radio 4px al lado
// de tres botones, y el header de la bandeja se leia como tres piezas sueltas.
//
// El padding externo se saco: el espaciado de la fila lo da ahora el `gap` del header
// (chats-list/Index.vue), no el margen de cada hijo. Con los dos, el buscador quedaba corrido
// respecto de los botones de al lado.
.whatsapp-chat-search
	position: relative
	flex: 1
	// `min-width: 0` para que el item flex se pueda achicar debajo del ancho natural del input:
	// sin esto, en la franja de tablet empujaba a los botones fuera de la fila.
	min-width: 0
	display: flex
	align-items: center
	.form-control
		height: var(--toolbar-control-h)
		padding: 0 14px 0 36px
		border-radius: 999px
		border: 1px solid var(--wa-borde)
		// --wa-input-bg y no --wa-panel: el header de la bandeja YA es --wa-panel, asi que el
		// campo quedaba del mismo color que la superficie sobre la que se apoya, a un borde de
		// 1px de ser invisible. Es el mismo token que usa la capsula del composer, y con eso los
		// dos campos de texto del modulo se leen igual.
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
		// La lupa es decoracion: sin esto se come el click sobre el borde izquierdo del campo.
		pointer-events: none
</style>
