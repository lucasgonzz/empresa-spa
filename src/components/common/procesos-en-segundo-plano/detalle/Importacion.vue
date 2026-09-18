<template>
<div
class="proceso-detalle proceso-detalle--importacion"
:class="{ 'proceso-detalle--compacto': compacto }"
data-testid="proceso-detalle-importacion"
:data-status="proceso.status">

	<!-- Version chica (tarjeta flotante): titulo propio, anillo mediano, etapa y proveedor. -->
	<template v-if="compacto">
		<div class="proceso-detalle__cabecera-compacta">
			<anillo
			:tamano="56"
			:grosor="5"
			:porcentaje="porcentaje"
			:status="proceso.status"></anillo>
			<div class="proceso-detalle__cabecera-texto">
				<strong
				class="proceso-detalle__titulo-compacto"
				data-testid="import-status-titulo">
					{{ titulo_compacto }}
				</strong>
				<span
				v-if="etapa_texto"
				class="proceso-detalle__etapa-compacta"
				data-testid="import-status-etapa">
					{{ etapa_texto }}
				</span>
				<span
				v-if="proveedor"
				class="proceso-detalle__proveedor-compacto">
					{{ proveedor }}
				</span>
			</div>
		</div>

		<metricas
		class="proceso-detalle__metricas-compactas"
		:metricas="metricas_compactas"
		compacto></metricas>

		<p
		v-if="fallo && proceso.error_message"
		class="proceso-detalle__error-compacto">
			{{ proceso.error_message }}
		</p>
	</template>

	<!-- Version completa (detalle del modal). -->
	<template v-else>
		<encabezado
		:proceso="proceso"
		:etapa="etapa_texto"></encabezado>

		<metricas :metricas="metricas"></metricas>

		<datos :datos="datos"></datos>

		<div
		v-if="fallo"
		class="proceso-detalle__acciones">
			<button
			type="button"
			class="proceso-detalle__accion"
			data-testid="proceso-ver-historial"
			@click="$emit('ver_historial', proceso)">
				<i class="bi bi-clock-history"></i>
				Ver historial
			</button>
		</div>
	</template>

</div>
</template>
<script>
/**
 * Detalle de una importacion de articulos (desde Excel o desde una compra).
 *
 * Es el MISMO componente para el modal de procesos (version completa) y para la tarjeta flotante
 * de importacion (`compacto`): asi los numeros --filas, creados, actualizados, coincidencias--
 * tienen una sola lectura. Los toma de `referencia.import_status` si vino (es el registro propio
 * del flujo, el mas fresco) y si no de `proceso.resultado` (lo que viaja en cada evento).
 *
 * Props:
 *  - proceso     (obligatorio) el proceso del contrato, o uno armado a partir de un ImportStatus
 *                (ver import-status/Index.vue).
 *  - referencia  (opcional) { import_status, import_history } tal como lo devuelve
 *                GET background-processes/{id}.
 *  - compacto    version chica para la tarjeta flotante.
 */
export default {
	components: {
		Anillo: () => import('@/components/common/procesos-en-segundo-plano/Anillo'),
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
		compacto: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		import_status() {
			return this.referencia && this.referencia.import_status ? this.referencia.import_status : null
		},
		import_history() {
			return this.referencia && this.referencia.import_history ? this.referencia.import_history : null
		},
		resultado() {
			return this.proceso.resultado && typeof this.proceso.resultado === 'object' ? this.proceso.resultado : {}
		},
		activo() {
			return this.proceso.status === 'pendiente' || this.proceso.status === 'en_proceso'
		},
		fallo() {
			return this.proceso.status === 'fallo'
		},
		porcentaje() {
			if (this.proceso.porcentaje === null || typeof this.proceso.porcentaje === 'undefined') {
				return null
			}
			return Number(this.proceso.porcentaje)
		},
		/** "Lote 3 de 12" (o "40 de 300 filas"): la etapa del contrato, o armada de total/procesados. */
		etapa_texto() {
			if (this.proceso.etapa) {
				return this.proceso.etapa
			}
			if (!this.proceso.total) {
				return this.activo ? 'Preparando la importación' : ''
			}
			let unidad = this.proceso.unidad || 'lotes'
			if (unidad === 'lotes') {
				return 'Lote ' + this.numero_es(this.proceso.procesados || 0) + ' de ' + this.numero_es(this.proceso.total)
			}
			return this.numero_es(this.proceso.procesados || 0) + ' de ' + this.numero_es(this.proceso.total) + ' ' + unidad
		},
		/** Titulo de la version compacta, por estado. */
		titulo_compacto() {
			if (this.proceso.status === 'completado') {
				return 'Importación terminada'
			}
			if (this.proceso.status === 'fallo') {
				return 'La importación falló'
			}
			if (this.proceso.status === 'pendiente') {
				return 'Preparando la importación'
			}
			return 'Importando artículos'
		},
		filas_procesadas() {
			return this.leer('filas_procesadas', 'filas_procesadas')
		},
		creados() {
			return this.leer('created_models', 'creados')
		},
		actualizados() {
			return this.leer('updated_models', 'actualizados')
		},
		coincidencias() {
			return this.leer('articles_match', 'coincidencias')
		},
		/** Las cuatro tarjetas del detalle. */
		metricas() {
			return [
				{ clave: 'filas_procesadas', etiqueta: 'Filas procesadas', valor: this.filas_procesadas },
				{ clave: 'creados', etiqueta: 'Creados', valor: this.creados },
				{ clave: 'actualizados', etiqueta: 'Actualizados', valor: this.actualizados },
				{ clave: 'coincidencias', etiqueta: 'Coincidencias', valor: this.coincidencias },
			]
		},
		/** Los tres chips de la tarjeta flotante (las filas van en la etapa). */
		metricas_compactas() {
			return [
				{ clave: 'creados', etiqueta: 'creados', valor: this.creados },
				{ clave: 'actualizados', etiqueta: 'actualizados', valor: this.actualizados },
				{ clave: 'coincidencias', etiqueta: 'coincidencias', valor: this.coincidencias },
			]
		},
		proveedor() {
			if (this.import_status && this.import_status.provider && this.import_status.provider.name) {
				return this.import_status.provider.name
			}
			if (this.resultado.proveedor) {
				return String(this.resultado.proveedor)
			}
			return null
		},
		/** Solo el nombre del archivo: la URL entera no le dice nada al usuario. */
		archivo() {
			let url = this.import_history && this.import_history.excel_url ? String(this.import_history.excel_url) : ''
			if (!url && this.resultado.archivo) {
				url = String(this.resultado.archivo)
			}
			if (!url) {
				return null
			}
			let sin_query = url.split('?')[0]
			let partes = sin_query.split('/')
			let nombre = partes[partes.length - 1]
			try {
				return decodeURIComponent(nombre)
			} catch (e) {
				return nombre
			}
		},
		datos() {
			let datos = []
			if (this.proveedor) {
				datos.push({ clave: 'proveedor', etiqueta: 'Proveedor', valor: this.proveedor })
			}
			if (this.archivo) {
				datos.push({ clave: 'archivo', etiqueta: 'Archivo', valor: this.archivo })
			}
			if (this.resultado.repetidos) {
				datos.push({ clave: 'repetidos', etiqueta: 'Repetidos', valor: this.numero_es(this.resultado.repetidos) })
			}
			return datos
		},
	},
	methods: {
		/**
		 * Lee un numero primero del ImportStatus (si vino) y si no del resultado del proceso.
		 *
		 * @param {String} clave_import_status
		 * @param {String} clave_resultado
		 * @returns {Number|null}
		 */
		leer(clave_import_status, clave_resultado) {
			let valor = null

			if (this.import_status && this.import_status[clave_import_status] !== null && typeof this.import_status[clave_import_status] !== 'undefined') {
				valor = this.import_status[clave_import_status]
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
<style lang="sass">
.proceso-detalle
	text-align: left

.proceso-detalle__acciones
	display: flex
	flex-direction: row
	justify-content: flex-end
	margin-top: 16px

.proceso-detalle__accion
	display: inline-flex
	align-items: center
	gap: 7px
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 10px
	padding: 7px 14px
	background: transparent
	font-size: 13px
	font-weight: 500
	color: var(--color-text-primary, #212529)
	box-shadow: none
	transition: background .15s ease

	&:hover
		background: var(--bg-hover, #f1f3f5)

// ── Version compacta (tarjeta flotante) ──────────────────────────────────────────────────────
.proceso-detalle__cabecera-compacta
	display: flex
	flex-direction: row
	align-items: center
	gap: 14px

.proceso-detalle__cabecera-texto
	display: flex
	flex-direction: column
	min-width: 0
	gap: 1px

.proceso-detalle__titulo-compacto
	font-size: 15px
	font-weight: 600
	letter-spacing: -0.01em
	line-height: 1.25
	color: var(--color-text-primary, #212529)

.proceso-detalle__etapa-compacta
	font-size: 13px
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.proceso-detalle__proveedor-compacto
	font-size: 12px
	color: var(--color-text-secondary, #6c757d)
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap

.proceso-detalle__metricas-compactas
	margin-top: 12px

.proceso-detalle__error-compacto
	margin: 10px 0 0
	font-size: 12.5px
	line-height: 1.4
	color: var(--btn-peligro-texto, #9c3a36)
	white-space: pre-wrap
	word-break: break-word
</style>
