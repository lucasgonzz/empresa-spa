<template>
	<!--
		Renglón de estado de una lista de empleados de la caja: SIEMPRE visible (a diferencia de la ayuda del
		label, que sólo aparece al pasar el mouse). Dice qué pasa hoy con la lista tal como está en el
		formulario, y para Tesorería explicita la herencia de la lista de Vender y deja el atajo de sucursal.
	-->
	<div class="estado-lista">

		<p
		:class="{'estado-lista__aviso': estado.aviso}"
		:data-testid="'estado-lista-' + prop.key">
			<i
			class="bi"
			:class="estado.aviso ? 'bi-exclamation-triangle' : 'bi-info-circle'"></i>
			{{ estado.texto }}
		</p>

		<template v-if="prop.key == 'treasury_users' && model.address_id">
			<b-button
			size="sm"
			variant="outline-primary"
			data-testid="btn-solo-sucursal"
			title="Carga en la lista a los empleados de la sucursal de esta caja. No guarda: revisá y guardá vos."
			@click.stop="cargar_empleados_de_la_sucursal">
				<i class="bi bi-shop"></i>
				Sólo los empleados de la sucursal {{ nombre_sucursal }}
			</b-button>
		</template>

	</div>
</template>
<script>
import {
	texto_estado_vender,
	texto_estado_tesoreria,
	empleados_de_la_sucursal,
} from '@/utils/visibilidad_de_caja'

export default {
	props: {
		// Campo del formulario (`users` o `treasury_users`).
		prop: {
			type: Object,
			required: true,
		},
		// La caja que se está editando.
		model: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Los empleados del store.
		 *
		 * @returns {Array<Object>}
		 */
		employees() {
			return this.$store.state.employee.models
		},
		/**
		 * El texto del renglón y si va en tono de aviso, según la lista de este campo.
		 *
		 * @returns {{texto: string, aviso: boolean}}
		 */
		estado() {
			if (this.prop.key == 'users') {
				return { texto: texto_estado_vender(this.model), aviso: false }
			}
			return texto_estado_tesoreria(this.model)
		},
		/**
		 * La calle de la sucursal de la caja, para el texto del botón.
		 *
		 * @returns {string}
		 */
		nombre_sucursal() {
			let address = this.$store.state.address.models.find(address => {
				return address.id == this.model.address_id
			})
			return address ? address.street : ''
		},
	},
	methods: {
		/**
		 * Carga en la lista de Tesorería del formulario (SIN guardar) a los empleados cuya sucursal es la de
		 * la caja. Reemplaza lo que hubiera en la lista; si no hay ningún empleado en esa sucursal, avisa
		 * dónde asignarla y no toca nada.
		 *
		 * @returns {void}
		 */
		cargar_empleados_de_la_sucursal() {
			let ids = empleados_de_la_sucursal(this.model.address_id, this.employees)

			if (!ids.length) {
				this.$toast.error('No hay empleados con esta sucursal: asignala en Empleados → Sucursal')
				return
			}

			let elegidos = this.employees.filter(employee => {
				return ids.indexOf(employee.id) != -1
			})

			// Se vacía y se completa la MISMA lista (reactiva) y se refleja en el store como hace ModelForm.
			this.model.treasury_users.splice(0, this.model.treasury_users.length)
			elegidos.forEach(employee => {
				this.model.treasury_users.push({
					id: employee.id,
					name: employee.name,
				})
			})
			this.$store.commit('caja/setModel', {
				model: {
					...this.model
				},
				properties: []
			})
			this.$toast.success('Cargados ' + elegidos.length + ' empleados. Guardá la caja para aplicarlo.')
		},
	},
}
</script>
<style lang="sass">
.estado-lista
	p
		margin: 4px 0 6px
		font-size: 13px
		color: var(--bs-secondary-color, #6c757d)

	.estado-lista__aviso
		color: #8a5a00
		font-weight: 600

	.btn
		margin-bottom: 4px
		white-space: normal
</style>
