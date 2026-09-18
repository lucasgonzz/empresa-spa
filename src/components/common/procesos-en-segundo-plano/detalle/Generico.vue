<template>
<div
class="proceso-detalle proceso-detalle--generico"
data-testid="proceso-detalle-generico"
:data-status="proceso.status">

	<encabezado
	:proceso="proceso"
	:etapa="etapa_texto"></encabezado>

	<barra-progreso
	v-if="activo"
	class="proceso-detalle__barra"
	:porcentaje="porcentaje"
	:status="proceso.status"></barra-progreso>

	<p
	v-if="proceso.resultado_recortado"
	class="proceso-detalle__aviso">
		El resultado completo es muy largo para mostrarlo acá.
	</p>

	<metricas :metricas="metricas"></metricas>

	<datos :datos="datos"></datos>

	<p
	v-if="!metricas.length && !datos.length && !activo && !proceso.error_message"
	class="proceso-detalle__vacio">
		Este proceso no dejó números para mostrar.
	</p>

</div>
</template>
<script>
import { etiqueta_de_resultado } from '@/components/common/procesos-en-segundo-plano/tipos'

/**
 * Detalle para cualquier tipo que no tenga uno propio: la etapa, la barra y las claves de
 * `resultado` con etiquetas legibles (tipos.js). Los numeros van como metricas, los textos como
 * datos, y un `link` como boton de descarga. Lo que no esta en el mapa se muestra con la clave
 * humanizada, asi un tipo nuevo del backend se ve bien sin tocar la SPA.
 */
export default {
	components: {
		Encabezado: () => import('@/components/common/procesos-en-segundo-plano/detalle/Encabezado'),
		BarraProgreso: () => import('@/components/common/procesos-en-segundo-plano/BarraProgreso'),
		Metricas: () => import('@/components/common/procesos-en-segundo-plano/detalle/Metricas'),
		Datos: () => import('@/components/common/procesos-en-segundo-plano/detalle/Datos'),
	},
	props: {
		proceso: {
			type: Object,
			required: true,
		},
		/** Se acepta por uniformidad con los otros detalles; el generico no la interpreta. */
		referencia: {
			type: Object,
			default: null,
		},
	},
	computed: {
		resultado() {
			return this.proceso.resultado && typeof this.proceso.resultado === 'object' ? this.proceso.resultado : {}
		},
		activo() {
			return this.proceso.status === 'pendiente' || this.proceso.status === 'en_proceso'
		},
		porcentaje() {
			if (this.proceso.porcentaje === null || typeof this.proceso.porcentaje === 'undefined') {
				return null
			}
			return Number(this.proceso.porcentaje)
		},
		/** La etapa del contrato, o "X de Y unidad" si es medible con unidad. */
		etapa_texto() {
			if (this.proceso.etapa) {
				return this.proceso.etapa
			}
			if (this.proceso.total && this.proceso.unidad) {
				return this.numero_es(this.proceso.procesados || 0) + ' de ' + this.numero_es(this.proceso.total) + ' ' + this.proceso.unidad
			}
			return ''
		},
		/** Claves numericas del resultado -> tarjetas. */
		metricas() {
			let metricas = []
			Object.keys(this.resultado).forEach(clave => {
				let valor = this.resultado[clave]
				if (typeof valor !== 'number') {
					return
				}
				let etiqueta = etiqueta_de_resultado(clave)
				if (etiqueta.tipo !== 'texto') {
					return
				}
				metricas.push({ clave: clave, etiqueta: etiqueta.etiqueta, valor: valor })
			})
			return metricas
		},
		/** Claves de texto / booleanas / link del resultado -> pares etiqueta / valor. */
		datos() {
			let datos = []
			Object.keys(this.resultado).forEach(clave => {
				let valor = this.resultado[clave]
				if (valor === null || typeof valor === 'undefined' || typeof valor === 'number' || valor === '') {
					return
				}
				let etiqueta = etiqueta_de_resultado(clave)

				if (etiqueta.tipo === 'link') {
					datos.push({ clave: clave, etiqueta: 'Archivo generado', tipo: 'link', valor: String(valor), texto: etiqueta.etiqueta })
					return
				}
				if (typeof valor === 'boolean') {
					datos.push({ clave: clave, etiqueta: etiqueta.etiqueta, valor: valor ? 'Sí' : 'No' })
					return
				}
				datos.push({ clave: clave, etiqueta: etiqueta.etiqueta, valor: String(valor) })
			})
			return datos
		},
	},
}
</script>
<style lang="sass">
.proceso-detalle__barra
	margin: -6px 0 16px

.proceso-detalle__aviso, .proceso-detalle__vacio
	margin: 8px 0 12px
	font-size: 13px
	color: var(--color-text-secondary, #6c757d)
	text-align: left
</style>
