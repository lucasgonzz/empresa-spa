<template>
<section
class="img-det-enc"
data-testid="imagenes-detalle-encabezado"
:data-status="asignacion.status">

	<div class="img-det-enc__fila">
		<estado-asignacion :asignacion="asignacion"></estado-asignacion>

		<!--
			Detener y reanudar (plan §13): en las asignaciones de todo el catalogo son solo del
			acceso maestro (la API contesta 403 a cualquier otra sesion), asi que para el resto ni
			se dibujan. Las de seleccion y las del asistente las puede detener o reanudar
			cualquiera que las ve. Su ayuda se abre a la izquierda: quedan pegados al borde derecho
			del modal (ver FilaARevisar.vue).
		-->
		<div
		v-if="puede_operar && (puede_detener || puede_reanudar)"
		class="img-det-enc__acciones">
			<b-button
			v-if="puede_detener"
			class="btn-modulo"
			variant="outline-danger"
			data-testid="imagenes-detener"
			data-ayuda-placement="left"
			:disabled="operando"
			@click="$emit('detener')">
				<i class="bi bi-stop-circle m-r-5"></i>
				Detener
			</b-button>
			<b-button
			v-if="puede_reanudar"
			class="btn-modulo"
			variant="primary"
			data-testid="imagenes-reanudar"
			data-ayuda-placement="left"
			:disabled="operando"
			@click="$emit('reanudar')">
				<i class="bi bi-play-circle m-r-5"></i>
				Reanudar
			</b-button>
		</div>
	</div>

	<!--
		Por que termino, se detuvo o se corto (por ejemplo, el tope diario de busquedas). Sale de
		motivo_de_estado (textos.js): una de catalogo detenida, vista sin el acceso maestro, dice
		solo que esta detenida.
	-->
	<p
	v-if="motivo"
	class="img-det-enc__motivo"
	data-testid="imagenes-detalle-motivo">
		{{ motivo }}
	</p>
	<p
	v-else-if="asignacion.trabada"
	class="img-det-enc__motivo">
		No avanza hace más de 15 minutos. Suele destrabarse sola; si sigue así, avisanos.
	</p>

	<div class="img-det-enc__grilla">

		<!--
			Las busquedas, bien claras (pedido textual de Lucas): el total grande, y abajo el
			promedio por articulo y cuantas fueron por codigo de barras y cuantas por nombre. Las
			validaciones con IA van aparte y mas chicas: no son busquedas, pero tambien cuestan.
		-->
		<!--
			Las de la web o del catalogo en PDF del proveedor (mision importaciones-de-martin) no
			buscan ni usan la IA: en lugar de "0 busquedas" va de donde salieron las fotos y como se
			decidio cada una. La fuente sale de la API como texto plano (nunca v-html); la de un PDF
			(adjunto-<id>.pdf) es un nombre interno y no se muestra.
		-->
		<div
		v-if="es_de_un_proveedor"
		class="img-det-enc__busquedas img-det-enc__fuente"
		data-testid="imagenes-detalle-fuente"
		:data-origen="asignacion.origen"
		:data-fuente="fuente || null">
			<template v-if="es_de_proveedor_pdf">
				<span class="img-det-enc__busquedas-etiqueta">Fotos sacadas del</span>
				<span class="img-det-enc__fuente-sitio">catálogo en PDF que mandaste</span>
			</template>
			<template v-else>
				<span class="img-det-enc__busquedas-etiqueta">Fotos traídas de</span>
				<span class="img-det-enc__fuente-sitio">{{ fuente || 'la web del proveedor' }}</span>
			</template>
			<span class="img-det-enc__busquedas-detalle">
				Las que coincidieron por código de barras o de proveedor se asignaron solas; las dudosas quedan en «A revisar» para que las apruebes.
			</span>
			<span class="img-det-enc__busquedas-ia">
				Sin búsquedas en Google ni validaciones con IA
			</span>
		</div>

		<div
		v-else
		class="img-det-enc__busquedas"
		data-testid="imagenes-detalle-busquedas"
		:data-busquedas="asignacion.busquedas">
			<span class="img-det-enc__busquedas-total">{{ total_busquedas }}</span>
			<span class="img-det-enc__busquedas-etiqueta">
				{{ Number(asignacion.busquedas) === 1 ? 'búsqueda' : 'búsquedas' }}
			</span>
			<span
			v-if="detalle_busquedas"
			class="img-det-enc__busquedas-detalle">
				{{ detalle_busquedas }}
			</span>
			<span class="img-det-enc__busquedas-ia">
				{{ texto_validaciones }}
			</span>
		</div>

		<dl class="img-det-enc__datos">
			<div class="img-det-enc__dato">
				<dt>Origen</dt>
				<dd>{{ origen }}</dd>
			</div>
			<div class="img-det-enc__dato">
				<dt>Artículos</dt>
				<dd>{{ entero(asignacion.total_articulos) }}</dd>
			</div>
			<!--
				En las de la web del proveedor va el sitio (si la API lo mando: sin el, repetir "Web del
				proveedor" al lado del Origen no suma nada). En las del PDF no va nada: no se busco.
			-->
			<div
			v-if="!es_de_un_proveedor || (es_de_proveedor_web && fuente)"
			class="img-det-enc__dato">
				<dt>{{ es_de_un_proveedor ? 'Sitio' : 'Buscado en' }}</dt>
				<dd>{{ es_de_un_proveedor ? fuente : proveedor }}</dd>
			</div>
			<div
			v-if="asignacion.lanzada_por"
			class="img-det-enc__dato">
				<dt>La pidió</dt>
				<dd>{{ asignacion.lanzada_por }}</dd>
			</div>
			<!--
				Una que todavia no arranco (espera turno en la cola, o se freno antes del primer
				tramo) no tiene started_at: ahi va cuando se creo, dicho como tal. Mostrar la
				creacion con la etiqueta "Empezó" afirmaba algo que no paso.
			-->
			<div class="img-det-enc__dato">
				<dt>{{ asignacion.started_at ? 'Empezó' : 'Creada' }}</dt>
				<dd>{{ fecha_y_hora(asignacion.started_at || asignacion.created_at) }}</dd>
			</div>
			<div
			v-if="asignacion.finished_at"
			class="img-det-enc__dato">
				<dt>Terminó</dt>
				<dd>{{ fecha_y_hora(asignacion.finished_at) }}</dd>
			</div>
		</dl>

	</div>

</section>
</template>
<script>
import {
	ORIGENES,
	texto_de,
	esta_activa,
	es_de_catalogo,
	es_de_proveedor_web,
	es_de_proveedor_pdf,
	es_de_un_proveedor,
	fuente_de,
	motivo_de_estado,
	entero_es,
	promedio_es,
	texto_de_proveedor,
} from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'

/**
 * Encabezado del detalle de una búsqueda de imágenes: estado y avance, el motivo si terminó de
 * una forma que hay que explicar, las búsquedas (bien claras) y los datos de la corrida. Además,
 * Detener o Reanudar: en las de todo el catálogo solo con el acceso maestro; en las de selección y
 * del asistente, para cualquiera (plan §13).
 *
 * Solo dibuja y avisa (`detener`, `reanudar`): los pedidos los hace el detalle.
 */
export default {
	components: {
		EstadoAsignacion: () => import('@/components/alertas/components/lista-de-alertas-table/imagenes/EstadoAsignacion'),
	},
	props: {
		/** RunPayload (contrato §5.1). */
		asignacion: {
			type: Object,
			required: true,
		},
		/**
		 * true si la sesión entró con la clave maestra: la necesitan Detener / Reanudar de las
		 * búsquedas de todo el catálogo, y muestra qué proveedor se usó.
		 */
		es_acceso_maestro: {
			type: Boolean,
			default: false,
		},
		puede_gestionar_catalogo: {
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
		/**
		 * true si es una asignación de todo el catálogo (ver es_de_catalogo en textos.js).
		 *
		 * @returns {Boolean}
		 */
		es_de_catalogo() {
			return es_de_catalogo(this.asignacion)
		},
		/**
		 * El motivo del estado para mostrar (ver motivo_de_estado en textos.js): el de la API, salvo
		 * una de catálogo detenida vista sin el acceso maestro, que no tiene cómo reanudarla.
		 *
		 * @returns {String}
		 */
		motivo() {
			return motivo_de_estado(this.asignacion, this.es_acceso_maestro)
		},
		/**
		 * true si esta sesión puede detener o reanudar ESTA búsqueda (plan §13): las de todo el
		 * catálogo solo con el acceso maestro; las de selección y las del asistente, cualquiera
		 * que las ve.
		 *
		 * @returns {Boolean}
		 */
		puede_operar() {
			return !this.es_de_catalogo || this.es_acceso_maestro || this.puede_gestionar_catalogo
		},
		/** Se puede detener mientras corre o espera turno. */
		puede_detener() {
			return esta_activa(this.asignacion)
		},
		/** Se puede reanudar si se detuvo, si se cortó o si parece trabada (contrato §5.3). */
		puede_reanudar() {
			return this.asignacion.status === 'detenida'
				|| this.asignacion.status === 'fallida'
				|| !!this.asignacion.trabada
		},
		/** true si las fotos se trajeron de la web de un proveedor (ver es_de_proveedor_web en textos.js). */
		es_de_proveedor_web() {
			return es_de_proveedor_web(this.asignacion)
		},
		/** true si las fotos se sacaron del catálogo en PDF de un proveedor. */
		es_de_proveedor_pdf() {
			return es_de_proveedor_pdf(this.asignacion)
		},
		/** true para las dos: web o PDF del proveedor (sin búsquedas ni IA). */
		es_de_un_proveedor() {
			return es_de_un_proveedor(this.asignacion)
		},
		/** "ferreteria.com.ar", o '' si la API no mandó la fuente. */
		fuente() {
			return fuente_de(this.asignacion)
		},
		origen() {
			return texto_de(ORIGENES, this.asignacion.origen)
		},
		proveedor() {
			return texto_de_proveedor(this.asignacion.proveedor, this.es_acceso_maestro)
		},
		total_busquedas() {
			return entero_es(this.asignacion.busquedas)
		},
		/**
		 * "1,46 por artículo · 1.100 por código de barras · 730 por nombre". Cada parte aparece
		 * solo si hay dato: una búsqueda que todavía no procesó nada no tiene promedio.
		 *
		 * @returns {String}
		 */
		detalle_busquedas() {
			let partes = []
			let promedio = promedio_es(this.asignacion.busquedas_por_articulo)
			if (promedio) {
				partes.push(promedio + ' por artículo')
			}
			let por_criterio = this.asignacion.busquedas_por_criterio || {}
			if (typeof por_criterio.codigo_de_barras !== 'undefined' && por_criterio.codigo_de_barras !== null) {
				partes.push(entero_es(por_criterio.codigo_de_barras) + ' por código de barras')
			}
			if (typeof por_criterio.nombre !== 'undefined' && por_criterio.nombre !== null) {
				partes.push(entero_es(por_criterio.nombre) + ' por nombre')
			}
			return partes.join(' · ')
		},
		/**
		 * "1.400 validaciones con IA" (una sola: "1 validación con IA").
		 *
		 * @returns {String}
		 */
		texto_validaciones() {
			let cantidad = Number(this.asignacion.validaciones_ia) || 0
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
		 * "27/09/26 14:05".
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
// Sin scope: el detalle es un b-modal (cuelga de <body>). Prefijo img-det-enc; colores por token.
.img-det-enc
	display: flex
	flex-direction: column
	gap: 12px
	padding-bottom: 4px
	text-align: left

.img-det-enc__fila
	display: flex
	flex-direction: row
	align-items: flex-start
	justify-content: space-between
	flex-wrap: wrap
	gap: 10px 16px

	// El estado ocupa lo que haya: la barra de avance se estira hasta los botones.
	.img-asig-estado
		flex: 1 1 260px

.img-det-enc__acciones
	display: flex
	flex-wrap: wrap
	gap: 8px

.img-det-enc__motivo
	margin: 0
	padding: 10px 14px
	border-radius: 12px
	font-size: 0.85rem
	line-height: 1.4
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-primary, #212529)

.img-det-enc__grilla
	display: grid
	grid-template-columns: minmax(200px, 280px) minmax(0, 1fr)
	gap: 12px

.img-det-enc__busquedas
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 2px
	padding: 14px 16px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)

.img-det-enc__busquedas-total
	font-size: 2.2rem
	font-weight: 700
	line-height: 1.05
	letter-spacing: -0.02em
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums

.img-det-enc__busquedas-etiqueta
	font-size: 0.85rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.img-det-enc__busquedas-detalle
	margin-top: 6px
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

// El sitio del proveedor ocupa el lugar del numero grande: un dominio largo corta en cualquier
// punto en vez de romper el ancho de la caja.
.img-det-enc__fuente-sitio
	font-size: 1.35rem
	font-weight: 700
	line-height: 1.2
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.img-det-enc__busquedas-ia
	margin-top: 2px
	font-size: 0.75rem
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.img-det-enc__datos
	display: grid
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr))
	align-content: start
	gap: 12px 16px
	margin: 0
	padding: 14px 16px
	border-radius: 12px
	border: 1px solid var(--color-border-secondary, #e9ecef)

.img-det-enc__dato
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

// Tablet chica y telefono: las busquedas arriba y los datos abajo, a lo ancho.
@media (max-width: 767px)
	.img-det-enc__grilla
		grid-template-columns: minmax(0, 1fr)

	.img-det-enc__acciones
		width: 100%

		.btn
			flex: 1 1 0
</style>
