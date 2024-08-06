<template>
	<div>
		
		<p class="total-a-repartir">
			Total a repartir: <strong>{{ price(total_a_repartir_with_discounts) }}</strong>
		</p>

		<p 
		:class="total_repartido_with_discounts == total_a_repartir_with_discounts ? 'text-success' : ''"
		class="total-a-repartir">
			Total repartido: {{ price(total_repartido_with_discounts) }}
		</p>

		<p 
		:class="total_repartido_with_discounts == total_a_repartir_with_discounts ? 'text-success' : 'text-danger'"
		class="total-a-repartir">
			Sobrante para repartir: <strong>{{price(sobrante_a_repartir_with_discounts)}}</strong>
		</p>
	</div>
</template>
<script>
import payment_methods_with_discounts from '@/mixins/vender/payment_methods_with_discounts'
export default {
	mixins: [payment_methods_with_discounts],
	watch: {
        total_vender() { 
        	this.total_a_repartir_with_discounts = this.total_vender
        	
        	if (this.index_previus_sale == 0) {
        		this.metodos_de_pago_seleccionados = []
        		this.total_repartido_with_discounts = 0
        	} else {
        		// this.set_total_desde_previus_sale()
        	}
        	
        },
    },
}
</script>