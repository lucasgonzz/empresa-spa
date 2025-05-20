<template>
	<div class="buttons m-b-15 m-lg-b-0 align-center">
		<b-button
		v-for="fecha in fechas"
		class="m-r-10"
		size="lg"
		@click="clicked(fecha)"
		:variant="active(fecha) ? 'primary' : 'outline-primary'">
			{{ fecha }}
		</b-button>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	props: {
		model_name: String,
	},
	computed: {
		from_date() {
			return moment(this.$store.state[this.model_name].from_date).format('YYYY-MM-DD')
		},
		fechas() {
			return [
				'Ayer',
				'Hoy',
				'Mañana',
				'Pasado',
			]
		},
	},
	methods: {
		active(fecha) {
			if (fecha == 'Ayer') {
				return this.from_date == moment().subtract(1, 'days').format('YYYY-MM-DD')
			}
			if (fecha == 'Hoy') {
				return this.from_date == moment().format('YYYY-MM-DD')
			}
			if (fecha == 'Mañana') {
				return this.from_date == moment().add(1, 'days').format('YYYY-MM-DD')
			}
			if (fecha == 'Pasado') {
				return this.from_date == moment().add(2, 'days').format('YYYY-MM-DD')
			}
		},
		clicked(fecha) {
			let date = this.get_fecha(fecha)
			this.$store.commit(this.model_name+'/setFromDate', date)
			this.$store.dispatch(this.model_name+'/getModels')
		},
		get_fecha(fecha) {
			if (fecha == 'Ayer') {
				return moment().subtract(1, 'days').format('YYYY-MM-DD')
			}
			if (fecha == 'Hoy') {
				return moment().format('YYYY-MM-DD')
			}
			if (fecha == 'Mañana') {
				return moment().add(1, 'days').format('YYYY-MM-DD')
			}
			if (fecha == 'Pasado') {
				return moment().add(2, 'days').format('YYYY-MM-DD')
			}
		} 
	}
}
</script>