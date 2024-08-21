<template>
	<div
	class="m-t-15 scale-up-center"
	show
	v-if="authenticated && days_before_expire < 3">
		<div
		class="p-l-15"
		v-if="days_before_expire > 0">
			Quedan {{ days_before_expire }} dias para que venza tu suscripcion. El total a pagar es de: <strong>{{ price(owner.total_a_pagar) }}</strong>
		</div>
		<div
		class="payment-expire-card s-2"
		v-else>
			<img src="@/assets/pago.png" alt="">
			<div>
				<div class="tiempo-de-pagar">
					<p
					v-if="days_before_expire < 0">
						Tu licencia del sistema <strong>A EXPIRADO</strong>, realiza tu pago para que podamos seguir <strong>respaldando la informacion</strong> de tu empresa
					</p>
					<p 
					v-else-if="days_before_expire == 0">
						<strong>
							HOY ES EL ULTIMO DIA PARA PAGAR TU SUSCRIPCION
						</strong>
					</p>
					<p
					v-else-if="days_before_expire > 0">
						Quedan {{ days_before_expire }} dias para que venza tu suscripcion
					</p>
				</div>

				<p
				v-if="owner.plan">
					Licencia de uso para tu plan {{ owner.plan.name }}: <strong>{{ price(owner.total_a_pagar) }}</strong>
				</p>
				<!-- <div
				v-if="employees.length">
					<p>
						Usuario extra (empleados): <strong>USD {{ owner.plan.user_price }}</strong>
					</p>
					<p>
						Cantidad de usuarios extra: <strong>{{ employees.length }} (USD {{ owner.plan.user_price * employees.length }})</strong>
					</p>
				</div>

				<p
				v-if="owner.online">
					E-commerce: <strong>USD {{ owner.plan.e_commerce }}</strong>
				</p>

				<p
				v-if="owner.plan_discount">
					Tu cuenta tiene asignado un descuento del <strong>{{ owner.plan_discount }}%</strong>
				</p>

				<p>
					El total a pagar por tu Plan {{ owner.plan.name }} es de <strong>USD {{ price(total) }}</strong>, cotizado al promedio del valor del dolar en el dia de hoy de <strong>{{ price(dolar) }} ARS</strong> equivale a <strong>{{ price(total * dolar) }} ARS</strong>
				</p> -->

				<p>
					Podes realizar el pago del sistema enviando una transferencia a nuestro alias: <strong>comerciocity</strong>
				</p>
			</div>
		</div>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	created() {
		// this.$store.dispatch('dolar/getDolar')
	},
	computed: {
		dolar() {
			return this.$store.state.dolar.promedio 
		},
		employees() {
			return this.$store.state.employee.models 
		},
		days_before_expire() {
			return moment().diff(this.owner.payment_expired_at, 'days') * -1
		},
		total() {
			let total = this.owner.plan.price 
			this.employees.forEach(employee => {
				total += this.owner.plan.user_price
			})
			if (this.owner.online) {
				total += this.owner.plan.e_commerce 
			}
			if (this.owner.plan_discount) {
				total -= total * this.owner.plan_discount / 100 
			}
			return total
		}
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.payment-expire-card
	max-width: 700px
	border: 5px solid $red
	margin: auto
	border-radius: 8px
	display: flex 
	flex-direction: row 
	justify-content: flex-start
	align-items: flex-start
	padding: 10px 0 
	img 
		width: 200px
	p 
		margin-bottom: 10px
		text-align: left

// .scale-up-center 
// 	-webkit-animation: scale-up-center 2s ease-in infinite alternate forwards
// 	animation: scale-up-center 2s ease-in infinite alternate forwards

// @-webkit-keyframes scale-up-center 
// 	0% 
// 		-webkit-transform: scale(0.7)
// 		transform: scale(0.7)

// 	10% 
// 		-webkit-transform: scale(1)
// 		transform: scale(1)


@keyframes scale-up-center 
	0% 
		-webkit-transform: scale(0.7)
		transform: scale(0.7)

	10% 
		-webkit-transform: scale(1)
		transform: scale(1)
  



</style>