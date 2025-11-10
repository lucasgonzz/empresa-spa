<template>
	<div
	class="p-t-50 scale-up-center"
	show
	v-if="user && days_before_expire < 3">

	    <confirm
	    not_show_delete_text
	    emit="-"
	    backdrop
	    btn_text="Entendido"
	    text="Realice el pago del sistema para continuar usando el servicio"
	    id="aviso-vencido"></confirm>

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
					<p>
						El total a pagar es de: <strong>{{ price(owner.total_a_pagar) }}</strong>
					</p>
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
	watch: {
		authenticated() {
			this.mostrar_alerta()
		}
	},
	components: {
		Confirm: () => import('@/common-vue/components/Confirm'),
	},
	methods: {
		mostrar_alerta() {
			if (this.days_before_expire < 1) {

				const today = moment()

				if (today.day() === 0) {
				    console.log('Es domingo')
				} else if (today.day() === 6) {
				    console.log('Es sábado')
				} else {
					setInterval(() => {
						this.$bvModal.show('aviso-vencido')
					}, 30000)
				}
				
			}
		},
	},
	computed: {
		dolar() {
			return this.$store.state.dolar.promedio 
		},
		employees() {
			return this.$store.state.employee.models 
		},
		total_a_pagar() {
			let total = this.employees.length * 20
			total = total * this.dolar 
			return total 
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
	margin: 0 auto
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