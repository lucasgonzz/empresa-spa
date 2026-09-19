<template>
<div
class="proceso-encabezado"
:class="'proceso-encabezado--' + proceso.status">

	<anillo
	:tamano="tamano"
	:grosor="6"
	:porcentaje="porcentaje"
	:status="proceso.status"></anillo>

	<div class="proceso-encabezado__texto">
		<div class="proceso-encabezado__linea">
			<span
			v-if="etapa_visible"
			class="proceso-encabezado__etapa"
			data-testid="proceso-detalle-etapa">
				{{ etapa_visible }}
			</span>
			<chip-estado :status="proceso.status"></chip-estado>
		</div>

		<p class="proceso-encabezado__momento">
			{{ texto_tiempo }}
		</p>

		<p
		v-if="proceso.status === 'fallo' && proceso.error_message"
		class="proceso-encabezado__error"
		data-testid="proceso-detalle-error">
			{{ proceso.error_message }}
		</p>
	</div>

</div>
</template>
<script>
import moment from 'moment'
import { esta_activo } from '@/components/common/procesos-en-segundo-plano/tipos'

/**
 * Cabecera comun de todos los detalles: el anillo grande, la etapa ("Lote 3 de 12"), el chip de
 * estado, cuando arranco / termino y --si fallo-- el mensaje de error en el rojo del tema.
 */
export default {
	components: {
		Anillo: () => import('@/components/common/procesos-en-segundo-plano/Anillo'),
		ChipEstado: () => import('@/components/common/procesos-en-segundo-plano/ChipEstado'),
	},
	props: {
		proceso: {
			type: Object,
			required: true,
		},
		/** Texto de la etapa; si no viene, se usa `proceso.etapa`. */
		etapa: {
			type: String,
			default: null,
		},
		/** Lado del anillo en px. */
		tamano: {
			type: Number,
			default: 88,
		},
	},
	computed: {
		porcentaje() {
			if (this.proceso.porcentaje === null || typeof this.proceso.porcentaje === 'undefined') {
				return null
			}
			return Number(this.proceso.porcentaje)
		},
		etapa_visible() {
			return this.etapa || this.proceso.etapa || ''
		},
		/** "Iniciado hace 4 minutos · 12:03", y ademas "Terminado 12:10" si ya cerro. */
		texto_tiempo() {
			let partes = []
			let inicio = this.formato(this.proceso.started_at)
			let fin = this.formato(this.proceso.finished_at)

			if (inicio) {
				partes.push('Iniciado ' + inicio)
			}
			if (!esta_activo(this.proceso) && fin) {
				partes.push((this.proceso.status === 'fallo' ? 'Falló ' : 'Terminado ') + fin)
			}
			return partes.join(' · ')
		},
	},
	methods: {
		/**
		 * "hace 4 minutos, 12:03" o cadena vacia si la fecha no vino.
		 *
		 * @param {String|null} fecha
		 * @returns {String}
		 */
		formato(fecha) {
			if (!fecha) {
				return ''
			}
			let momento = moment(fecha)
			if (!momento.isValid()) {
				return ''
			}
			return momento.fromNow() + ', ' + momento.format('HH:mm')
		},
	},
}
</script>
<style lang="sass">
.proceso-encabezado
	display: flex
	flex-direction: row
	align-items: center
	gap: 20px
	padding: 4px 0 18px

.proceso-encabezado__texto
	flex: 1 1 auto
	min-width: 0
	text-align: left

.proceso-encabezado__linea
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
	gap: 6px 12px

.proceso-encabezado__etapa
	font-size: 22px
	font-weight: 600
	letter-spacing: -0.02em
	line-height: 1.2
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums

.proceso-encabezado__momento
	margin: 6px 0 0
	font-size: 13px
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.proceso-encabezado__error
	margin: 10px 0 0
	padding: 10px 12px
	border-radius: 10px
	font-size: 13px
	line-height: 1.45
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)
	white-space: pre-wrap
	word-break: break-word

@media (max-width: 575px)
	.proceso-encabezado
		gap: 14px

	.proceso-encabezado__etapa
		font-size: 18px
</style>
