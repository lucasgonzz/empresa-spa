<template>
<div
class="proceso-detalle proceso-detalle--masiva"
data-testid="proceso-detalle-actualizacion-masiva"
:data-status="proceso.status">

	<encabezado
	:proceso="proceso"
	:etapa="etapa_texto"></encabezado>

	<metricas :metricas="metricas"></metricas>

	<datos :datos="datos"></datos>

</div>
</template>
<script>
/**
 * Detalle de una actualizacion masiva (o de su reversion): registros procesados de un total,
 * cuantos quedaron afectados, cuantos cambios se aplicaron y sobre que modelo.
 *
 * Los numeros salen de `referencia.masive_update` si vino, y si no de `proceso.resultado`.
 */
export default {
	components: {
		Encabezado: () => import('@/components/common/procesos-en-segundo-plano/detalle/Encabezado'),
		Metricas: () => import('@/components/common/procesos-en-segundo-plano/detalle/Metricas'),
		Datos: () => import('@/components/common/procesos-en-segundo-plano/detalle/Datos'),
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
		masiva() {
			return this.referencia && this.referencia.masive_update ? this.referencia.masive_update : null
		},
		resultado() {
			return this.proceso.resultado && typeof this.proceso.resultado === 'object' ? this.proceso.resultado : {}
		},
		activo() {
			return this.proceso.status === 'pendiente' || this.proceso.status === 'en_proceso'
		},
		/** "1.240 de 3.000 registros" mientras corre. */
		etapa_texto() {
			if (this.proceso.etapa) {
				return this.proceso.etapa
			}
			if (!this.proceso.total) {
				return this.activo ? 'Preparando los registros' : ''
			}
			return this.numero_es(this.proceso.procesados || 0) + ' de ' + this.numero_es(this.proceso.total) + ' ' + (this.proceso.unidad || 'registros')
		},
		afectados() {
			return this.leer('affected_count', 'afectados')
		},
		cambios() {
			return this.leer('changes_count', 'cambios')
		},
		metricas() {
			return [
				{ clave: 'afectados', etiqueta: 'Registros afectados', valor: this.afectados },
				{ clave: 'cambios', etiqueta: 'Cambios aplicados', valor: this.cambios },
			]
		},
		/** Nombre legible del modelo (los plurales viven en src/models/<modelo>.js). */
		modelo() {
			let model_name = this.masiva && this.masiva.model_name ? this.masiva.model_name : null
			if (!model_name) {
				return null
			}
			try {
				return this.plural(model_name)
			} catch (e) {
				// Un modelo sin archivo en src/models: se muestra la clave tal cual.
				return model_name
			}
		},
		datos() {
			let datos = []
			if (this.modelo) {
				datos.push({ clave: 'modelo', etiqueta: 'Sobre', valor: this.modelo })
			}
			if (this.masiva && this.masiva.from_filter) {
				datos.push({ clave: 'from_filter', etiqueta: 'Alcance', valor: 'Los artículos filtrados' })
			}
			return datos
		},
	},
	methods: {
		/**
		 * Lee un numero primero del MasiveUpdate (si vino) y si no del resultado del proceso.
		 *
		 * @param {String} clave_masiva
		 * @param {String} clave_resultado
		 * @returns {Number|null}
		 */
		leer(clave_masiva, clave_resultado) {
			let valor = null

			if (this.masiva && this.masiva[clave_masiva] !== null && typeof this.masiva[clave_masiva] !== 'undefined') {
				valor = this.masiva[clave_masiva]
			} else if (this.resultado[clave_resultado] !== null && typeof this.resultado[clave_resultado] !== 'undefined') {
				valor = this.resultado[clave_resultado]
			}

			if (valor === null) {
				return null
			}
			let numero = Number(valor)
			return isNaN(numero) ? null : numero
		},
	},
}
</script>
