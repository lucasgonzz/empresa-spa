<template>
	<!--
		Grupo 223 · Prompt 03: línea de tiempo de lo que está por liquidarse en una caja. Se abre
		al clickear el chip "A liquidar" (ver Total.vue) y consume
		GET caja/{id}/liquidaciones-pendientes, que agrupa por fecha de liquidación estimada.
	-->
	<b-modal
	size="md"
	:title="title"
	hide-footer
	id="liquidacion-timeline"
	@shown="cargar">
		<p>
			Cobraste {{ price(total_neto) }} que todavía {{ total_neto == 1 ? 'no está disponible' : 'no están disponibles' }}. Esto es lo que va entrando:
		</p>

		<b-table
		v-if="items.length"
		:items="items"
		:fields="fields"
		small
		striped></b-table>

		<p
		v-else-if="!loading"
		class="text-muted">
			No hay cobros pendientes de liquidar.
		</p>
	</b-modal>
</template>
<script>
export default {
	data() {
		return {
			// Filas devueltas por el backend: {fecha, neto}. El backend no informa cantidad de
			// movimientos por fecha (ver nota de contrato en el reporte del builder), así que esa
			// columna no se muestra: mostrar un "0"/"-" inventado sería peor que omitirla.
			items: [],
			loading: false,
		}
	},
	computed: {
		/**
		 * Caja sobre la que se muestra la línea de tiempo (seteada por quien abre el modal
		 * vía `caja/setModel`, mismo patrón que el resto de los modales de este módulo).
		 *
		 * @returns {Object}
		 */
		caja() {
			return this.$store.state.caja.model
		},

		title() {
			if (this.caja) {
				return 'A liquidar de '+this.caja.name
			}
		},

		/**
		 * Columnas de la tabla: fecha estimada de liquidación y monto neto de ese día.
		 *
		 * @returns {Array}
		 */
		fields() {
			return [
				{ key: 'fecha', label: 'Fecha' },
				{
					key: 'neto',
					label: 'Monto neto',
					formatter: value => this.price(value),
				},
			]
		},

		/**
		 * Total acumulado de todas las filas, para el encabezado en lenguaje de dueño.
		 *
		 * @returns {Number}
		 */
		total_neto() {
			let total = 0
			this.items.forEach(item => {
				total += Number(item.neto)
			})
			return total
		},
	},
	methods: {
		/**
		 * Trae la línea de tiempo de liquidaciones pendientes de la caja activa.
		 *
		 * @returns {void}
		 */
		cargar() {
			if (!this.caja || !this.caja.id) {
				return
			}

			this.loading = true
			this.$store.commit('auth/setMessage', 'Cargando liquidaciones pendientes')
			this.$store.commit('auth/setLoading', true)

			this.$api.get('caja/'+this.caja.id+'/liquidaciones-pendientes')
			.then(res => {
				this.items = res.data.models
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(err => {
				console.log(err)
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
	},
}
</script>
