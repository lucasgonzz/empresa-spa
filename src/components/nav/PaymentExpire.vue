<template>
	<b-alert
	class="alert-online c-p s-2 apretable m-t-15"
	show
	v-if="authenticated && days_before_expire < 3"
	variant="danger">
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
		<p
		class="m-b-0">
			Podes realizar el pago del sistema enviando una transferencia a nuestro alias: <strong>comerciocity</strong>
		</p>
	</b-alert>
</template>
<script>
import moment from 'moment'
export default {
	computed: {
		days_before_expire() {
			return moment().diff(this.owner.payment_expired_at, 'days') * -1
		}
	},
}
</script>