<template>
<div
class="img-det-diag"
:data-testid="'imagenes-panel-diagnostico-' + item_id">

	<p
	v-if="!criterios.length"
	class="img-det-diag__texto">
		No quedó registrado qué se probó con este artículo.
	</p>

	<div
	v-for="(criterio, indice) in criterios"
	:key="'criterio-' + indice"
	class="img-det-diag__criterio"
	:class="{ 'img-det-diag__criterio--sin-usar': !criterio.usado }"
	:data-criterio="criterio.criterio"
	:data-usado="criterio.usado ? 1 : 0">

		<div class="img-det-diag__cabecera">
			<span class="img-det-diag__nombre">
				{{ nombre_del_criterio(criterio) }}
			</span>
			<span
			v-if="criterio.consulta"
			class="img-det-diag__consulta">
				{{ criterio.consulta }}
			</span>
		</div>

		<!--
			Un criterio que no se uso tambien se muestra, con el motivo: es la unica forma de ver
			por que no se busco por codigo (por ejemplo, porque era el numero interno del
			articulo y no un codigo de barras real).
		-->
		<p
		v-if="!criterio.usado"
		class="img-det-diag__texto">
			No se buscó. {{ criterio.motivo_no_usado || '' }}
		</p>

		<template v-else>
			<p class="img-det-diag__numeros">
				{{ busquedas(criterio) }} · {{ resultados(criterio) }}
			</p>
			<p
			v-if="criterio.error"
			class="img-det-diag__error">
				{{ criterio.error }}
			</p>
			<p
			v-if="criterio.resumen"
			class="img-det-diag__texto">
				{{ criterio.resumen }}
			</p>

			<!--
				Cada candidata con lo que paso con ella. Tocarla abre la pagina donde aparecio (o
				la imagen, si no vino la pagina), en otra pestaña: asi se puede juzgar el contexto.
			-->
			<div
			v-if="candidatas_de(criterio).length"
			class="img-det-diag__candidatas">
				<a
				v-for="(candidata, posicion) in candidatas_de(criterio)"
				:key="'candidata-' + indice + '-' + posicion"
				class="img-det-cand"
				:href="candidata.pagina || candidata.url"
				:title="candidata.motivo || texto_resultado(candidata)"
				:data-resultado="candidata.resultado"
				target="_blank"
				rel="noopener noreferrer">
					<miniatura
					tamano="mini"
					externa
					:url="candidata.miniatura || candidata.url"
					:alt="candidata.dominio || ''"></miniatura>
					<span
					class="img-det-etiqueta"
					:class="'img-det-etiqueta--' + tono(candidata)">
						{{ texto_resultado(candidata) }}
					</span>
					<!-- El motivo puntual (el de la IA, por ejemplo) va escrito: en telefono no hay title. -->
					<span
					v-if="candidata.motivo"
					class="img-det-cand__motivo">
						{{ candidata.motivo }}
					</span>
					<span
					v-if="candidata.ancho && candidata.alto"
					class="img-det-cand__dato">
						{{ candidata.ancho }} × {{ candidata.alto }} px
					</span>
					<span
					v-if="candidata.dominio"
					class="img-det-cand__dato img-det-cand__dominio">
						{{ candidata.dominio }}
					</span>
				</a>
			</div>
		</template>

	</div>
</div>
</template>
<script>
import Miniatura from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/Miniatura'
import {
	CRITERIOS,
	RESULTADOS_DE_CANDIDATA,
	TONOS_DE_CANDIDATA,
	texto_de,
	entero_es,
	busquedas_del_articulo,
} from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'

/**
 * Qué se probó con un artículo que quedó sin imagen: un bloque por criterio (código de barras y
 * después nombre), con la consulta, cuántas búsquedas gastó, cuántos resultados trajo, el
 * resumen y las miniaturas de las candidatas con el motivo de cada una.
 *
 * Es el reemplazo del acordeón del modal de resumen viejo (`BatchImagesSummaryContent`), ahora
 * con los datos del item de la asignación (`diagnostico`, contrato §5.2) en vez de la tabla de
 * intentos.
 */
export default {
	components: {
		Miniatura,
	},
	props: {
		/** `diagnostico` del ItemPayload: un objeto por criterio. */
		diagnostico: {
			type: Array,
			default() {
				return []
			},
		},
		/** Id del item (solo para el data-testid). */
		item_id: {
			type: Number,
			default: null,
		},
	},
	computed: {
		criterios() {
			return Array.isArray(this.diagnostico) ? this.diagnostico : []
		},
	},
	methods: {
		/**
		 * "Por código de barras" / "Por nombre".
		 *
		 * @param {Object} criterio
		 * @returns {String}
		 */
		nombre_del_criterio(criterio) {
			let texto = texto_de(CRITERIOS, criterio.criterio)
			return texto ? 'Por ' + texto.charAt(0).toLowerCase() + texto.slice(1) : 'Búsqueda'
		},
		busquedas(criterio) {
			return busquedas_del_articulo(criterio.busquedas)
		},
		/**
		 * "10 resultados" / "1 resultado" / "Sin resultados".
		 *
		 * @param {Object} criterio
		 * @returns {String}
		 */
		resultados(criterio) {
			let cantidad = Number(criterio.resultados) || 0
			if (!cantidad) {
				return 'Sin resultados'
			}
			return entero_es(cantidad) + (cantidad === 1 ? ' resultado' : ' resultados')
		},
		candidatas_de(criterio) {
			return Array.isArray(criterio.candidatas) ? criterio.candidatas : []
		},
		texto_resultado(candidata) {
			return texto_de(RESULTADOS_DE_CANDIDATA, candidata.resultado)
		},
		tono(candidata) {
			return TONOS_DE_CANDIDATA[candidata.resultado] || 'neutro'
		},
	},
}
</script>
<style lang="sass">
// Sin scope: vive adentro del b-modal del detalle. Prefijo img-det-diag / img-det-cand.
.img-det-diag
	display: flex
	flex-direction: column
	gap: 12px
	margin-top: 10px
	padding: 12px 14px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)

.img-det-diag__criterio
	display: flex
	flex-direction: column
	gap: 6px

	& + &
		padding-top: 12px
		border-top: 1px solid var(--color-border-secondary, #e9ecef)

// Un criterio que no se uso queda un tono mas apagado: se lee, pero no compite con el que si.
.img-det-diag__criterio--sin-usar
	.img-det-diag__nombre
		color: var(--color-text-secondary, #6c757d)

.img-det-diag__cabecera
	display: flex
	flex-wrap: wrap
	align-items: baseline
	gap: 4px 10px

.img-det-diag__nombre
	font-size: 0.85rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.img-det-diag__consulta
	font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
	overflow-wrap: anywhere

.img-det-diag__numeros
	margin: 0
	font-size: 0.8rem
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.img-det-diag__texto
	margin: 0
	font-size: 0.82rem
	line-height: 1.4
	color: var(--color-text-primary, #212529)

.img-det-diag__error
	margin: 0
	font-size: 0.8rem
	line-height: 1.4
	color: var(--btn-peligro-texto, #9c3a36)

.img-det-diag__candidatas
	display: grid
	grid-template-columns: repeat(auto-fill, minmax(96px, 1fr))
	gap: 12px 10px
	margin-top: 4px

.img-det-cand
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 4px
	min-width: 0
	text-decoration: none
	color: inherit

	&:hover
		text-decoration: none

		.img-det-mini
			border-color: var(--color-primary, #007bff)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 2px
		border-radius: 8px

.img-det-cand__dato
	max-width: 100%
	font-size: 0.7rem
	line-height: 1.25
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.img-det-cand__dominio
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap

// Hasta tres renglones: el motivo completo queda en el title de la tarjeta.
.img-det-cand__motivo
	display: -webkit-box
	-webkit-line-clamp: 3
	-webkit-box-orient: vertical
	overflow: hidden
	max-width: 100%
	font-size: 0.72rem
	line-height: 1.3
	color: var(--color-text-primary, #212529)
</style>
