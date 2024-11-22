<template>
	<div>
		<h3>
			Total: <strong>{{ total }}</strong>
		</h3>
	</div>
</template>
<script>
import mixin from '@/mixins/comprobantes/pagos_de_clientes'
export default {
	mixins: [mixin],
	computed: {
		total() {
			let total = 0

			this.models_to_show.forEach(pago => {
				total += Number(pago.haber)
			})

			return this.price(total)
		}
	}
}
</script>