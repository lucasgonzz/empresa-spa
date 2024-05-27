<template>
	<div>
		<div
		v-if="production_movement.id">
			<b-form-select
			v-model="production_movement.order_production_status_id"
			disabled
			:options="getOptions({key: 'order_production_status_id'})"></b-form-select>
		</div>
		<div
		v-else>
			<b-form-group
			label="Desde">
				<b-form-select
				v-model="desde_estado_id"
				@change="set_options_hacia"
				:options="options_desde"></b-form-select>
			</b-form-group>

			<b-form-group
			class="m-t-15"
			label="Hacia">
				<b-form-select
				:disabled="desde_estado_id == 0"
				v-model="production_movement.order_production_status_id"
				:options="options_hacia"></b-form-select>
			</b-form-group>
		</div>
	</div>
</template>
<script>
export default {
	watch: {
		production_movement() {
			this.set_cantidades_actuales()
		},
	},
	computed: {
		production_movement() {
			return this.$store.state.production_movement.model 
		},
		order_production_statuses() {
			return this.$store.state.order_production_status.models
		},
	},
	data() {
		return {
			cantidades_actuales: [],
			solo_primer_movimiento_disponible: false,
			options_desde: [],
			options_hacia: [],
			desde_estado_id: 0,
		}
	},
	methods: {
		set_cantidades_actuales() {
			this.$store.commit('auth/setMessage', 'Obteniendo informacion')
			this.$store.commit('auth/setLoading', true)

			if (this.production_movement.article_id)
			this.$api.get('production-movement/current-amounts/'+this.production_movement.article_id)
			.then(res => {
				this.$store.commit('auth/setLoading', false)

				this.cantidades_actuales = res.data.response
				this.set_solo_primer_movimiento_disponible()

				this.set_options_desde()

				this.set_options_hacia()
			})
			.catch(err => {
				// this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Hubo un error al buscar')
				console.log(err)
			})
		},
		set_solo_primer_movimiento_disponible() {
			if (this.cantidades_actuales.length == 0) {
				this.solo_primer_movimiento_disponible = true 
			} else {
				let solo_primer_movimiento_disponible = true 
				this.cantidades_actuales.forEach(cantidades_actual => {
					if (cantidades_actual.current_amount && cantidades_actual.current_amount > 0) {
						this.solo_primer_movimiento_disponible = solo_primer_movimiento_disponible 
						solo_primer_movimiento_disponible = false
					}
				})
				this.solo_primer_movimiento_disponible = solo_primer_movimiento_disponible 
			}

			console.log('solo_primer_movimiento_disponible')
			console.log(this.solo_primer_movimiento_disponible)
		},
		es_el_utlimo_estado(estado) {
			return estado.position == this.order_production_statuses[this.order_production_statuses.length-1].position 
		},

		set_options_desde() {
			console.log('set_options_desde')

			let options = [{
				value: 0,
				text: 'Seleccione Estado'
			}]

			options.push({
				value: -1,
				text: 'Es para el PRIMER ESTADO',
			})
			this.cantidades_actuales.forEach(cantidades_actual => {
				if (cantidades_actual.current_amount > 0 && !this.es_el_utlimo_estado(cantidades_actual.order_production_status)) {
					options.push({
						value: cantidades_actual.order_production_status.id,
						text: cantidades_actual.order_production_status.name+' ('+cantidades_actual.current_amount+')',
					})
				}
			})

			console.log(options)
			this.options_desde = options
		},
		set_options_hacia() {

			this.set_order_production_status_desde()

			let options = [{
				value: 0,
				text: 'Seleccione Estado'
			}]
			if (this.solo_primer_movimiento_disponible || this.desde_estado_id == -1) {
				let primer_estado = this.order_production_statuses.find(estado => {
					return estado.position == 1
				})

				options.push({
					value: primer_estado.id,
					text: primer_estado.name,
				})
			} else if (this.desde_estado_id != 0) {
				let desde_estado = this.order_production_statuses.find(estado => {
					return estado.id == this.desde_estado_id
				})
				if (typeof desde_estado != 'undefined') {
					let siguiente_position = desde_estado.position + 1
					let hacia_estado = this.$store.state.order_production_status.models.find(estado => {
						return estado.position == siguiente_position
					})
					if (typeof hacia_estado != 'undefined') {
						let cantidad_actual = this.cantidades_actuales.find(_cantidad_actual => {
							return _cantidad_actual.order_production_status.id == hacia_estado.id
						})

						let text = hacia_estado.name
						if (typeof cantidad_actual != 'undefined') {
							text += ' ('+cantidad_actual.current_amount+')'
						}
						options.push({
							value: hacia_estado.id,
							text: text,
						})
					}
				}
			}
			console.log(options)
			this.options_hacia = options
		},
		
		/*
			Metodo para obtener el "estado_desde" y almacenarlo en el store
			Para despues usarlo para chequear que la cantidad del movimiento a crear
			no sea mayor que la de este estado
		*/
		set_order_production_status_desde() {

			let estado_desde_seleccionado = this.cantidades_actuales.find(cantidad_actual => {
				return cantidad_actual.order_production_status.id == this.desde_estado_id
			})

			if (typeof estado_desde_seleccionado != 'undefined') {
				this.$store.commit('production_movement/set_order_production_status_desde', estado_desde_seleccionado)
			}

		},
	}
}
</script>