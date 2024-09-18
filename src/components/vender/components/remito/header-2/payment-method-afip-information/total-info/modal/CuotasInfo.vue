<template>
	<div>
		<p
		v-if="cuota_monto_descuento">
			Descuento por {{ cantidad_cuotas }} cuotas:
			{{ price(cuota_monto_descuento) }}
		</p>

		<p
		v-if="cuota_monto_recargo">
			Recargo por {{ cantidad_cuotas }} cuotas:
			{{ price(cuota_monto_recargo) }}
		</p>

		<p
		v-if="monto_credito_real">
			Monto real: <strong>{{ price(monto_credito_real) }}</strong>
		</p>

		<p
		v-if="valor_cuota">
			Valor de cada cuota: <strong>{{ price(valor_cuota) }}</strong>
		</p>
	</div>			
</template>
<script>
export default {
	computed: {
		cuota_monto_descuento() {
			return this.$store.state.vender.cuota_monto_descuento
		},
		cuota_monto_recargo() {
			return this.$store.state.vender.cuota_monto_recargo
		},
		cantidad_cuotas() {
			return this.$store.state.vender.cantidad_cuotas
		},
		monto_credito() {
			return this.$store.state.vender.monto_credito
		},
		monto_credito_real() {
			return this.$store.state.vender.monto_credito_real
		},
		valor_cuota() {
			if (!this.monto_credito || !this.cantidad_cuotas) {
				return null
			}

			if (this.monto_credito_real) {

				return this.monto_credito_real / this.cantidad_cuotas
			}
			
			return this.monto_credito / this.cantidad_cuotas
		}
	}
}
</script>