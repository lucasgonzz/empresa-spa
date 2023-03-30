<template>
	<div
	v-if="pago.current_acount_payment_method_id == 1">
		<p>
			Nuevos cheques
		</p>
		<check-component
		v-for="check in pago.checks"
		:check="check"></check-component>		
		<b-button
		class="m-b-20"
		v-show="show_add"
		@click="addCheck"
		variant="primary">
			Agregar cheque
		</b-button>
	</div>
</template>
<script>
import CheckComponent from '@/components/ventas/modals/current-acounts/pago/CheckComponent'
export default {
	props: ['pago'],
	components: {
		CheckComponent,
	},
	computed: {
		show_add() {
			return this.pago.checks[this.pago.checks.length-1].amount != ''
		},
	},
	methods: {
		addCheck() {
			this.pago.checks.push({
                bank: '',
                payment_date: '',
                amount: '',
                num: '',
			})
		}
	}
}
</script>
<style lang="sass">
.check 
	padding: 15px !important
</style>