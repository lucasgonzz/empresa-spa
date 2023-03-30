<template>
	<div>
		<div
		v-if="!loading">
			<b-table
			v-if="commissions_to_show.length"
			head-variant="dark"
			:fileds="fields"
			:items="items">
				<!-- <template #cell(porcentaje)="data">
					<b-button
					variant="info"
					@click="updatePercentage(commissions_to_show[data.index])">
						{{ commissions_to_show[data.index].percentage }}%
					</b-button>
				</template> -->
			</b-table>
			<p
			class="text-with-icon"
			v-else>
				<i class="icon-not"></i>
				No hay comisiones para el vendedor
			</p>
		</div>
		<b-skeleton-table
		v-else
		:rows="5"
		:columns="4"
		:table-props="{ bordered: true, striped: true }"
		></b-skeleton-table>
	</div>
</template>
<script>
export default {
	name: 'CommissionsList',
	computed: {
		selected_commissioner() {
			return this.$store.state.commissioners.selected_commissioner
		},
		commissions_to_show() {
			return this.$store.state.commissioners.commissions_to_show
		},
		loading() {
			return this.$store.state.commissioners.loading_commissions_to_show
		},
		fields() {
			return [
				{ key: 'fecha', label: 'Fecha', class: 'text-center'},
				{ key: 'pagado', label: 'Fecha', class: 'text-center'},
				{ key: 'detalle', class: 'text-center'},
				{ key: 'porcentaje', class: 'text-center'},
				{ key: 'monto', label: 'Monto', class: 'text-center'},
				{ key: 'saldo', class: 'text-center'},
			]
		},
		items() {
			let items = []
			this.commissions_to_show.forEach(commission => {
				items.push({
					fecha: this.date(commission.created_at),
					pagado: commission.updated_at ? this.date(commission.updated_at) : '',
					detalle: commission.detalle,
					porcentaje: this.percentage(commission),
					monto: this.price(commission.monto),
					saldo: this.price(commission.saldo),
				})
			})
			return items
		}
	},
	methods: {
		percentage(commission) {
			if (commission.percentage) {
				return commission.percentage+'%'
			}
		},
		updatePercentage(commission) {
			this.$store.commit('commissioners/setCommissionToUpdatePercentage', commission)
			this.$bvModal.show('update-percentage')
			
		}
	}
}
</script>
<style scoped lang="sass">
.percentage-input
	width: 70px
</style>