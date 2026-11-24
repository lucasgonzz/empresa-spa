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

		<h6 class="resumen-permisos__titulo">Quién ve y quién usa esta caja</h6>

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
						<span class="motivo-linea"><b>Tesorería:</b> {{ fila.motivo_tesoreria }}</span>
						<span class="motivo-linea"><b>Vender:</b> {{ fila.motivo_vender }}</span>
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
<style scoped lang="sass">
// Tabla «Quién ve y quién usa esta caja». Colores: las mismas variables de la caja que usa EstadoCaja.vue
// (src/sass/_dark_theme.sass), definidas en tema claro y oscuro: verde = sí, gris = no.
// Nada se anima, así que no hay transiciones que cuidar.
.resumen-permisos
	// Aire arriba (separa del botón de sucursal) y abajo (separa del campo que sigue).
	margin: 18px 0 20px
	// En tablet, si no entra, la tabla tiene su propio scroll horizontal y no el de la página.
	overflow-x: auto
	border: 1px solid var(--caja-cerrada-acento)
	border-radius: 8px

.resumen-permisos__titulo
	margin: 0
	padding: 10px 14px
	font-size: 14px
	font-weight: 600

.resumen-permisos__tabla
	width: 100%
	min-width: 640px
	border-collapse: collapse
	font-size: 13px

	// Encabezado con fondo propio y borde inferior marcado, para distinguirlo del cuerpo.
	thead th
		background: var(--caja-cerrada-fondo-hover)
		color: var(--caja-cerrada-texto)
		font-size: 12px
		font-weight: 700
		text-transform: uppercase
		letter-spacing: .04em
		border-top: 1px solid var(--caja-cerrada-acento)
		border-bottom: 2px solid var(--caja-cerrada-acento)

	th, td
		padding: 10px 14px
		text-align: left
		vertical-align: top

	tbody td
		border-bottom: 1px solid var(--caja-cerrada-fondo-hover)

	tbody tr:last-child td
		border-bottom: 0

.resumen-permisos__nombre
	font-weight: 600

// Pastilla de «Ve / Usa» (verde) y «No ve / No usa» (gris).
.pastilla
	display: inline-block
	padding: 2px 12px
	border: 1px solid transparent
	border-radius: 999px
	font-size: 12px
	font-weight: 700
	white-space: nowrap

.pastilla--si
	background: var(--caja-abierta-fondo)
	border-color: var(--caja-abierta-acento)
	color: var(--caja-abierta-texto)

.pastilla--no
	background: var(--caja-cerrada-fondo)
	border-color: var(--caja-cerrada-acento)
	color: var(--caja-cerrada-texto)

// Motivo: una línea por lista, cada una con su rótulo.
.motivo-linea
	display: block
	line-height: 1.5

// Teléfono (360-390 px): cada empleado es una tarjeta, sin scroll horizontal. Empleado arriba, después las
// pastillas con su rótulo (data-label) y los motivos debajo.
@media (max-width: 575px)
	.resumen-permisos
		overflow-x: visible

	.resumen-permisos__tabla
		min-width: 0
		display: block

		thead
			display: none

		tbody
			display: block

		tr
			display: block
			padding: 10px 14px
			border-bottom: 1px solid var(--caja-cerrada-acento)

		tbody tr:last-child
			border-bottom: 0

		tbody td
			display: inline-block
			padding: 4px 10px 4px 0
			border-bottom: 0

		tbody td::before
			content: attr(data-label) ": "
			font-size: 11px
			color: var(--caja-cerrada-texto)

		.resumen-permisos__nombre
			display: block
			font-size: 15px

		.resumen-permisos__nombre::before
			content: none

		.resumen-permisos__motivo
			display: block
			padding-top: 6px

		.resumen-permisos__motivo::before
			content: none
</style>
