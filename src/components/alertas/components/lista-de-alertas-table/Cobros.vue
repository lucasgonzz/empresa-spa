<template>
	<div>

		<div
		v-if="view == 'cobros'">

			<current-acounts></current-acounts>

			<ventas-sin-cobrar></ventas-sin-cobrar>

			<b-table
			v-if="ventas_sin_cobrar.length"
			head-variant="dark"
			responsive
			:fields="fields"
			:items="items">

				<template #cell(cliente)="data">
					<div class="j-start">
						
						<p>
							{{ ventas_sin_cobrar[data.index].client.name }}
						</p>
						
						<b-button
						class="m-l-10"
						v-for="credit_account in ventas_sin_cobrar[data.index].client.credit_accounts"
						@click="showCurrentAcounts(ventas_sin_cobrar[data.index].client, credit_account)"
						variant="success">
							{{ price(credit_account.saldo) }}
							<span
							v-if="credit_account.moneda_id == 1">
								Pesos
							</span>
							<span
							v-else-if="credit_account.moneda_id == 2">
								USD
							</span>
						</b-button>
					</div>
				</template>


				<template #cell(ventas_sin_cobrar)="data">
					<b-button
					@click="showVentasSinCobrar(ventas_sin_cobrar[data.index].ventas_sin_cobrar)"
					variant="success">
						{{ ventas_sin_cobrar[data.index].ventas_sin_cobrar.length }} ventas
					</b-button>
				</template>

			</b-table>

			<div 
			v-else
			class="text-with-icon">
				No hay ventas por cobrar
				<i class="icon-eye-slash"></i>
			</div>

		</div>

	</div>

</template>
<script>
export default {
	components: {
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		VentasSinCobrar: () => import('@/components/alertas/modals/cobros/VentasSinCobrar'),
	},
	computed: {
		fields() {
			return [
				{
					key: 'cliente',
				},
				{
					key: 'ventas_sin_cobrar',
				},
			]
		},
		items() {
			let items = []

			this.ventas_sin_cobrar.forEach(alerta => {
				items.push({
					cliente: null,
					ventas_sin_cobrar: null,
				})
			})

			return items
		},


		ventas_sin_cobrar() {
			return this.$store.state.sale.ventas_sin_cobrar.models
		},
	},
	methods: {
		client_name(info) {
			if (info.client) {
				let text = info.client.name
				
				let credit_account = info.client.credit_accounts.find(c => c.moneda_id == info.moneda_id)

				if (typeof credit_account != 'undefined') {
					text += ' ( '+ this.price(credit_account.saldo) 
					if (credit_account.moneda_id == 2) {
						text += ' USD )'
					} else {

						text += ' )'
					}
				} else {
				}
				return text
			}
			return 'NO HAY'
		},
		showVentasSinCobrar(ventas) {
			this.$store.commit('sale/ventas_sin_cobrar/setVentasSinCobrar', ventas)
			this.$bvModal.show('ventas-sin-cobrar')
		},
		lo_que_falta_pagarse(sale) {
			return this.price(Number(sale.current_acount.debe) - Number(sale.current_acount.pagandose))
		},
		showCurrentAcounts(client, credit_account) {
			this.showCurrentAcount(client, credit_account)
		}
	}
}
</script>