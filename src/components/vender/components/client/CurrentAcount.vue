<template>
	<div
	v-if="client">
		<p class="title">
			Cuenta corriente
		</p>
		<b-form-checkbox
		:value="1"
		:unchecked-value="0"
		v-model="save_current_acount">
			Guardar movimiento en la cuenta corriente del cliente {{ client.name }}
		</b-form-checkbox>
		<!-- <b-form-checkbox
		:value="1"
		:unchecked-value="0"
		v-model="make_current_acount_pago">
			Generar un pago por el mismo monto de esta venta luego de generar el moviemiento en la cuenta corriente
		</b-form-checkbox> -->
	</div>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
}
</script>