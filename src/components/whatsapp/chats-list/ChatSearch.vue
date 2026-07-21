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
.whatsapp-chat-search
	position: relative
	padding: 10px 12px
	.form-control
		padding-left: 32px
	.bi-search
		position: absolute
		left: 24px
		top: 50%
		transform: translateY(-50%)
		color: rgba(0, 0, 0, .4)
		font-size: 14px
</style>
