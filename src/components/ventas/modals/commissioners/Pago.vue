<template>
<b-modal
id="commissioner-pago" :title="title" hide-footer>
	<b-form-group>
		<b-form-input
		@keydown.enter="hacerPago"
		placeholder="Ingrese el monto"
		v-model="pago"></b-form-input>
	</b-form-group>
	<b-form-group>
		<b-button
		block
		variant="primary"
		@click="hacerPago">
			<btn-loader
			text="Pagar"
			:loader="loading"></btn-loader>
		</b-button>
	</b-form-group>
</b-modal>
</template>
<script>
import BtnLoader from '@/components/common/BtnLoader'
export default {
	name: 'SellerPago',
	components: {
		BtnLoader,
	},
	data() {
		return {
			pago: '',
			loading: false,
		}
	},
	computed: {
		title() {
			if (this.commissioner) {
				return 'Pagar a '+this.commissioner.name
			}
		},
		commissioner() {
			return this.$store.state.commissioners.selected_commissioner
		}
	},
	methods: {
		hacerPago() {
			if (this.pago != '') {
				this.loading = true
				this.$api.post('/commissioners/pago', {
					commissioner_id: this.commissioner.id,
					pago: this.pago
				})
				.then(res => {
					console.log(res)
					this.loading = false
					this.$toast.success('Pago registrado')
					this.$store.dispatch('commissioners/getSelectedCommissioners')
					this.$bvModal.hide('commissioner-pago')
					this.pago = ''
				})
				.catch(err => {
					this.loading = false
					console.log(err)
				})
			} else {
				this.$toast.error('Ingrese el monto a pagar')
			}
		}
	}
}
</script>