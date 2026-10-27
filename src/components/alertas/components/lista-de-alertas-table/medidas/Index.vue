<template>
<div
class="alertas-medidas"
data-testid="alertas-medidas">

	<!--
		Una API que todavía no tiene la búsqueda de medidas (404 en la lista): estado neutro, sin ningún
		aviso de error, como Descripciones. Se resuelve solo cuando el sistema recibe la actualización.
	-->
	<empty-state
	v-if="no_disponible"
	data-testid="medidas-no-disponible"
	icon_class="bi bi-info-circle"
	:title="textos.no_disponible.titulo"
	:hint="textos.no_disponible.pista"></empty-state>

	<template v-else>

		<!--
			Una línea que dice qué es esta pestaña, y a la derecha el único botón: buscar el peso y las
			medidas de todo el catálogo, que es solo del acceso maestro (Lucas al entregar el sistema).
		-->
		<div class="alertas-medidas__barra m-b-15">
			<p
			class="alertas-medidas__intro"
			data-testid="medidas-intro">
				{{ textos.intro }}
			</p>
			<b-button
			v-if="es_acceso_maestro"
			class="btn-modulo alertas-medidas__catalogo"
			variant="primary"
			data-testid="medidas-catalogo-abrir"
			@click="abrir_modal_catalogo">
				<i class="bi bi-rulers m-r-5"></i>
				{{ textos.boton_catalogo }}
			</b-button>
		</div>

		<tabla-corridas
		@abrir="abrir_detalle"></tabla-corridas>

		<modal-catalogo
		v-if="es_acceso_maestro"
		@lanzada="al_lanzar_catalogo"
		@ver_corrida="abrir_detalle"></modal-catalogo>

		<detalle-corrida
		:corrida_id="corrida_abierta_id"
		:solapa_pedida="solapa_pedida"
		:es_acceso_maestro="es_acceso_maestro"
		@cerrado="al_cerrar_detalle"></detalle-corrida>

	</template>

</div>
</template>
<script>
import EmptyState from '@/common-vue/components/display/EmptyState'
import { VALORES_DE_SOLAPA } from '@/utils/medidas_de_catalogo'
import { TEXTOS } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * Sub-solapa «Medidas» de Alertas → Catálogo (misión medidas-masivas-catalogo, 27/10/2026): la tabla
 * de búsquedas masivas de peso y medidas del comercio, el detalle de cada una y —para el acceso
 * maestro— el lanzamiento de «todo el catálogo».
 *
 * Este componente orquesta; no dibuja datos. Es el espejo de imagenes/Index.vue y se encarga de las
 * mismas tres cosas, que no son de ninguno de sus hijos:
 *
 *  1. Pedir la tabla al entrar y refrescarla sola cada 15 s MIENTRAS alguna búsqueda de la página
 *     visible siga corriendo (una de catálogo tarda horas y la fila tiene que ir avanzando).
 *  2. El link directo: `/alertas/catalogo/medidas?corrida=<id>` abre ese detalle. `&solapa=
 *     asignadas|a_revisar|sin_datos` elige con qué solapa abre (ver `destino_de_medidas` en
 *     components/alertas/solapas.js).
 *  3. Al cerrar el detalle, sacar esos parámetros de la URL: si quedaran, volver a pedir el mismo link
 *     no cambiaría la ruta y el detalle no se volvería a abrir. Y al revés: si el detalle se abrió por
 *     URL y el parámetro desaparece (el botón Atrás del navegador), el detalle se cierra.
 *
 * Además, cuando el número rojo dice que hay una búsqueda nueva o una que terminó (cambian `en_proceso`
 * o `sin_ver` del resumen), la tabla se vuelve a pedir en silencio.
 *
 * Contra una API sin estas rutas (404), toda la sección es el estado neutro «todavía no disponible»:
 * ni un toast, ni un botón de reintentar.
 */

/** Cada cuánto se refresca la tabla mientras hay una búsqueda corriendo en la página visible. */
const REFRESCO_MS = 15000

/**
 * Espera antes del refresco por cambios del resumen: el resumen puede cambiar dos veces seguidas y
 * con esto se pide la tabla una sola vez.
 */
const ESPERA_REFRESCO_POR_RESUMEN_MS = 400

export default {
	components: {
		EmptyState,
		TablaCorridas: () => import('@/components/alertas/components/lista-de-alertas-table/medidas/TablaCorridas'),
		ModalCatalogo: () => import('@/components/alertas/components/lista-de-alertas-table/medidas/ModalCatalogo'),
		DetalleCorrida: () => import('@/components/alertas/components/lista-de-alertas-table/medidas/detalle/Index'),
	},
	data() {
		return {
			/** Textos de la sección. */
			textos: TEXTOS,
			/** Id de la corrida abierta en el detalle (null = cerrado). */
			corrida_abierta_id: null,
			/** Solapa con la que se pidió abrir el detalle por URL (null = la decide el detalle). */
			solapa_pedida: null,
			/** Timer del refresco periódico de la tabla. */
			timer_refresco: null,
			/**
			 * true si el detalle abierto se abrió por URL (`?corrida=`). Solo en ese caso que desaparezca
			 * el parámetro (el botón Atrás) cierra el detalle: uno abierto con un clic en la fila nunca
			 * tuvo el parámetro.
			 */
			abierta_por_url: false,
			/** Timer del refresco silencioso cuando cambia el resumen del número rojo. */
			timer_refresco_por_resumen: null,
		}
	},
	computed: {
		/**
		 * True si la sesión entró con la clave maestra (lo manda la API en el usuario). Contra una API
		 * que todavía no lo manda da false: el botón no aparece y nada más cambia.
		 *
		 * @returns {Boolean}
		 */
		es_acceso_maestro() {
			let usuario = this.$store.state.auth.user
			return !!(usuario && usuario.es_acceso_maestro)
		},
		/** True si la API contestó 404 al listado: todavía no tiene la búsqueda de medidas. */
		no_disponible() {
			return this.$store.state.dimension_search.no_disponible
		},
		/**
		 * Lo que el link directo pide, id y solapa juntos (`12|a_revisar`). Mirar los dos hace que
		 * `?corrida=12&solapa=sin_datos` sobre la misma corrida ya abierta cambie de solapa, y no solo
		 * un id nuevo.
		 *
		 * @returns {String}
		 */
		link_directo() {
			let query = this.$route.query
			return String(query.corrida || '') + '|' + String(query.solapa || '')
		},
		/**
		 * Lo del resumen que avisa que la tabla puede estar vieja: una búsqueda que arrancó o terminó
		 * (`en_proceso`) y una terminada que nadie abrió (`sin_ver`).
		 *
		 * @returns {String}
		 */
		firma_del_resumen() {
			let resumen = this.$store.state.dimension_search.resumen
			return resumen.en_proceso + '|' + resumen.sin_ver
		},
	},
	watch: {
		/**
		 * Un link directo nuevo mientras la sección ya estaba abierta (el botón Atrás, un aviso): abre,
		 * cambia de solapa o cierra el detalle sin recargar nada más.
		 */
		link_directo() {
			this.leer_link_directo()
		},
		/** El número rojo avisa que hay algo nuevo: la tabla se vuelve a pedir en silencio. */
		firma_del_resumen() {
			clearTimeout(this.timer_refresco_por_resumen)
			this.timer_refresco_por_resumen = setTimeout(() => {
				this.timer_refresco_por_resumen = null
				this.$store.dispatch('dimension_search/get_corridas', { silencioso: true })
			}, ESPERA_REFRESCO_POR_RESUMEN_MS)
		},
	},
	created() {
		// Siempre desde la primera página: las búsquedas van de la más nueva a la más vieja, y quien
		// entra a la pestaña casi siempre viene a ver la última, no la página en la que había quedado.
		this.$store.commit('dimension_search/set_page', 1)
		this.$store.dispatch('dimension_search/get_corridas')
		this.leer_link_directo()
	},
	mounted() {
		this.timer_refresco = setInterval(this.refrescar_si_hay_activas, REFRESCO_MS)
	},
	beforeDestroy() {
		clearInterval(this.timer_refresco)
		this.timer_refresco = null
		clearTimeout(this.timer_refresco_por_resumen)
		this.timer_refresco_por_resumen = null
	},
	methods: {
		/**
		 * Lee `?corrida=<id>&solapa=<solapa>` y, si hay un id válido, abre ese detalle (o, si ya estaba
		 * abierto, le cambia la solapa). Si el parámetro ya no está y el detalle se había abierto por
		 * URL, lo cierra: es lo que pasa con el botón Atrás del navegador.
		 */
		leer_link_directo() {
			let id = Number(this.$route.query.corrida)
			if (!id) {
				if (this.abierta_por_url && this.corrida_abierta_id) {
					this.abierta_por_url = false
					this.corrida_abierta_id = null
					this.solapa_pedida = null
				}
				return
			}
			let solapa = this.$route.query.solapa
			this.solapa_pedida = VALORES_DE_SOLAPA.indexOf(solapa) !== -1 ? solapa : null
			this.corrida_abierta_id = id
			this.abierta_por_url = true
		},
		/**
		 * Abre el detalle de una corrida (clic en la fila, «Ver», o «Ver la búsqueda en curso» del
		 * modal de catálogo).
		 *
		 * @param {Object} corrida RunPayload normalizado.
		 */
		abrir_detalle(corrida) {
			if (!corrida || !corrida.id) {
				return
			}
			this.solapa_pedida = null
			this.corrida_abierta_id = corrida.id
			this.abierta_por_url = false
		},
		/**
		 * El detalle se cerró: se suelta el id y se limpia la URL (ver el punto 3 del comentario del
		 * componente). `replace` y no `push`: cerrar un modal no es una página nueva en el historial.
		 */
		al_cerrar_detalle() {
			this.corrida_abierta_id = null
			this.solapa_pedida = null
			this.abierta_por_url = false

			if (typeof this.$route.query.corrida === 'undefined' && typeof this.$route.query.solapa === 'undefined') {
				return
			}
			let query = {}
			Object.keys(this.$route.query).forEach(clave => {
				if (clave !== 'corrida' && clave !== 'solapa') {
					query[clave] = this.$route.query[clave]
				}
			})
			this.$router.replace({ query: query })
			.catch(() => {
				// NavigationDuplicated u otra navegación en el medio: la URL ya no importa.
			})
		},
		abrir_modal_catalogo() {
			this.$bvModal.show('medidas-catalogo')
		},
		/**
		 * Se lanzó una búsqueda de todo el catálogo: la tabla vuelve a la primera página, que es donde
		 * aparece la nueva (las más nuevas van primero).
		 */
		al_lanzar_catalogo() {
			this.$store.commit('dimension_search/set_page', 1)
			this.$store.dispatch('dimension_search/get_corridas')
			this.$store.dispatch('dimension_search/get_resumen')
		},
		/**
		 * Refresco periódico: solo si la pestaña del navegador está a la vista, el detalle está cerrado
		 * y alguna búsqueda de la página sigue corriendo. Sin búsquedas activas no hay nada que pueda
		 * cambiar solo y no tiene sentido pegarle a la API cada 15 segundos.
		 */
		refrescar_si_hay_activas() {
			if (typeof document !== 'undefined' && document.hidden) {
				return
			}
			// Con el detalle abierto, el que refresca es el detalle (y de paso actualiza la fila de su
			// corrida en la tabla): no hace falta pedir las dos cosas cada 15 segundos.
			if (this.corrida_abierta_id) {
				return
			}
			if (!this.$store.getters['dimension_search/hay_activas']) {
				return
			}
			this.$store.dispatch('dimension_search/get_corridas', { silencioso: true })
		},
	},
}
</script>
<style lang="sass">
.alertas-medidas__barra
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
	gap: 10px 16px

.alertas-medidas__intro
	flex: 1 1 320px
	min-width: 0
	margin: 0
	text-align: left
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

.alertas-medidas__catalogo
	flex-shrink: 0
	margin-left: auto

// Teléfono: el botón ocupa el ancho entero debajo del texto, que es donde el dedo lo encuentra.
@media (max-width: 575px)
	.alertas-medidas__catalogo
		width: 100%
		margin-left: 0
		// El alto de siempre de un botón de módulo es chico para el pulgar, y la etiqueta es larga.
		height: auto
		min-height: 40px
		white-space: normal
</style>
