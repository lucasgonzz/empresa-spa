<template>
	<div>
		<p class="total-a-repartir">
			Total a repartir: <strong>{{ price(total_a_repartir) }}</strong>
		</p>

		<p 
		:class="total_repartido == total_a_repartir ? 'text-success' : ''"
		class="total-a-repartir">
			Total repartido: {{ price(total_repartido) }}
		</p>

		<p 
		:class="total_repartido == total_a_repartir ? 'text-success' : 'text-danger'"
		class="total-a-repartir">
			Sobrante para repartir: <strong>{{price(sobrante_a_repartir)}}</strong>
		</p>
	</div>
</template>
<script>
import select_payment_methods from '@/mixins/expense/select_payment_methods'
export default {
	mixins: [select_payment_methods],
}
</script>