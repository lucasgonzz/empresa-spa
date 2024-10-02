<template>
	<div
	class="info-apertura-caja">
		<div
		class="j-between">
			<p
			v-if="get_perfil_usuario(apertura_caja.apertura_employee_id)">
				Abierta por: {{ get_perfil_usuario(apertura_caja.apertura_employee_id).name }}
			</p>
			<p
			v-if="apertura_caja.cierre_employee_id">
				Cerrada por: {{ get_perfil_usuario(apertura_caja.cierre_employee_id).name }}
			</p>
		</div>
		<div
		class="j-between">
			
			<p>
				Fecha apertura: {{ date(apertura_caja.created_at, true) }}
			</p>

			<p
			v-if="apertura_caja.cerrada_at">
				Fecha cierre: {{ date(apertura_caja.cerrada_at, true) }}
			</p>
		</div>

		<div
		class="j-between">
			<p>
				Saldo apertura: {{ price(apertura_caja.saldo_apertura) }}
			</p>

			<p
			v-if="apertura_caja.saldo_cierre">
				Saldo cierre: {{ price(apertura_caja.saldo_cierre) }}
			</p>
		</div>

		<div
		class="j-between">
			<p>
				Total ingresos: {{ price(total_ingresos) }}
			</p>

			<p>
				Total egresos: {{ price(total_egresos) }}
			</p>
		</div>
		<hr>
	</div>
</template>
<script>
export default {
	computed: {
		apertura_caja() {
			return this.$store.state.apertura_caja.model 
		},
		total_ingresos() {

			let total = 0

			this.apertura_caja.movimientos_caja.forEach(movimiento_caja => {
				if (movimiento_caja.ingreso) {

					total += Number(movimiento_caja.ingreso)
				}
			})

			return total
		},
		total_egresos() {

			let total = 0

			this.apertura_caja.movimientos_caja.forEach(movimiento_caja => {
				if (movimiento_caja.egreso) {

					total += Number(movimiento_caja.egreso)
				}
			})

			return total
		},
	},
}
</script>
<style lang="sass">
.info-apertura-caja
	width: 500px
	
</style>