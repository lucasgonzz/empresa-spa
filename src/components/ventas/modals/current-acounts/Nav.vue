<template>
	<b-form 
	@submit.prevent="getCurrentAcounts"
	class="p-15"
	inline>
		<label>Mostrar cuentas corrientes de </label>
		<b-form-input
		v-model="months_ago"
		class="input"
		min="1"
		type="number"></b-form-input>
		<label>meses atras</label>
		<b-button
		type="submit"
		variant="primary"
		class="m-l-15">
			Buscar
		</b-button>
		<b-button
		v-if="current_acounts.length"
		@click="print"
		variant="danger"
		class="m-l-15">
			<i class="icon-print"></i>
			<span
			v-show="selected_current_acounts.length">
				{{ selected_current_acounts.length }}
			</span>
			<span
			v-show="!selected_current_acounts.length">
				todas
			</span>
		</b-button>
		<b-button
		v-if="client.current_acounts_count == 0"
		class="m-l-15"
		@click="saldoInicial"
		variant="primary">
			Saldo inicial
		</b-button>
	</b-form>
</template>
<script>
import BtnLoader from '@/components/common/BtnLoader'
import current_acounts from '@/mixins/current_acounts'
export default {
	name: 'CurrentAcountsNav',
	mixins: [current_acounts],
	components: {
		BtnLoader
	},
	computed: {
		months_ago: {
			set(value) {
				this.$store.commit('clients/current_acounts/setMonthsAgo', value)
			},
			get() {
				return this.$store.state.current_acount.months_ago
			}
		},
		loading() {
			return this.$store.state.current_acount.loading
		},
        client() {
            return this.$store.state.current_acount.client
        },
	},
	methods: {
        saldoInicial() {
            this.$store.commit('clients/setSaldoInicial', this.client)
            this.$bvModal.show('saldo-inicial-client')
        },
		getCurrentAcounts() {
			this.$store.dispatch('current_acount/getModels')
		},
		checkSaldos() {
			this.$store.dispatch('clients/current_acounts/checkSaldos')
			.then(() => {
				this.$toast.success('Saldos checkeados')
				this.getCurrentAcounts()				
			})
		},
		print() {
			let link = ''
			if (this.selected_current_acounts.length) {
				let ids = []
				this.selected_current_acounts.forEach(current_acount => {
					ids.push(current_acount.id)
				})
            	link = process.env.VUE_APP_API_URL+'/current-acounts/pdf/'+ids.join('-')
			} else {
            	link = process.env.VUE_APP_API_URL+'/current-acounts/pdf/'+this.client.id+
            	'/'+this.months_ago
			}
            window.open(link)
		},
	}
}
</script>
<style scoped lang="sass">
.input 
	width: 70px
	margin: 0 1em
</style>