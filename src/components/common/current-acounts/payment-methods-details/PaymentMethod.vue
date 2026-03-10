<template>
	<div>
		<p
		class="j-between">
			{{ model.name }}

			<span
			v-if="model.pivot.caja_id">
				-> Caja {{ caja }}
			</span>
			<strong>
				{{ price(model.pivot.amount) }}
			</strong>
		</p>
		<div
		class="shadow-2 p-15 b-r-1"
		v-if="model.credit_card">
			<p 
			class="j-between">
				Tarjeta
				<strong>
					{{ model.credit_card.name }}
				</strong>
			</p>
			<div>
				<p 
				class="j-between">
					Cuotas
					<strong>
						{{ model.credit_card_payment_plan.installments }}
					</strong>
				</p>
				<p 
				class="j-between">
					Recargo
					<strong>
						{{ model.credit_card_payment_plan.surchage }}
					</strong>
				</p>
			</div>
		</div>
		<hr>
	</div>
</template>
<script>
import CheckInfo from '@/components/common/current-acounts/pago/CheckInfo'
export default { 
	components: {
		CheckInfo,
	},
	props: {
		model: Object,
	},
	computed: {
		caja() {
			let caja = this.$store.state.caja.models.find(c => c.id == this.model.pivot.caja_id)

			if (typeof caja != 'undefined') {
				return caja.name 
			}
			return ''
		}
	}
}
</script>