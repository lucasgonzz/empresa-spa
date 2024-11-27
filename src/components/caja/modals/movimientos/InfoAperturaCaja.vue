<template>
	<div
	class="info-apertura-caja">
		<div
		class="j-between">
			<p
			v-if="get_perfil_usuario(apertura_caja.apertura_employee_id)">
				Abierta por: <strong>{{ get_perfil_usuario(apertura_caja.apertura_employee_id).name }}</strong>
			</p>
			<p
			v-if="apertura_caja.cierre_employee_id">
				Cerrada por: <strong>{{ get_perfil_usuario(apertura_caja.cierre_employee_id).name }}</strong>
			</p>
		</div>
		<div
		class="j-between">
			
			<p>
				Fecha apertura: <strong>{{ date(apertura_caja.created_at, true) }}</strong>
			</p>

			<p
			v-if="apertura_caja.cerrada_at">
				Fecha cierre: <strong>{{ date(apertura_caja.cerrada_at, true) }}</strong>
			</p>
		</div>

		<div
		class="j-between">
			<p>
				Saldo apertura: <strong>{{ price(apertura_caja.saldo_apertura) }}</strong>
			</p>

			<p
			v-if="apertura_caja.saldo_cierre">
				Saldo cierre: <strong>{{ price(apertura_caja.saldo_cierre) }}</strong>
			</p>
		</div>

		<div
		class="j-between">
			<p>
				Total ingresos: <strong>{{ price(apertura_caja.total_ingresos) }}</strong>
			</p>

			<p>
				Total egresos: <strong>{{ price(apertura_caja.total_egresos) }}</strong>
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
		// total_ingresos() {

		// 	let total = 0

		// 	if (this.apertura_caja && this.apertura_caja.movimientos_caja) {
				
		// 		this.apertura_caja.movimientos_caja.forEach(movimiento_caja => {
		// 			if (movimiento_caja.ingreso) {

		// 				total += Number(movimiento_caja.ingreso)
		// 			}
		// 		})
		// 	}

		// 	return total
		// },
		// total_egresos() {

		// 	let total = 0

		// 	if (this.apertura_caja && this.apertura_caja.movimientos_caja) {

		// 		this.apertura_caja.movimientos_caja.forEach(movimiento_caja => {
		// 			if (movimiento_caja.egreso) {

		// 				total += Number(movimiento_caja.egreso)
		// 			}
		// 		})
		// 	}


		// 	return total
		// },
	},
}
</script>
<style lang="sass">
.info-apertura-caja
	width: 500px
	
</style>