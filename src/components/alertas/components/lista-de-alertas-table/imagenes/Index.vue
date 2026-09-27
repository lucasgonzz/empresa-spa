<template>
<div
class="alertas-imagenes"
data-testid="alertas-imagenes">

	<!--
		Una linea que dice que es esta pestaña, y a la derecha el unico boton: buscar para todo el
		catalogo, que es solo del acceso maestro (Lucas al entregar el sistema). El dueño sigue
		pidiendo imagenes desde el listado, con su tope diario.
	-->
	<div class="alertas-imagenes__barra m-b-15">
		<p class="alertas-imagenes__intro">
			Cada búsqueda automática de imágenes queda acá. Abrí una para ver qué se asignó, qué quedó para revisar y por qué no se encontró el resto.
		</p>
		<b-button
		v-if="es_acceso_maestro"
		class="btn-modulo alertas-imagenes__catalogo"
		variant="primary"
		data-testid="imagenes-catalogo-abrir"
		@click="abrir_modal_catalogo">
			<i class="bi bi-images m-r-5"></i>
			Buscar imágenes para todo el catálogo
		</b-button>
	</div>

	<tabla-asignaciones
	@abrir="abrir_detalle"></tabla-asignaciones>

	<modal-catalogo
	v-if="es_acceso_maestro"
	@lanzada="al_lanzar_catalogo"
	@ver_asignacion="abrir_detalle"></modal-catalogo>

	<detalle-asignacion
	:asignacion_id="asignacion_abierta_id"
	:solapa_pedida="solapa_pedida"
	:es_acceso_maestro="es_acceso_maestro"
	@cerrado="al_cerrar_detalle"></detalle-asignacion>

</div>
</template>
<script>
/**
 * Pestaña "Imágenes" de Alertas (misión imagenes-catalogo-completo, 27/9/2026): la tabla de
 * búsquedas de imágenes del comercio, el detalle de cada una y —para el acceso maestro— el
 * lanzamiento de "todo el catálogo".
 *
 * Este componente orquesta; no dibuja datos. Se encarga de tres cosas que no son de ninguno de
 * sus hijos:
 *
 *  1. Pedir la tabla al entrar y refrescarla sola cada 15 s MIENTRAS alguna búsqueda de la página
 *     visible siga corriendo (una de catálogo tarda horas y la fila tiene que ir avanzando).
 *  2. El link directo: `/alertas/imagenes?asignacion=<id>` abre ese detalle. Lo usan "Revisar en
 *     Alertas" del aviso de fin de búsqueda, la píldora de procesos y el propio modal de
 *     catálogo. `&solapa=no_asignadas|a_revisar|asignadas` elige con qué solapa abre.
 *  3. Al cerrar el detalle, sacar esos parámetros de la URL: si quedaran, volver a pedir el mismo
 *     link (otro "Revisar en Alertas" de la misma búsqueda) no cambiaría la ruta y el detalle no
 *     se volvería a abrir.
 */

/** Cada cuánto se refresca la tabla mientras hay una búsqueda corriendo en la página visible. */
const REFRESCO_MS = 15000

/** Solapas del detalle que se aceptan por URL; cualquier otro valor se ignora. */
const SOLAPAS_VALIDAS = ['no_asignadas', 'a_revisar', 'asignadas']

export default {
	components: {
		TablaAsignaciones: () => import('@/components/alertas/components/lista-de-alertas-table/imagenes/TablaAsignaciones'),
		ModalCatalogo: () => import('@/components/alertas/components/lista-de-alertas-table/imagenes/ModalCatalogo'),
		DetalleAsignacion: () => import('@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/Index'),
	},
	data() {
		return {
			/** Id de la asignación abierta en el detalle (null = cerrado). */
			asignacion_abierta_id: null,
			/** Solapa con la que se pidió abrir el detalle por URL (null = la decide el detalle). */
			solapa_pedida: null,
			/** Timer del refresco periódico de la tabla. */
			timer_refresco: null,
		}
	},
	computed: {
		/**
		 * True si la sesión entró con la clave maestra (lo manda la API en el usuario, contrato
		 * §5.3). Contra una API que todavía no lo manda da false: el botón no aparece y nada más
		 * cambia.
		 *
		 * @returns {Boolean}
		 */
		es_acceso_maestro() {
			let usuario = this.$store.state.auth.user
			return !!(usuario && usuario.es_acceso_maestro)
		},
		/** Id pedido por URL, tal como viene (texto) o undefined. */
		asignacion_de_la_url() {
			return this.$route.query.asignacion
		},
	},
	watch: {
		/**
		 * Un link directo nuevo mientras la pestaña ya estaba abierta (la píldora de procesos, el
		 * aviso de fin de búsqueda): abre ese detalle sin recargar nada más.
		 */
		asignacion_de_la_url() {
			this.leer_link_directo()
		},
	},
	created() {
		// Siempre desde la primera página: las búsquedas van de la más nueva a la más vieja, y
		// quien entra a la pestaña casi siempre viene a ver la última (la que acaba de largar o
		// la que le avisó el número rojo), no la página en la que había quedado la vez anterior.
		this.$store.commit('image_assignment/set_page', 1)
		this.$store.dispatch('image_assignment/get_asignaciones')
		this.leer_link_directo()
	},
	mounted() {
		this.timer_refresco = setInterval(this.refrescar_si_hay_activas, REFRESCO_MS)
	},
	beforeDestroy() {
		clearInterval(this.timer_refresco)
		this.timer_refresco = null
	},
	methods: {
		/**
		 * Lee `?asignacion=<id>&solapa=<solapa>` y, si hay un id válido, abre ese detalle.
		 */
		leer_link_directo() {
			let id = Number(this.$route.query.asignacion)
			if (!id) {
				return
			}
			let solapa = this.$route.query.solapa
			this.solapa_pedida = SOLAPAS_VALIDAS.indexOf(solapa) !== -1 ? solapa : null
			this.asignacion_abierta_id = id
		},
		/**
		 * Abre el detalle de una asignación (clic en la fila, "Ver", o "Ver la búsqueda en curso"
		 * del modal de catálogo).
		 *
		 * @param {Object} asignacion RunPayload.
		 */
		abrir_detalle(asignacion) {
			if (!asignacion || !asignacion.id) {
				return
			}
			this.solapa_pedida = null
			this.asignacion_abierta_id = asignacion.id
		},
		/**
		 * El detalle se cerró: se suelta el id y se limpia la URL (ver el punto 3 del comentario
		 * del componente). `replace` y no `push`: cerrar un modal no es una página nueva en el
		 * historial.
		 */
		al_cerrar_detalle() {
			this.asignacion_abierta_id = null
			this.solapa_pedida = null

			if (typeof this.$route.query.asignacion === 'undefined' && typeof this.$route.query.solapa === 'undefined') {
				return
			}
			let query = {}
			Object.keys(this.$route.query).forEach(clave => {
				if (clave !== 'asignacion' && clave !== 'solapa') {
					query[clave] = this.$route.query[clave]
				}
			})
			this.$router.replace({ query: query })
			.catch(() => {
				// NavigationDuplicated u otra navegación en el medio: la URL ya no importa.
			})
		},
		abrir_modal_catalogo() {
			this.$bvModal.show('imagenes-catalogo')
		},
		/**
		 * Se lanzó una búsqueda de todo el catálogo: la tabla vuelve a la primera página, que es
		 * donde aparece la nueva (las más nuevas van primero).
		 */
		al_lanzar_catalogo() {
			this.$store.commit('image_assignment/set_page', 1)
			this.$store.dispatch('image_assignment/get_asignaciones')
		},
		/**
		 * Refresco periódico: solo si la pestaña del navegador está a la vista, el detalle está
		 * cerrado y alguna búsqueda de la página sigue corriendo. Sin búsquedas activas no hay nada
		 * que pueda cambiar solo y no tiene sentido pegarle a la API cada 15 segundos.
		 */
		refrescar_si_hay_activas() {
			if (typeof document !== 'undefined' && document.hidden) {
				return
			}
			// Con el detalle abierto, el que refresca es el detalle (y de paso actualiza la fila de
			// su búsqueda en la tabla): no hace falta pedir las dos cosas cada 15 segundos.
			if (this.asignacion_abierta_id) {
				return
			}
			if (!this.$store.getters['image_assignment/hay_activas']) {
				return
			}
			this.$store.dispatch('image_assignment/get_asignaciones', { silencioso: true })
		},
	},
}
</script>
<style lang="sass">
.alertas-imagenes__barra
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
	gap: 10px 16px

.alertas-imagenes__intro
	flex: 1 1 320px
	min-width: 0
	margin: 0
	text-align: left
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

.alertas-imagenes__catalogo
	flex-shrink: 0
	margin-left: auto

// Telefono: el boton ocupa el ancho entero debajo del texto, que es donde el dedo lo encuentra.
@media (max-width: 575px)
	.alertas-imagenes__catalogo
		width: 100%
		margin-left: 0
</style>
