<template>
	<b-form-input
	class="buscador-cheque m-t-10"
	v-model="query"
	@keyup.enter="search"
	@keyup="reset"
	placeholder="Buscar por numero de cheque"></b-form-input>
</template>
<script>
export default {
	data() {
		return {
			query: ''
		}
	},
	computed: {
		cheques() {
			return this.$store.state.cheque.models 
		},
	},
	methods: {
		reset() {
			if (!this.query.length) {
				this.$store.commit('cheque/setFiltered', [])
			}
		},
		search() {
			let cheque = this.cheques.find(cheque => {
				return cheque.num == this.query
			})
			if (typeof cheque != 'undefined') {
				this.$store.commit('cheque/setFiltered', [cheque])
			} else {
				this.$toast.error('No se encontro cheque con ese numero')
			}
		}
	}
}
</script>
<style lang="sass">
.buscador-cheque
	width: 260px
</style>