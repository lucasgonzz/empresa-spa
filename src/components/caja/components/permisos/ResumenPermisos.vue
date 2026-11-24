<template>
	<!--
		Tabla «Quién ve y quién usa esta caja»: una fila por empleado con lo que ve en Tesorería y lo que usa en
		Vender, y el motivo. Mira el modelo del formulario, así que cambia al instante cuando se agrega o se
		saca a alguien de las listas, antes de guardar.
	-->
	<div
	v-if="filas.length"
	class="resumen-permisos"
	data-testid="resumen-permisos">

		<h6>Quién ve y quién usa esta caja</h6>

		<table class="resumen-permisos__tabla">
			<thead>
				<tr>
					<th>Empleado</th>
					<th>Sucursal</th>
					<th>Tesorería</th>
					<th>Vender</th>
					<th>Motivo</th>
				</tr>
			</thead>
			<tbody>
				<tr
				v-for="fila in filas"
				:key="fila.id"
				:data-testid="'resumen-fila-' + fila.id">
					<td
					class="resumen-permisos__nombre"
					data-label="Empleado">{{ fila.name }}</td>
					<td data-label="Sucursal">{{ nombre_sucursal(fila.sucursal_id) }}</td>
					<td data-label="Tesorería">
						<span
						class="pastilla"
						:class="fila.ve_en_tesoreria ? 'pastilla--si' : 'pastilla--no'">
							{{ fila.ve_en_tesoreria ? 'Ve' : 'No ve' }}
						</span>
					</td>
					<td data-label="Vender">
						<span
						class="pastilla"
						:class="fila.usa_en_vender ? 'pastilla--si' : 'pastilla--no'">
							{{ fila.usa_en_vender ? 'Usa' : 'No usa' }}
						</span>
					</td>
					<td
					class="resumen-permisos__motivo"
					data-label="Motivo">
						<span>Tesorería: {{ fila.motivo_tesoreria }}</span>
						<span>Vender: {{ fila.motivo_vender }}</span>
					</td>
				</tr>
			</tbody>
		</table>

	</div>
</template>
<script>
import { resumen_por_empleado } from '@/utils/visibilidad_de_caja'

export default {
	props: {
		// La caja que se está editando (sus listas `users` y `treasury_users` sin guardar).
		model: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Una fila por empleado según las listas del formulario.
		 *
		 * @returns {Array<Object>}
		 */
		filas() {
			return resumen_por_empleado(this.model, this.$store.state.employee.models)
		},
	},
	methods: {
		/**
		 * La calle de una sucursal, o un guion si el empleado no tiene sucursal.
		 *
		 * @param {Number|null} address_id Sucursal del empleado.
		 * @returns {string}
		 */
		nombre_sucursal(address_id) {
			if (!address_id) {
				return '-'
			}
			let address = this.$store.state.address.models.find(address => {
				return address.id == address_id
			})
			return address ? address.street : '-'
		},
	},
}
</script>
<style lang="sass">
.resumen-permisos
	margin-top: 10px
	overflow-x: auto

	h6
		font-weight: 600
		margin-bottom: 6px

.resumen-permisos__tabla
	width: 100%
	border-collapse: collapse
	font-size: 13px

	th, td
		padding: 6px 8px
		border-bottom: 1px solid rgba(128, 128, 128, .25)
		text-align: left
		vertical-align: top

	.pastilla
		display: inline-block
		padding: 1px 10px
		border-radius: 999px
		font-size: 12px
		font-weight: 600

	.pastilla--si
		background: rgba(25, 135, 84, .15)
		color: #146c43

	.pastilla--no
		background: rgba(220, 53, 69, .12)
		color: #b02a37

.resumen-permisos__motivo
	span
		display: block

// Teléfono: cada empleado se apila en una tarjeta, con Empleado arriba y las pastillas debajo.
@media (max-width: 575px)
	.resumen-permisos__tabla
		thead
			display: none

		tr
			display: block
			padding: 6px 0
			border-bottom: 1px solid rgba(128, 128, 128, .25)

		td
			display: inline-block
			border-bottom: 0
			padding: 2px 6px

		.resumen-permisos__nombre
			display: block
			font-weight: 600

		.resumen-permisos__motivo
			display: block
			font-size: 12px
