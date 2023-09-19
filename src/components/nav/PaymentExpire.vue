<template>
	<div
	class="payment-expire-card s-2 m-t-15 scale-up-center"
	show
	v-if="authenticated && is_owner && days_before_expire < 3">
		<div class="header">
			<img src="@/assets/pago.png" alt="">
			<p
			v-if="days_before_expire < 0">
				Tu licencia del sistema <strong>A EXPIRADO</strong>, realiza tu pago para que podamos seguir <strong>respaldando la informacion</strong> de tu empresa
			</p>
			<p 
			v-if="days_before_expire == 0">
				HOY ES EL ULTIMO DIA PARA PAGAR TU SUSCRIPCION
			</p>
			<p
			v-else-if="days_before_expire > 0">
				Quedan {{ days_before_expire }} dias para que venza tu suscripcion
			</p>
		</div>
		<p>
			El total a pagar por tu Plan {{ owner.plan.name }} es de {{ total }}
		</p>
		<p>
			Podes realizar el pago del sistema enviando una transferencia a nuestro alias: <strong>comerciocity</strong>
		</p>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	created() {
		this.$store.dispatch('dolar/getDolar')
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
			let total = this.owner.plan.price * this.dolar
			this.employees.forEach(employee => {
				total += 1000
			})
			return this.price(total)
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
	.header 
		display: flex 
		flex-direction: row 
		justify-content: flex-start
		align-items: center 
		img 
			width: 200px
		p 
			font-weight: bold
			margin-bottom: 0

.scale-up-center 
	-webkit-animation: scale-up-center 2s ease-in infinite alternate forwards
	animation: scale-up-center 2s ease-in infinite alternate forwards

@-webkit-keyframes scale-up-center 
	0% 
		-webkit-transform: scale(0.7)
		transform: scale(0.7)

	10% 
		-webkit-transform: scale(1)
		transform: scale(1)


@keyframes scale-up-center 
	0% 
		-webkit-transform: scale(0.7)
		transform: scale(0.7)

	10% 
		-webkit-transform: scale(1)
		transform: scale(1)
  



</style>