<template>
	<div 
	class="nav-current-acounts p-15"
	inline>
		<label>Mostrar cuentas corrientes de </label>
		<b-form-input
		v-model="months_ago"
		@keydown.enter="getCurrentAcounts"
		class="input"
		min="1"
		type="number"></b-form-input>
		<label>meses atras</label>
		<b-button
		@click="getCurrentAcounts"
		variant="primary"
		class="m-l-15">
			Buscar
		</b-button>
		<b-button 
		@click="print"
		variant="danger"
		class="m-l-15"> 
			<i class="icon-print"></i>
		</b-button>
		<b-button
		v-if="from_model.current_acounts_count == 0"
		class="m-l-15"
		@click="saldoInicial"
		variant="primary">
			Saldo inicial
		</b-button>
		<btn-loader
		:block="false"
		:loader="checking"
		class="m-l-15"
		text="Chequear Saldos"
		@clicked="checkSaldos">
		</btn-loader>

		<!-- <b-button
		class="m-l-15"
		@click="print"
		variant="danger">
			Saldo inicial
		</b-button> -->
	</div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts'
export default {
	name: 'CurrentAcountsNav',
	mixins: [current_acounts],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			checking: false
		}
	},
	computed: {
		months_ago: {
			set(value) {
				this.$store.commit('current_acount/setMonthsAgo', value)
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
        can_print() {
        	return this.selected_current_acounts.length == 0 || this.is_selected_printable
        },
        is_selected_printable() {
        	return this.selected_current_acounts.length == 1 && (this.selected_current_acounts[0].status == 'nota_credito' || this.selected_current_acounts[0].status == 'pago_from_client')
        }
	},
	methods: {
		checkSaldos() {
			this.checking = true 
			this.$api.get('check-saldos/'+this.from_model_name+'/'+this.from_model.id)
			.then(() => {
				this.checking = false 
				this.$store.dispatch('current_acount/getModels')
			})
			.catch(err => {
				this.checking = false 
			})
		},
        saldoInicial() {
            // this.$store.commit('clients/setSaldoInicial', this.client)
            this.$bvModal.show('saldo-inicial')
        },
		getCurrentAcounts() {
			this.$store.dispatch('current_acount/getModels')
		},
		print() {
            let link = process.env.VUE_APP_API_URL+'/current-acount/pdf/'+this.from_model_name+'/'+this.from_model.id+'/'+this.months_ago
            window.open(link)
		},
	}
}
</script>
<style scoped lang="sass">
.nav-current-acounts
	display: flex
	flex-direction: row 
	justify-content: flex-start 
	align-items: center 
	.input 
		width: 70px
		margin: 0 1em
</style>