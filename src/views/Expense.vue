<template> 
<div>
	
	<payment-methods></payment-methods>

	<view-component
	@modelSaved="modelSaved"
	:show_btn_delete="is_admin"
	show_filter_modal
	show_previus_days
	confirm_compensar_caja
	model_name="expense">
		<template #body>
			<b-button
			v-if="rango_exportable"
			class="m-t-10"
			variant="outline-primary"
			size="sm"
			:disabled="exportando"
			@click="exportarGastos">
				{{ exportando ? 'Preparando Excel…' : 'Descargar Excel del rango' }}
			</b-button>
		</template>
		<template #display_top>
			<total-expenses></total-expenses>
		</template>

		<template #payment_methods>
			<btn-payment-method></btn-payment-method>
		</template>
	</view-component>
</div>
</template>
<script>
import axios from 'axios'
import moment from 'moment'

export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		PaymentMethods: () => import('@/components/expenses/modals/payment-methods/Index'),
		TotalExpenses: () => import('@/components/expenses/components/TotalExpenses'),
		BtnPaymentMethod: () => import('@/components/expenses/components/BtnPaymentMethod'),
	},
	data() {
		return {
			exportando: false,
		}
	},
	computed: {
		rango_exportable() {
			const { from_dates, from_date, until_date } = this.$store.state.expense
			if (!from_dates || !this.can('expense.index') || !moment(from_date, 'YYYY-MM-DD', true).isValid()) {
				return null
			}
			const hasta = until_date || from_date
			if (!moment(hasta, 'YYYY-MM-DD', true).isValid() || hasta < from_date) {
				return null
			}
			return { desde: from_date, hasta }
		},
	},
	methods: {
		exportarGastos() {
			const rango = this.rango_exportable
			if (!rango || this.exportando) return

			const { desde, hasta } = rango
			this.exportando = true
			return Promise.all([
				axios.get('/api/expense/export/data', {
					params: { from_date: desde, until_date: hasta },
				}),
				import('@/components/expenses/exportar_gastos'),
			]).then(([respuesta, { descargarGastos }]) => {
				const archivo = 'gastos_' + desde + (desde === hasta ? '' : '_a_' + hasta) + '.xlsx'
				descargarGastos(respuesta.data.models, archivo)
			}).catch(() => {
				this.$toast.error('No se pudo descargar el Excel de gastos. Volvé a intentar.')
			}).finally(() => {
				this.exportando = false
			})
		},
		modelSaved(expense) {
			if (expense.caja_id) {
				this.loadModel('caja', expense.caja_id)
			}
		}
	},
}
</script>
