<template>
<div
class="proceso-detalle proceso-detalle--recalculo"
data-testid="proceso-detalle-recalculo-precios"
:data-status="proceso.status">

	<encabezado
	:proceso="proceso"
	:etapa="etapa_texto"></encabezado>

	<div
	v-if="origen_texto"
	class="proceso-detalle__origen"
	data-testid="proceso-detalle-origen">
		<span class="proceso-detalle__origen-etiqueta">Origen</span>
		<strong class="proceso-detalle__origen-texto">{{ origen_texto }}</strong>
		<span
		v-if="origen_detalle"
		class="proceso-detalle__origen-detalle">
			{{ origen_detalle }}
		</span>
	</div>

	<metricas :metricas="metricas"></metricas>

</div>
</template>
<script>
/**
 * Detalle de un recalculo de precios (ProcessSetFinalPrices): de donde salio (el margen de un
 * proveedor, un cambio de costo, una masiva...), lotes procesados y --al cerrar-- cuantos
 * articulos cambiaron de precio.
 *
 * Los numeros salen de `referencia.price_update_run` si vino, y si no de `proceso.resultado`.
 */
export default {
	components: {
		Encabezado: () => import('@/components/common/procesos-en-segundo-plano/detalle/Encabezado'),
		Metricas: () => import('@/components/common/procesos-en-segundo-plano/detalle/Metricas'),
	},
	props: {
		proceso: {
			type: Object,
			required: true,
		},
		referencia: {
			type: Object,
			default: null,
		},
	},
	computed: {
		run() {
			return this.referencia && this.referencia.price_update_run ? this.referencia.price_update_run : null
		},
		resultado() {
			return this.proceso.resultado && typeof this.proceso.resultado === 'object' ? this.proceso.resultado : {}
		},
		activo() {
			return this.proceso.status === 'pendiente' || this.proceso.status === 'en_proceso'
		},
		origen_texto() {
			if (this.run && this.run.origen_texto) {
				return String(this.run.origen_texto)
			}
			if (this.resultado.origen_texto) {
				return String(this.resultado.origen_texto)
			}
			return null
		},
		origen_detalle() {
			if (this.run && this.run.origen_detalle) {
				return String(this.run.origen_detalle)
			}
			return null
		},
		total_lotes() {
			if (this.run && this.run.total_chunks) {
				return Number(this.run.total_chunks)
			}
			return this.proceso.total || null
		},
		lotes_procesados() {
			if (this.run && typeof this.run.processed_chunks !== 'undefined') {
				return Number(this.run.processed_chunks) || 0
			}
			return this.proceso.procesados || 0
		},
		/** "Lote 3 de 12" mientras corre; "12 lotes" cuando cerro. */
		etapa_texto() {
			if (this.proceso.etapa) {
				return this.proceso.etapa
			}
			if (!this.total_lotes) {
				return this.activo ? 'Preparando los lotes' : ''
			}
			return 'Lote ' + this.numero_es(this.lotes_procesados) + ' de ' + this.numero_es(this.total_lotes)
		},
		articulos_actualizados() {
			if (this.run && this.run.articles_updated !== null && typeof this.run.articles_updated !== 'undefined') {
				return Number(this.run.articles_updated)
			}
			if (this.resultado.articulos_actualizados !== null && typeof this.resultado.articulos_actualizados !== 'undefined') {
				return Number(this.resultado.articulos_actualizados)
			}
			return null
		},
		proveedores() {
			if (this.resultado.proveedores !== null && typeof this.resultado.proveedores !== 'undefined') {
				return Number(this.resultado.proveedores)
			}
			return null
		},
		metricas() {
			let metricas = [
				{
					clave: 'lotes',
					etiqueta: 'Lotes procesados',
					valor: this.total_lotes ? this.numero_es(this.lotes_procesados) + ' de ' + this.numero_es(this.total_lotes) : this.lotes_procesados,
				},
				{
					clave: 'articulos_actualizados',
					// Mientras corre el numero no existe todavia: el chunk no lo acumula.
					etiqueta: this.activo ? 'Artículos actualizados (al cerrar)' : 'Artículos actualizados',
					valor: this.articulos_actualizados,
				},
			]
			if (this.proveedores !== null) {
				metricas.push({ clave: 'proveedores', etiqueta: 'Proveedores', valor: this.proveedores })
			}
			return metricas
		},
	},
}
</script>
<style lang="sass">
.proceso-detalle__origen
	display: flex
	flex-direction: column
	gap: 2px
	margin-bottom: 12px
	padding: 12px 14px
	border-radius: 12px
	border: 1px solid var(--color-border-secondary, #e9ecef)
	text-align: left

.proceso-detalle__origen-etiqueta
	font-size: 11px
	font-weight: 600
	letter-spacing: .05em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)

.proceso-detalle__origen-texto
	font-size: 14px
	font-weight: 600
	color: var(--color-text-primary, #212529)

.proceso-detalle__origen-detalle
	font-size: 13px
	color: var(--color-text-secondary, #6c757d)
</style>
