<template>
<section
class="med-enc"
data-testid="medidas-detalle-encabezado"
:data-status="corrida.status">

	<div class="med-enc__fila">
		<estado-corrida :corrida="corrida"></estado-corrida>

		<!--
			Detener y reanudar: son solo del acceso maestro (la API contesta 403 a cualquier otra
			sesión, igual que con el catálogo de Imágenes), así que para el resto ni se dibujan. Su
			ayuda se abre a la izquierda: quedan pegados al borde derecho del modal.
		-->
		<div
		v-if="es_acceso_maestro && (corrida.puede_detener || corrida.puede_reanudar)"
		class="med-enc__acciones">
			<b-button
			v-if="corrida.puede_detener"
			class="btn-modulo"
			variant="outline-danger"
			data-testid="medidas-detener"
			data-ayuda-placement="left"
			:disabled="operando"
			@click="$emit('detener')">
				<i class="bi bi-stop-circle m-r-5"></i>
				Detener
			</b-button>
			<b-button
			v-if="corrida.puede_reanudar"
			class="btn-modulo"
			variant="primary"
			data-testid="medidas-reanudar"
			data-ayuda-placement="left"
			:disabled="operando"
			@click="$emit('reanudar')">
				<i class="bi bi-play-circle m-r-5"></i>
				Reanudar
			</b-button>
		</div>
	</div>

	<!-- Por qué terminó, se detuvo o se cortó (por ejemplo, el tope de consultas del día). -->
	<p
	v-if="corrida.motivo_estado"
	class="med-enc__motivo"
	data-testid="medidas-detalle-motivo">
		{{ corrida.motivo_estado }}
	</p>
	<p
	v-else-if="corrida.esta_trabada"
	class="med-enc__motivo">
		No avanza hace más de 15 minutos. Suele destrabarse sola; si sigue así, avisanos.
	</p>

	<div class="med-enc__grilla">

		<!--
			Las consultas al buscador, bien claras: el total grande, y abajo el promedio por artículo.
			Las validaciones con IA van aparte y más chicas: no son consultas, pero también cuestan.
		-->
		<div
		class="med-enc__consultas"
		data-testid="medidas-detalle-consultas"
		:data-consultas="corrida.busquedas">
			<span class="med-enc__consultas-total">{{ total_consultas }}</span>
			<span class="med-enc__consultas-etiqueta">
				{{ corrida.busquedas === 1 ? 'consulta al buscador' : 'consultas al buscador' }}
			</span>
			<span
			v-if="promedio"
			class="med-enc__consultas-detalle">
				{{ promedio }} por artículo
			</span>
			<span class="med-enc__consultas-ia">
				{{ texto_validaciones }}
			</span>
		</div>

		<dl class="med-enc__datos">
			<div class="med-enc__dato">
				<dt>Qué se busca</dt>
				<dd>{{ alcance }}</dd>
			</div>
			<div class="med-enc__dato">
				<dt>Artículos</dt>
				<dd>{{ entero(corrida.total) }}</dd>
			</div>
			<div
			v-if="corrida.lanzada_por"
			class="med-enc__dato">
				<dt>La pidió</dt>
				<dd>{{ corrida.lanzada_por }}</dd>
			</div>
			<!--
				Una que todavía no arrancó (espera turno en la cola, o se frenó antes del primer tramo) no
				tiene started_at: ahí va cuándo se creó, dicho como tal.
			-->
			<div class="med-enc__dato">
				<dt>{{ corrida.started_at ? 'Empezó' : 'Creada' }}</dt>
				<dd>{{ fecha_y_hora(corrida.started_at || corrida.created_at) }}</dd>
			</div>
			<div
			v-if="corrida.finished_at"
			class="med-enc__dato">
				<dt>Terminó</dt>
				<dd>{{ fecha_y_hora(corrida.finished_at) }}</dd>
			</div>
		</dl>

	</div>

</section>
</template>
<script>
import EstadoCorrida from '@/components/alertas/components/lista-de-alertas-table/medidas/EstadoCorrida'
import { entero_es, consultas_por_articulo, texto_de_alcance_de_la_corrida } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * Encabezado del detalle de una corrida de medidas: estado y avance, el motivo si terminó de una
 * forma que hay que explicar, las consultas al buscador (bien claras) y los datos de la corrida.
 * Además, Detener o Reanudar, solo para el acceso maestro.
 *
 * Solo dibuja y avisa (`detener`, `reanudar`): los pedidos los hace el detalle.
 */
export default {
	components: {
		EstadoCorrida,
	},
	props: {
		/** RunPayload normalizado (contrato §2.6). */
		corrida: {
			type: Object,
			required: true,
		},
		/** true si la sesión entró con la clave maestra: la necesitan Detener / Reanudar. */
		es_acceso_maestro: {
			type: Boolean,
			default: false,
		},
		/** true mientras viaja un detener / reanudar: los botones se apagan. */
		operando: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		total_consultas() {
			return entero_es(this.corrida.busquedas)
		},
		promedio() {
			return consultas_por_articulo(this.corrida)
		},
		alcance() {
			return texto_de_alcance_de_la_corrida(this.corrida)
		},
		/**
		 * "1.400 validaciones con IA" (una sola: "1 validación con IA").
		 *
		 * @returns {String}
		 */
		texto_validaciones() {
			let cantidad = this.corrida.validaciones_ia
			if (!cantidad) {
				return 'Sin validaciones con IA'
			}
			return entero_es(cantidad) + (cantidad === 1 ? ' validación con IA' : ' validaciones con IA')
		},
	},
	methods: {
		entero(valor) {
			return entero_es(valor)
		},
		/**
		 * "27/10/26 14:05".
		 *
		 * @param {String|null} valor Fecha ISO.
		 * @returns {String}
		 */
		fecha_y_hora(valor) {
			if (!valor) {
				return '–'
			}
			return this.date(valor) + ' ' + this.hour(valor)
		},
	},
}
</script>
<style lang="sass">
// Sin scope: el detalle es un b-modal (cuelga de <body>). Prefijo med-enc; colores por token.
.med-enc
	display: flex
	flex-direction: column
	gap: 12px
	padding-bottom: 4px
	text-align: left

.med-enc__fila
	display: flex
	flex-direction: row
	align-items: flex-start
	justify-content: space-between
	flex-wrap: wrap
	gap: 10px 16px

	// El estado ocupa lo que haya: la barra de avance se estira hasta los botones.
	.med-estado
		flex: 1 1 260px

.med-enc__acciones
	display: flex
	flex-wrap: wrap
	gap: 8px

.med-enc__motivo
	margin: 0
	padding: 10px 14px
	border-radius: 12px
	font-size: 0.85rem
	line-height: 1.4
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-primary, #212529)

.med-enc__grilla
	display: grid
	grid-template-columns: minmax(200px, 280px) minmax(0, 1fr)
	gap: 12px

.med-enc__consultas
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 2px
	padding: 14px 16px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)

.med-enc__consultas-total
	font-size: 2.2rem
	font-weight: 700
	line-height: 1.05
	letter-spacing: -0.02em
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums

.med-enc__consultas-etiqueta
	font-size: 0.85rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.med-enc__consultas-detalle
	margin-top: 6px
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.med-enc__consultas-ia
	margin-top: 2px
	font-size: 0.75rem
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.med-enc__datos
	display: grid
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))
	align-content: start
	gap: 12px 16px
	margin: 0
	padding: 14px 16px
	border-radius: 12px
	border: 1px solid var(--color-border-secondary, #e9ecef)

.med-enc__dato
	display: flex
	flex-direction: column
	gap: 1px
	min-width: 0

	dt
		font-size: 0.72rem
		font-weight: 500
		letter-spacing: .02em
		text-transform: uppercase
		color: var(--color-text-secondary, #6c757d)

	dd
		margin: 0
		font-size: 0.875rem
		font-weight: 500
		color: var(--color-text-primary, #212529)
		overflow-wrap: anywhere

// Tablet chica y teléfono: las consultas arriba y los datos abajo, a lo ancho.
@media (max-width: 767px)
	.med-enc__grilla
		grid-template-columns: minmax(0, 1fr)

	.med-enc__acciones
		width: 100%

		.btn
			flex: 1 1 0
</style>
