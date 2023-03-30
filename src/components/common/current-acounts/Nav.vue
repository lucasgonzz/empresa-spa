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
		v-if="can_print"
		@click="print"
		variant="danger"
		class="m-l-15"> 
			<i class="icon-print"></i>
			<span
			v-show="is_selected_printable">
				esta sola
			</span>
			<span
			v-show="!selected_current_acounts.length">
				todas
			</span>
		</b-button>
		<b-button
		v-if="from_model.current_acounts_count == 0"
		class="m-l-15"
		@click="saldoInicial"
		variant="primary">
			Saldo inicial
		</b-button>
	</b-form>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
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
        saldoInicial() {
            // this.$store.commit('clients/setSaldoInicial', this.client)
            this.$bvModal.show('saldo-inicial')
        },
		getCurrentAcounts() {
			this.$store.dispatch('current_acount/getModels')
		},
		print() {
			let link = ''
			if (this.selected_current_acounts.length) {
				let ids = []
				this.selected_current_acounts.forEach(current_acount => {
					ids.push(current_acount.id)
				})
            	link = process.env.VUE_APP_API_URL+'/current-acounts/pdf/'+ids.join('-')+'/'+this.from_model_name
			} else {
            	link = process.env.VUE_APP_API_URL+'/current-acounts/pdf/'+this.from_model_name+'/'+this.from_model.id+
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