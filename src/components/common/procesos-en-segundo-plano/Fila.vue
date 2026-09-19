<template>
<div
class="proceso-fila"
:class="clases"
:style="{ '--acento': tipo.acento }"
data-testid="proceso-fila"
:data-tipo="proceso.tipo"
:data-status="proceso.status"
:data-id="proceso.id"
role="button"
tabindex="0"
:title="'Ver el detalle de ' + titulo.toLowerCase()"
@click="$emit('abrir', proceso)"
@keydown.enter.prevent="$emit('abrir', proceso)"
@keydown.space.prevent="$emit('abrir', proceso)">

	<div class="proceso-fila__icono">
		<i :class="'bi ' + tipo.icono"></i>
	</div>

	<div class="proceso-fila__cuerpo">

		<div class="proceso-fila__linea">
			<span class="proceso-fila__titulo">
				{{ titulo }}
			</span>
			<chip-estado :status="proceso.status"></chip-estado>
		</div>

		<p
		v-if="proceso.detalle"
		class="proceso-fila__detalle">
			{{ proceso.detalle }}
		</p>

		<p class="proceso-fila__meta">
			{{ texto_tiempo }}<template v-if="lanzado_por"> · {{ lanzado_por }}</template>
		</p>

		<template v-if="activo">
			<barra-progreso
			class="proceso-fila__barra"
			:porcentaje="proceso.porcentaje"
			:status="proceso.status"></barra-progreso>
			<p
			v-if="texto_progreso"
			class="proceso-fila__etapa">
				{{ texto_progreso }}
			</p>
		</template>

		<p
		v-if="fallo && proceso.error_message"
		class="proceso-fila__error">
			{{ proceso.error_message }}
		</p>

		<div
		v-if="fallo && es_importacion"
		class="proceso-fila__acciones">
			<button
			type="button"
			class="proceso-fila__accion"
			data-testid="proceso-ver-historial"
			@click.stop="$emit('ver_historial', proceso)">
				Ver historial
			</button>
		</div>

	</div>

	<button
	v-if="con_cerrar"
	type="button"
	class="proceso-fila__cerrar"
	data-testid="proceso-cerrar"
	title="Quitar de la lista"
	@click.stop="$emit('cerrar', proceso)">
		<i class="bi bi-x-lg"></i>
	</button>

</div>
</template>
<script>
import moment from 'moment'
import { tipo_de, es_de_importacion, esta_activo } from '@/components/common/procesos-en-segundo-plano/tipos'

/**
 * Una fila (tarjeta) del modal de procesos en segundo plano: icono por tipo, titulo, detalle,
 * cuando arranco y quien lo lanzo, chip de estado y --mientras corre-- la barra de progreso con
 * su texto. Click en cualquier parte abre el detalle; la "x" (solo en los terminados) lo marca
 * visto.
 */
export default {
	components: {
		ChipEstado: () => import('@/components/common/procesos-en-segundo-plano/ChipEstado'),
		BarraProgreso: () => import('@/components/common/procesos-en-segundo-plano/BarraProgreso'),
	},
	props: {
		/** Proceso tal como lo devuelve el contrato. */
		proceso: {
			type: Object,
			required: true,
		},
		/** Nombre de quien lo lanzo, ya resuelto por el padre (null = no se muestra nada). */
		lanzado_por: {
			type: String,
			default: null,
		},
		/** true para la seccion de terminados: mas apagada. */
		apagada: {
			type: Boolean,
			default: false,
		},
		/** true para mostrar la "x" que lo marca visto. */
		con_cerrar: {
			type: Boolean,
			default: false,
		},
		/**
		 * Marca de tiempo (ms) que el padre renueva cada tanto para que "hace 4 minutos" se
		 * vuelva a calcular: un computed solo se recalcula cuando cambia algo de lo que lee.
		 */
		ahora: {
			type: Number,
			default: 0,
		},
	},
	computed: {
		tipo() {
			return tipo_de(this.proceso.tipo)
		},
		titulo() {
			return this.proceso.titulo || this.tipo.etiqueta
		},
		activo() {
			return esta_activo(this.proceso)
		},
		fallo() {
			return this.proceso.status === 'fallo'
		},
		es_importacion() {
			return es_de_importacion(this.proceso.tipo)
		},
		medible() {
			return this.proceso.porcentaje !== null && typeof this.proceso.porcentaje !== 'undefined'
		},
		clases() {
			return {
				'proceso-fila--apagada': this.apagada,
				'proceso-fila--fallo': this.fallo,
				'proceso-fila--activa': this.activo,
			}
		},
		/**
		 * "Iniciado hace 4 minutos · 12:03" mientras corre; "Terminado hace 2 minutos · 12:10"
		 * (o "Falló ...") cuando termino. Lee `ahora` solo para depender de el.
		 */
		texto_tiempo() {
			// eslint-disable-next-line no-unused-vars
			let tick = this.ahora

			if (this.activo || !this.proceso.finished_at) {
				return this.describir_momento('Iniciado', this.proceso.started_at)
			}
			return this.describir_momento(this.fallo ? 'Falló' : 'Terminado', this.proceso.finished_at)
		},
		/**
		 * Debajo de la barra: medible -> "3 de 12 lotes · 41 %"; no medible -> la etapa.
		 * Los hitos (total 100, sin unidad) muestran la etapa y el porcentaje.
		 */
		texto_progreso() {
			let proceso = this.proceso

			if (!this.medible) {
				return proceso.etapa || ''
			}

			let partes = []

			if (proceso.unidad && proceso.total) {
				partes.push(this.numero_es(proceso.procesados || 0) + ' de ' + this.numero_es(proceso.total) + ' ' + proceso.unidad)
			} else if (proceso.etapa) {
				partes.push(proceso.etapa)
			}

			partes.push(proceso.porcentaje + ' %')

			return partes.join(' · ')
		},
	},
	methods: {
		/**
		 * "Iniciado hace 4 minutos · 12:03". Sin fecha, solo el verbo.
		 *
		 * @param {String} verbo
		 * @param {String|null} fecha ISO 8601 con zona.
		 * @returns {String}
		 */
		describir_momento(verbo, fecha) {
			if (!fecha) {
				return verbo
			}
			let momento = moment(fecha)
			if (!momento.isValid()) {
				return verbo
			}
			return verbo + ' ' + momento.fromNow() + ' · ' + momento.format('HH:mm')
		},
	},
}
</script>
<style lang="sass">
.proceso-fila
	display: flex
	flex-direction: row
	align-items: flex-start
	gap: 14px
	padding: 14px 16px
	border-radius: 14px
	background: var(--bg-card, #fff)
	border: 1px solid var(--color-border-secondary, #e9ecef)
	cursor: pointer
	text-align: left
	transition: background .15s ease, border-color .15s ease, transform .18s ease, box-shadow .18s ease

	&:hover
		background: var(--bg-hover, #f1f3f5)
		border-color: var(--color-border, #dee2e6)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 2px

	& + &
		margin-top: 8px

.proceso-fila__icono
	flex: 0 0 40px
	width: 40px
	height: 40px
	border-radius: 12px
	display: flex
	align-items: center
	justify-content: center
	font-size: 18px
	// El acento del tipo llega como triple RGB (ver tipos.js): fondo suave y trazo pleno del
	// mismo color, valido en los dos modos porque el fondo es translucido sobre la tarjeta.
	background: rgba(var(--acento, 108, 117, 125), .12)
	color: rgb(var(--acento, 108, 117, 125))

.proceso-fila__cuerpo
	flex: 1 1 auto
	min-width: 0

.proceso-fila__linea
	display: flex
	flex-direction: row
	align-items: center
	justify-content: space-between
	gap: 10px

.proceso-fila__titulo
	flex: 1 1 auto
	font-size: 14px
	font-weight: 600
	line-height: 1.3
	color: var(--color-text-primary, #212529)
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap
	min-width: 0

.proceso-fila__detalle
	margin: 2px 0 0
	font-size: 13px
	line-height: 1.35
	color: var(--color-text-secondary, #6c757d)
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap

.proceso-fila__meta
	margin: 2px 0 0
	font-size: 12px
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.proceso-fila__barra
	margin-top: 10px

.proceso-fila__etapa
	margin: 6px 0 0
	font-size: 12px
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.proceso-fila__error
	margin: 8px 0 0
	font-size: 12.5px
	line-height: 1.4
	color: var(--btn-peligro-texto, #9c3a36)
	// Un mensaje de error puede ser largo: se muestra completo, con quiebre.
	white-space: pre-wrap
	word-break: break-word

.proceso-fila__acciones
	margin-top: 8px

.proceso-fila__accion
	border: 0
	background: transparent
	padding: 0
	font-size: 13px
	font-weight: 500
	color: var(--color-primary, #007bff)
	// La regla global de _inputs.sass le pone box-shadow a los button: aca no.
	box-shadow: none
	transition: opacity .15s ease

	&:hover
		opacity: .7

.proceso-fila__cerrar
	flex: 0 0 26px
	width: 26px
	height: 26px
	margin: -2px -4px 0 0
	border: 0
	border-radius: 50%
	padding: 0
	display: flex
	align-items: center
	justify-content: center
	font-size: 11px
	background: transparent
	color: var(--color-text-secondary, #6c757d)
	box-shadow: none
	transition: background .15s ease, color .15s ease

	&:hover
		background: rgba(0, 0, 0, .06)
		color: var(--color-text-primary, #212529)

// Terminados: mas apagados, sin transform en hover.
.proceso-fila--apagada
	background: var(--bg-section, #f8f9fa)
	border-color: transparent

	.proceso-fila__icono
		opacity: .75

	.proceso-fila__titulo
		font-weight: 500

	&:hover
		background: var(--bg-hover, #f1f3f5)

.proceso-fila--fallo
	.proceso-fila__icono
		background: var(--btn-peligro-fondo, #fdf3f2)
		color: var(--btn-peligro-texto, #9c3a36)

@media (max-width: 575px)
	.proceso-fila
		gap: 12px
		padding: 12px 12px

	.proceso-fila__icono
		flex-basis: 34px
		width: 34px
		height: 34px
		border-radius: 10px
		font-size: 16px

	// En teléfono el titulo y el chip no entran en una linea: el chip baja.
	.proceso-fila__linea
		flex-wrap: wrap
		gap: 4px 8px

html.dark-mode
	.proceso-fila__cerrar:hover
		background: rgba(255, 255, 255, .1)
</style>
