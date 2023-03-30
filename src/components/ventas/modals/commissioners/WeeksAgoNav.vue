<template>
	<b-form 
	@submit.prevent="getCommissions"
	class="p-15"
	inline>
		<label>Mostrar comisiones de </label>
		<b-form-input
		v-model="weeks_ago"
		class="input"
		min="1"
		type="number"></b-form-input>
		<label>semanas atras</label>
		<b-button
		type="submit"
		variant="primary"
		class="m-l-15">
			Buscar
		</b-button>
		<b-button
		@click="checkSaldos"
		variant="primary"
		class="m-l-15">
			<btn-loader
			text="Checkear saldos"
			:loader="loading_check_saldos"></btn-loader>
		</b-button>
	</b-form>
</template>
<script>
import BtnLoader from '@/components/common/BtnLoader'
export default {
	name: 'WeeksAgoNav',
	components: {
		BtnLoader,
	},
	computed: {
		weeks_ago: {
			set(value) {
				this.$store.commit('commissioners/setWeeksAgo', value)
			},
			get() {
				return this.$store.state.commissioners.weeks_ago
			}
		},
		loading_check_saldos() {
			return this.$store.state.commissioners.loading_check_saldos
		},
	},
	methods: {
		getCommissions() {
			this.$store.dispatch('commissioners/getSelectedCommissioners')
		},
		checkSaldos() {
			this.$store.dispatch('commissioners/checkSaldos')
			.then(() => {
				this.getCommissions()
			})
		}
	}
}
</script>
<style scoped lang="sass">
.input 
	width: 70px
	margin: 0 1em
</style>