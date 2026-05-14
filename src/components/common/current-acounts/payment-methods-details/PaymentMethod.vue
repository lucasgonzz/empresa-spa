<template>
	<div>
		<b-table
			v-if="payment_methods.length"
			class="s-2 b-r-1 m-b-0"
			head-variant="dark"
			responsive
			small
			hover
			striped
			bordered
			:fields="table_fields"
			:items="payment_methods"
			:tbody-tr-class="tbody_tr_class">

			<template #cell(name)="data">
				<div>{{ data.item.name }}</div>
				<div
					v-if="data.item.credit_card"
					class="shadow-2 p-15 b-r-1 m-t-10">
					<p
						class="j-between">
						Tarjeta
						<strong>
							{{ data.item.credit_card.name }}
						</strong>
					</p>
					<div>
						<p
							class="j-between">
							Cuotas
							<strong>
								{{ data.item.credit_card_payment_plan.installments }}
							</strong>
						</p>
						<p
							class="j-between">
							Recargo
							<strong>
								{{ data.item.credit_card_payment_plan.surchage }}
							</strong>
						</p>
					</div>
				</div>
			</template>

			<template #cell(_monto)="data">
				{{ price((data.item.pivot || {}).amount) }}
			</template>

			<template #cell(_cotizado)="data">
				{{ amount_cotizado_label(data.item) }}
			</template>

			<template #cell(_caja)="data">
				{{ caja_name(data.item) }}
			</template>
		</b-table>
	</div>
</template>
<script>
export default {
	props: {
		/**
		 * Relación `current_acount_payment_methods` del movimiento (cada ítem con `pivot`, `name`, opcional `credit_card`).
		 */
		models: {
			type: Array,
			default() {
				return []
			},
		},
	},
	computed: {
		payment_methods() {
			return this.models || []
		},
		/**
		 * Columnas de la tabla de métodos de pago (claves internas con prefijo _ para celdas con slot).
		 *
		 * @returns {Array<Object>}
		 */
		table_fields() {
			return [
				{
					key: 'name',
					label: 'Método de pago',
				},
				{
					key: '_monto',
					label: 'Monto',
					tdClass: 'text-right',
					thClass: 'text-right',
				},
				{
					key: '_cotizado',
					label: 'Monto cotizado',
					tdClass: 'text-right',
					thClass: 'text-right',
				},
				{
					key: '_caja',
					label: 'Caja destino',
				},
			]
		},
	},
	methods: {
		/**
		 * Clases por fila: alterna tono cuando la fila incluye bloque de tarjeta (mejor lectura en tabla striped implícita por hover).
		 *
		 * @param {Object} item
		 * @param {string} type
		 * @returns {string|undefined}
		 */
		tbody_tr_class(item, type) {
			if (type !== 'row') {
				return undefined
			}
			if (item.credit_card) {
				return 'payment-method-row-with-card'
			}
			return undefined
		},
		/**
		 * Nombre de la caja del pivot; si aplica, añade «(USD)» y la sucursal «(calle)» como en selectores de caja.
		 * Devuelve «—» si no hay `caja_id`, no está en el store o no aplica.
		 *
		 * @param {Object} payment_method
		 * @returns {string}
		 */
		caja_name(payment_method) {
			const caja_id = payment_method.pivot && payment_method.pivot.caja_id
			if (!caja_id) {
				return '—'
			}
			const caja = this.$store.state.caja.models.find(c => c.id == caja_id)
			if (typeof caja === 'undefined') {
				return '—'
			}
			let text = caja.name
			if (Number(caja.moneda_id) === 2) {
				text += ' (USD)'
			}
			if (caja.address_id) {
				const address = this.$store.state.address.models.find(a => a.id == caja.address_id)
				if (typeof address !== 'undefined') {
					text += ' (' + address.street + ')'
				}
			}
			return text
		},
		/**
		 * Texto del monto cotizado (`pivot.amount_cotizado`) o guión si no aplica.
		 *
		 * @param {Object} payment_method
		 * @returns {string}
		 */
		amount_cotizado_label(payment_method) {
			const raw = (payment_method.pivot || {}).amount_cotizado
			if (raw === null || typeof raw === 'undefined' || raw === '') {
				return '—'
			}
			return this.price(raw)
		},
	},
}
</script>
<style scoped lang="sass">
.payment-method-row-with-card
	td
		vertical-align: top
</style>
