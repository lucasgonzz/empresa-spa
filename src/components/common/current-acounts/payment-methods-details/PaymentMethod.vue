<template>
	<div>
		<p
		class="j-between">
			{{ model.name }}
			<strong>
				{{ price(model.pivot.amount) }}
			</strong>
		</p>
		<check-info 
		:payment_method="model.pivot"
		disabled_inputs></check-info>
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
}
</script>