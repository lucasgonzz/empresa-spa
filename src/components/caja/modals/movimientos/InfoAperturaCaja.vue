<template>
	<div
	class="info-apertura"
	v-if="apertura_caja && apertura_caja.id">

		<div class="info-apertura__titulo">
			<estado-caja
			:abierta="esta_en_curso"
			texto_abierta="Apertura en curso"
			texto_cerrada="Apertura cerrada"></estado-caja>

			<span
			class="info-apertura__duracion"
			v-if="duracion">
				{{ duracion }}
			</span>
		</div>

		<div class="info-apertura__datos">
			<div class="info-apertura__dato">
				<span class="info-apertura__label">Saldo apertura</span>
				<span class="info-apertura__valor">{{ price(apertura_caja.saldo_apertura) }}</span>
			</div>

			<div class="info-apertura__dato">
				<span class="info-apertura__label">Total ingresos</span>
				<span class="info-apertura__valor info-apertura__valor--ingreso">{{ price(apertura_caja.total_ingresos) }}</span>
			</div>

			<div class="info-apertura__dato">
				<span class="info-apertura__label">Total egresos</span>
				<span class="info-apertura__valor info-apertura__valor--egreso">{{ price(apertura_caja.total_egresos) }}</span>
			</div>

			<!--
				La cuarta tarjeta cambia segun el estado: saldo de cierre si la apertura ya cerro,
				y el neto del turno si sigue en curso. NO se muestra caja.saldo: desde el modal de
				aperturas se puede estar mirando una apertura vieja, y caja.saldo es el de hoy.
			-->
			<div
			class="info-apertura__dato"
			v-if="esta_en_curso">
				<span class="info-apertura__label">Neto del turno</span>
				<span class="info-apertura__valor">{{ price(neto_del_turno) }}</span>
			</div>

			<div
			class="info-apertura__dato"
			v-else>
				<span class="info-apertura__label">Saldo cierre</span>
				<span class="info-apertura__valor">{{ price(apertura_caja.saldo_cierre) }}</span>
			</div>
		</div>

		<div class="info-apertura__pie">
			<span
			class="info-apertura__meta"
			v-if="nombre_apertura">
				<i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>
				Abrio <strong>{{ nombre_apertura }}</strong> el {{ date(apertura_caja.created_at, true) }}
			</span>

			<span
			class="info-apertura__meta"
			v-if="nombre_cierre">
				<i class="bi bi-box-arrow-right" aria-hidden="true"></i>
				Cerro <strong>{{ nombre_cierre }}</strong> el {{ date(apertura_caja.cerrada_at, true) }}
			</span>
		</div>
	</div>
</template>
<script>
import moment from 'moment'

export default {
	components: {
		EstadoCaja: () => import('@/components/caja/components/EstadoCaja'),
	},
	computed: {
		apertura_caja() {
			return this.$store.state.apertura_caja.model
		},
		/**
		 * true cuando la apertura todavia no se cerro. Se mira cerrada_at y no el estado de la
		 * caja: desde el modal de aperturas se puede estar viendo una apertura vieja de una caja
		 * que hoy esta abierta de nuevo.
		 *
		 * @returns {Boolean}
		 */
		esta_en_curso() {
			if (!this.apertura_caja) {
				return false
			}
			return !this.apertura_caja.cerrada_at
		},
		/**
		 * Nombre de quien abrio. Devuelve null si el empleado no esta en el store (por ejemplo,
		 * si fue dado de baja): el template usa eso como guard. Antes de este prompt la linea de
		 * CIERRE hacia get_perfil_usuario(...).name sin este chequeo y tiraba TypeError, llevandose
		 * puesto el render del modal entero.
		 *
		 * @returns {String|null}
		 */
		nombre_apertura() {
			return this.nombre_de_empleado('apertura_employee_id')
		},
		/**
		 * Nombre de quien cerro, con el mismo guard que nombre_apertura. Devuelve null si la
		 * apertura sigue en curso o si el empleado no esta en el store.
		 *
		 * @returns {String|null}
		 */
		nombre_cierre() {
			return this.nombre_de_empleado('cierre_employee_id')
		},
		/**
		 * Ingresos menos egresos de esta apertura. Es lo que dice la propia apertura, sin mezclar
		 * el saldo actual de la caja.
		 *
		 * @returns {Number}
		 */
		neto_del_turno() {
			if (!this.apertura_caja) {
				return 0
			}
			return Number(this.apertura_caja.total_ingresos || 0) - Number(this.apertura_caja.total_egresos || 0)
		},
		/**
		 * Cuanto duro la apertura, o cuanto lleva abierta si sigue en curso. Se usa el mismo
		 * moment que ya importa src/mixins/model_functions.js, sin agregar ninguna dependencia.
		 * Devuelve null si falta created_at.
		 *
		 * @returns {String|null}
		 */
		duracion() {
			if (!this.apertura_caja || !this.apertura_caja.created_at) {
				return null
			}

			let desde = moment(this.apertura_caja.created_at)
			let hasta = this.apertura_caja.cerrada_at ? moment(this.apertura_caja.cerrada_at) : moment()
			let minutos = hasta.diff(desde, 'minutes')

			if (minutos < 0) {
				return null
			}

			let horas = Math.floor(minutos / 60)
			let resto = minutos % 60
			let texto = horas + ' h ' + (resto < 10 ? '0' + resto : resto) + ' min'

			if (this.apertura_caja.cerrada_at) {
				return 'Duro ' + texto
			}
			return 'Lleva ' + texto + ' abierta'
		},
	},
	methods: {
		/**
		 * Nombre del empleado apuntado por una key de la apertura, o null si no esta en el store.
		 * get_perfil_usuario() devuelve undefined cuando no lo encuentra (por ejemplo un empleado
		 * dado de baja), asi que el .name se hace solo despues de comprobar el resultado.
		 *
		 * @param {String} key apertura_employee_id | cierre_employee_id
		 * @returns {String|null}
		 */
		nombre_de_empleado(key) {
			if (!this.apertura_caja || !this.apertura_caja[key]) {
				return null
			}

			let empleado = this.get_perfil_usuario(this.apertura_caja[key])

			if (typeof empleado == 'undefined' || !empleado) {
				return null
			}
			return empleado.name
		},
	},
}
</script>
<style scoped lang="sass">
// El width: 500px fijo que tenia este archivo se saca: el modal es size="lg" (90% del ancho
// en pantallas grandes) y dejaba el encabezado como una columna angosta pegada a la
// izquierda; en el celular directamente desbordaba.
.info-apertura
	display: flex
	flex-direction: column
	gap: 12px
	padding: 14px 16px
	border-radius: 10px
	border: 1px solid var(--color-border)
	background: var(--bg-section)
	margin-bottom: 12px

	&__titulo
		display: flex
		align-items: center
		gap: 12px
		flex-wrap: wrap

	&__duracion
		font-size: 0.8rem
		color: var(--color-text-secondary)

	&__datos
		// auto-fit + minmax deja las cuatro tarjetas en una fila en el escritorio y las
		// apila de a dos en el celular, sin media queries.
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))
		gap: 14px

	&__dato
		display: flex
		flex-direction: column
		gap: 2px
		min-width: 0

	&__label
		font-size: 0.68rem
		font-weight: 600
		color: var(--color-text-secondary)
		text-transform: uppercase
		letter-spacing: 0.04em
		line-height: 1.2
		white-space: nowrap

	&__valor
		font-size: 1.05rem
		font-weight: 700
		line-height: 1.2
		color: var(--color-text-primary)
		white-space: nowrap

		&--ingreso
			color: var(--caja-abierta-texto)

		&--egreso
			color: var(--caja-cerrar-texto)

	&__pie
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 8px 22px
		padding-top: 10px
		border-top: 1px solid var(--color-border)

	&__meta
		display: inline-flex
		align-items: center
		gap: 7px
		font-size: 0.82rem
		color: var(--color-text-secondary)

		strong
			color: var(--color-text-primary)
			font-weight: 600
</style>
