<template>
<div
class="alertas-imagenes"
data-testid="alertas-imagenes">

	<!--
		Una linea que dice que es esta pestaña, y a la derecha el unico boton: asignar imagenes a
		todo el catalogo, que es solo del acceso maestro (Lucas al entregar el sistema). El dueño
		sigue pidiendo imagenes desde el listado, con su tope diario.

		La ultima oracion de la intro dice que es una "busqueda" en esta pantalla: cada fila es
		una asignacion y la columna Busquedas cuenta consultas al buscador (ver la nota de
		textos.js). Es el unico lugar donde se define la palabra para quien lee la tabla.
	-->
	<div class="alertas-imagenes__barra m-b-15">
		<p class="alertas-imagenes__intro">
			Cada asignación automática de imágenes queda acá. Abrí una para ver qué se asignó, qué quedó para revisar y por qué no se encontró el resto. Las búsquedas son las consultas al buscador de imágenes que gastó cada una.
		</p>
		<b-button
		v-if="es_acceso_maestro"
		class="btn-modulo alertas-imagenes__catalogo"
		variant="primary"
		data-testid="imagenes-catalogo-abrir"
		@click="abrir_modal_catalogo">
			<i class="bi bi-images m-r-5"></i>
			Asignar imágenes a todo el catálogo
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
 *     se volvería a abrir. Y al revés: si el detalle se abrió por URL y el parámetro desaparece
 *     (el botón Atrás del navegador), el detalle se cierra.
 *
 * Además, cuando el número rojo dice que hay una búsqueda nueva o una que terminó (cambian
 * `en_proceso` o `sin_ver` del resumen), la tabla se vuelve a pedir en silencio: sin eso, una
 * búsqueda que arrancaba desde el listado o el asistente no aparecía hasta volver a entrar.
 */

/** Cada cuánto se refresca la tabla mientras hay una búsqueda corriendo en la página visible. */
const REFRESCO_MS = 15000

/** Solapas del detalle que se aceptan por URL; cualquier otro valor se ignora. */
const SOLAPAS_VALIDAS = ['no_asignadas', 'a_revisar', 'asignadas']

/**
 * Espera antes del refresco por cambios del resumen: el resumen puede cambiar dos veces seguidas
 * (el del listado y el de get_resumen) y con esto se pide la tabla una sola vez.
 */
const ESPERA_REFRESCO_POR_RESUMEN_MS = 400

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
			/**
			 * true si el detalle abierto se abrió por URL (`?asignacion=`). Solo en ese caso que
			 * desaparezca el parámetro (el botón Atrás) cierra el detalle: uno abierto con un clic
			 * en la fila nunca tuvo el parámetro.
			 */
			abierta_por_url: false,
			/** Timer del refresco silencioso cuando cambia el resumen del número rojo. */
			timer_refresco_por_resumen: null,
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
		/**
		 * Lo que el link directo pide, id y solapa juntos (`12|no_asignadas`). Mirar los dos hace
		 * que `?asignacion=12&solapa=no_asignadas` sobre la misma búsqueda ya abierta cambie de
		 * solapa, y no solo un id nuevo.
		 *
		 * @returns {String}
		 */
		link_directo() {
			let query = this.$route.query
			return String(query.asignacion || '') + '|' + String(query.solapa || '')
		},
		/**
		 * Lo del resumen que avisa que la tabla puede estar vieja: una búsqueda que arrancó o
		 * terminó (`en_proceso`) y una terminada que nadie abrió (`sin_ver`).
		 *
		 * @returns {String}
		 */
		firma_del_resumen() {
			let resumen = this.$store.state.image_assignment.resumen
			return resumen.en_proceso + '|' + resumen.sin_ver
		},
	},
	watch: {
		/**
		 * Un link directo nuevo mientras la pestaña ya estaba abierta (la píldora de procesos, el
		 * aviso de fin de búsqueda, el botón Atrás): abre, cambia de solapa o cierra el detalle sin
		 * recargar nada más.
		 */
		link_directo() {
			this.leer_link_directo()
		},
		/** El número rojo avisa que hay algo nuevo: la tabla se vuelve a pedir en silencio. */
		firma_del_resumen() {
			clearTimeout(this.timer_refresco_por_resumen)
			this.timer_refresco_por_resumen = setTimeout(() => {
				this.timer_refresco_por_resumen = null
				this.$store.dispatch('image_assignment/get_asignaciones', { silencioso: true })
			}, ESPERA_REFRESCO_POR_RESUMEN_MS)
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
		clearTimeout(this.timer_refresco_por_resumen)
		this.timer_refresco_por_resumen = null
	},
	methods: {
		/**
		 * Lee `?asignacion=<id>&solapa=<solapa>` y, si hay un id válido, abre ese detalle (o, si
		 * ya estaba abierto, le cambia la solapa). Si el parámetro ya no está y el detalle se había
		 * abierto por URL, lo cierra: es lo que pasa con el botón Atrás del navegador.
		 */
		leer_link_directo() {
			let id = Number(this.$route.query.asignacion)
			if (!id) {
				if (this.abierta_por_url && this.asignacion_abierta_id) {
					this.abierta_por_url = false
					this.asignacion_abierta_id = null
					this.solapa_pedida = null
				}
				return
			}
			let solapa = this.$route.query.solapa
			this.solapa_pedida = SOLAPAS_VALIDAS.indexOf(solapa) !== -1 ? solapa : null
			this.asignacion_abierta_id = id
			this.abierta_por_url = true
		},
		/**
		 * Abre el detalle de una asignación (clic en la fila, "Ver", o "Ver la asignación en curso"
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
			this.abierta_por_url = false
		},
		/**
		 * El detalle se cerró: se suelta el id y se limpia la URL (ver el punto 3 del comentario
		 * del componente). `replace` y no `push`: cerrar un modal no es una página nueva en el
		 * historial.
		 */
		al_cerrar_detalle() {
			this.asignacion_abierta_id = null
			this.solapa_pedida = null
			this.abierta_por_url = false

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
