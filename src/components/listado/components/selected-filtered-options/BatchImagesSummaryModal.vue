<template>
	<b-modal
	v-model="visible_proxy"
	size="md"
	centered
	:title="titulo"
	body-class="imagenes-resumen-modal__cuerpo">
		<!--
			🔴 El `data-tour` va en el CONTENIDO y no en el `b-modal`, y esto se midio contra
			bootstrap-vue: `BModal` tiene `inheritAttrs: false` y baja los atributos sueltos al div
			EXTERIOR del portal, que es `position: absolute` y mide 0x0 (adentro solo tiene cosas
			`fixed`). El motor del tour descarta cualquier elemento de menos de 2px de lado, asi que
			un `data-tour` en el `b-modal` no lo ve nunca.

			Desde la mision imagenes-catalogo-completo (27/9/2026) este modal es un resumen corto:
			el detalle por articulo (que se probo, que dio cada criterio, aprobar o rechazar) vive en
			Alertas -> Imagenes, que es a donde lleva "Revisar en Alertas".
		-->
		<div
		class="imagenes-resumen"
		data-tour="listado.modal_resumen_imagenes"
		data-testid="imagenes-modal-resumen"
		:data-asignacion="asignacion ? asignacion.id : null">

			<p class="imagenes-resumen__intro">
				{{ intro }}
			</p>

			<div class="imagenes-resumen__metricas">

				<div
				class="imagenes-resumen__metrica"
				data-testid="imagenes-resumen-asignadas"
				:data-valor="asignadas">
					<span class="imagenes-resumen__valor">{{ entero(asignadas) }}</span>
					<span class="imagenes-resumen__etiqueta">Con imagen</span>
				</div>

				<div
				class="imagenes-resumen__metrica"
				:class="{ 'imagenes-resumen__metrica--acento': a_revisar > 0 }"
				data-testid="imagenes-resumen-a-revisar"
				:data-valor="a_revisar">
					<span class="imagenes-resumen__valor">{{ entero(a_revisar) }}</span>
					<span class="imagenes-resumen__etiqueta">Para revisar</span>
				</div>

				<!--
					"Sin imagen" es un boton cuando hay alguno: lleva directo a esa solapa del
					detalle, donde se ve por que no se encontro cada uno. Hereda el ancla del tour
					que antes estaba en la lista desplegable del modal viejo (clip 1.7: "Y estos
					quedaron sin imagen..."), asi ese paso sigue teniendo donde pararse. Con cero no
					hay nada que ver y queda como dato quieto (el paso se saltea solo, igual que
					antes cuando la lista no existia).
				-->
				<button
				v-if="no_asignadas > 0"
				type="button"
				class="imagenes-resumen__metrica imagenes-resumen__metrica--boton"
				data-tour="listado.lista_articulos_sin_imagen"
				data-testid="imagenes-resumen-no-asignadas"
				title="Ver por qué no se encontró imagen"
				:data-valor="no_asignadas"
				@click="revisar_en_alertas('no_asignadas')">
					<span class="imagenes-resumen__valor">{{ entero(no_asignadas) }}</span>
					<span class="imagenes-resumen__etiqueta">
						Sin imagen
						<i
						class="bi bi-chevron-right"
						aria-hidden="true"></i>
					</span>
				</button>
				<div
				v-else
				class="imagenes-resumen__metrica"
				data-testid="imagenes-resumen-no-asignadas"
				:data-valor="0">
					<span class="imagenes-resumen__valor">0</span>
					<span class="imagenes-resumen__etiqueta">Sin imagen</span>
				</div>

				<!-- Las busquedas usadas: solo si la asignacion llego (el aviso de Pusher no las trae). -->
				<div
				v-if="hay_busquedas"
				class="imagenes-resumen__metrica"
				data-testid="imagenes-resumen-busquedas"
				:data-valor="asignacion.busquedas">
					<span class="imagenes-resumen__valor">{{ entero(asignacion.busquedas) }}</span>
					<span class="imagenes-resumen__etiqueta">
						{{ Number(asignacion.busquedas) === 1 ? 'Búsqueda' : 'Búsquedas' }}<template v-if="promedio"> · {{ promedio }} por artículo</template>
					</span>
				</div>

			</div>

			<p
			v-if="aviso"
			class="imagenes-resumen__aviso"
			data-testid="imagenes-resumen-aviso">
				{{ aviso }}
			</p>

			<p
			v-if="a_revisar > 0"
			class="imagenes-resumen__pista">
				Las imágenes para revisar todavía no se ven en la tienda: aprobalas o rechazalas desde Alertas.
			</p>

		</div>

		<template #modal-footer>
			<b-button
			class="btn-modulo"
			variant="outline-secondary"
			data-testid="imagenes-resumen-cerrar"
			@click="cerrar">
				Cerrar
			</b-button>
			<b-button
			class="btn-modulo"
			variant="primary"
			data-testid="imagenes-resumen-revisar"
			@click="revisar_en_alertas(null)">
				Revisar en Alertas
			</b-button>
		</template>
	</b-modal>
</template>
<script>
import { conteo, entero_es, promedio_es } from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'
import { destino_de_imagenes, es_ruta_de_imagenes } from '@/components/alertas/solapas'

/**
 * Resumen corto que aparece al terminar una asignación de imágenes que lanzó esta pestaña (lo abre
 * `components/common/AvisoImagenesAutomaticas.vue`): con imagen, para revisar, sin imagen y las
 * búsquedas usadas, más "Revisar en Alertas", que lleva al detalle completo de esa asignación.
 *
 * Recibe los números por dos caminos y prefiere el primero:
 *  - `asignacion`: el RunPayload que devolvió `image-assignment-runs/por-uuid/{uuid}`.
 *  - `batch_result`: el payload liviano de Pusher (`processed`, `skipped`, `needs_review`,
 *    `quota_reached`, `skipped_by_quota`, `batch_uuid`), por si ese pedido falló. Ahí no hay
 *    búsquedas ni id para el link directo, así que "Revisar en Alertas" lleva a la solapa.
 */
export default {
	props: {
		/**
		 * Controla visibilidad del modal (v-model).
		 */
		visible: {
			type: Boolean,
			default: false,
		},
		/**
		 * Payload recibido desde Pusher (el camino de respaldo).
		 */
		batch_result: {
			type: Object,
			default: null,
		},
		/**
		 * Asignación terminada (RunPayload, contrato §5.1), o null si no se pudo traer.
		 */
		asignacion: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Proxy para v-model del modal sin mutar la prop directamente.
		 */
		visible_proxy: {
			get() {
				return this.visible
			},
			set(value) {
				this.$emit('update:visible', value)
			},
		},
		/** Payload de Pusher o un objeto vacío. */
		pusher() {
			return this.batch_result && typeof this.batch_result === 'object' ? this.batch_result : {}
		},
		asignadas() {
			if (this.asignacion) {
				return conteo(this.asignacion.conteos, 'asignadas')
			}
			return Number(this.pusher.processed) || 0
		},
		a_revisar() {
			if (this.asignacion) {
				return conteo(this.asignacion.conteos, 'a_revisar')
			}
			return Number(this.pusher.needs_review) || 0
		},
		no_asignadas() {
			if (this.asignacion) {
				return conteo(this.asignacion.conteos, 'no_asignadas')
			}
			return Number(this.pusher.skipped) || 0
		},
		hay_busquedas() {
			return !!this.asignacion && this.asignacion.busquedas !== null && typeof this.asignacion.busquedas !== 'undefined'
		},
		promedio() {
			return this.asignacion ? promedio_es(this.asignacion.busquedas_por_articulo) : ''
		},
		/**
		 * Título según cómo terminó: terminada, detenida o cortada.
		 *
		 * @returns {String}
		 */
		titulo() {
			let status = this.asignacion ? this.asignacion.status : null
			if (status === 'detenida') {
				return 'Asignación de imágenes detenida'
			}
			if (status === 'fallida') {
				return 'La asignación de imágenes se cortó'
			}
			return 'Asignación de imágenes terminada'
		},
		/**
		 * "Se buscaron imágenes para 50 artículos." (o "para 45 de 50" si no se llegó a todos).
		 *
		 * @returns {String}
		 */
		intro() {
			if (this.asignacion) {
				let total = Number(this.asignacion.total_articulos) || 0
				let procesados = Number(this.asignacion.procesados) || 0
				let cuantos = procesados < total ? entero_es(procesados) + ' de ' + entero_es(total) : entero_es(total)
				let palabra = total === 1 ? ' artículo' : ' artículos'
				if (this.asignacion.status === 'detenida') {
					return 'La asignación se detuvo después de procesar ' + cuantos + palabra + '.'
				}
				if (this.asignacion.status === 'fallida') {
					return 'La asignación se cortó después de procesar ' + cuantos + palabra + '.'
				}
				return 'Se buscaron imágenes para ' + cuantos + palabra + '.'
			}
			let total = this.asignadas + this.a_revisar + this.no_asignadas
			return 'Se buscaron imágenes para ' + entero_es(total) + (total === 1 ? ' artículo.' : ' artículos.')
		},
		/**
		 * Lo que hay que saber de cómo terminó: el motivo de la asignación (por ejemplo, el tope
		 * diario de búsquedas) o, por el camino de respaldo, el aviso de cuota de Pusher.
		 *
		 * @returns {String}
		 */
		aviso() {
			if (this.asignacion) {
				return this.asignacion.motivo_estado || ''
			}
			if (this.pusher.quota_reached) {
				let sin_buscar = Number(this.pusher.skipped_by_quota) || 0
				return 'Se alcanzó el límite diario de búsquedas'
					+ (sin_buscar ? ': ' + entero_es(sin_buscar) + (sin_buscar === 1 ? ' artículo quedó sin buscar.' : ' artículos quedaron sin buscar.') : '.')
					+ ' Mañana podés volver a intentarlo.'
			}
			return ''
		},
	},
	methods: {
		entero(valor) {
			return entero_es(valor)
		},
		/**
		 * "Cerrar": avisa al anfitrión (que refresca el listado de artículos si está en esa
		 * pantalla, como hacía el "Entendido" de antes) y cierra.
		 *
		 * @return {void}
		 */
		cerrar() {
			this.$emit('confirmed')
			this.visible_proxy = false
		},
		/**
		 * Cierra y lleva a Alertas → Catálogo → Imágenes con esta asignación abierta. Con `solapa`,
		 * abre el detalle en esa solapa (el botón "Sin imagen" pide la de no asignadas). Sin
		 * asignación (camino de respaldo) no hay id: lleva a la solapa y listo.
		 *
		 * El destino y la pregunta "¿ya estoy ahí?" salen de components/alertas/solapas.js: desde la
		 * misión categorizacion-tres-modelos la solapa Imágenes es una sub-solapa de Catálogo
		 * (/alertas/catalogo/imagenes) y la ruta ya no dice `view === 'imagenes'`.
		 *
		 * @param {String|null} solapa no_asignadas | a_revisar | asignadas
		 * @return {void}
		 */
		revisar_en_alertas(solapa) {
			let query = {}
			if (this.asignacion && this.asignacion.id) {
				query.asignacion = String(this.asignacion.id)
				if (solapa) {
					query.solapa = solapa
				}
			}
			this.visible_proxy = false
			let destino = destino_de_imagenes(query)
			// Si ya se está en Alertas → Imágenes, `replace`: con `push` quedaban dos entradas
			// iguales en el historial (la de antes y la que deja el cierre del detalle), y el
			// botón Atrás parecía no hacer nada. Con la URL canónica, `params.view === 'imagenes'`
			// da falso siempre: por eso se pregunta con `es_ruta_de_imagenes`.
			let ya_esta_ahi = es_ruta_de_imagenes(this.$route)
			let navegacion = ya_esta_ahi ? this.$router.replace(destino) : this.$router.push(destino)
			navegacion.catch(() => {
				// Ya estaba en esa misma URL (NavigationDuplicated): no hay nada que hacer.
			})
		},
	},
}
</script>
<style lang="sass">
// Sin scope: el cuerpo del b-modal cuelga de <body>. Prefijo imagenes-resumen; colores por token.
.imagenes-resumen
	display: flex
	flex-direction: column
	gap: 14px
	text-align: left

.imagenes-resumen__intro
	margin: 0
	font-size: 0.9375rem
	line-height: 1.4
	color: var(--color-text-primary, #212529)

.imagenes-resumen__metricas
	display: grid
	grid-template-columns: repeat(2, minmax(0, 1fr))
	gap: 10px

.imagenes-resumen__metrica
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 2px
	padding: 12px 14px
	border: 0
	border-radius: 12px
	text-align: left
	background: var(--bg-section, #f8f9fa)
	box-shadow: none

// Para revisar con algo adentro: el ambar de "hay que mirarlo". Los tokens existen solo en
// html.dark-mode (barrido del 26/9/2026); en claro manda el literal del fallback.
.imagenes-resumen__metrica--acento
	background: var(--bg-warning-soft, rgba(255, 193, 7, .16))

	.imagenes-resumen__valor,
	.imagenes-resumen__etiqueta
		color: var(--color-text-warning-strong, #856404)

.imagenes-resumen__metrica--boton
	cursor: pointer
	transition: background .15s ease

	&:hover
		background: var(--bg-hover, #f1f3f5)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 2px

	.imagenes-resumen__etiqueta
		color: var(--color-primary, #007bff)

.imagenes-resumen__valor
	font-size: 1.6rem
	font-weight: 700
	line-height: 1.1
	letter-spacing: -0.02em
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums

.imagenes-resumen__etiqueta
	display: inline-flex
	align-items: center
	gap: 4px
	font-size: 0.8rem
	font-weight: 500
	color: var(--color-text-secondary, #6c757d)

	i
		font-size: 0.7rem

.imagenes-resumen__aviso
	margin: 0
	padding: 10px 14px
	border-radius: 12px
	font-size: 0.85rem
	line-height: 1.4
	background: var(--bg-warning-soft, rgba(255, 193, 7, .16))
	color: var(--color-text-warning-strong, #856404)

.imagenes-resumen__pista
	margin: 0
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)
</style>
