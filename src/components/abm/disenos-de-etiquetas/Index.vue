<template>
	<!--
		Solapa ABM -> Artículos -> "Diseños de etiquetas" (mision disenos-etiquetas-gondola, 29/9/2026).

		No es el ABM generico: la monta Abm.vue a traves de `componentes` en src/mixins/abm.js (mismo
		camino que los Diseños de Vender). Una tarjeta por diseño, con la etiqueta dibujada, y el editor
		de arrastrar y soltar al tocar una.
	-->
	<div class="disenos-de-etiquetas">

		<div class="disenos-de-etiquetas__cabecera">
			<p class="disenos-de-etiquetas__intro">
				Armá tus etiquetas de góndola: de qué tamaño son, cuántas salen por hoja y qué datos del
				artículo llevan. Cada diseño aparece para imprimir en <strong>Listado</strong>, en el menú
				de los artículos seleccionados, dentro de <strong>Documentos PDF</strong>.
			</p>
			<b-button
			variant="primary"
			class="disenos-de-etiquetas__nuevo"
			@click="nuevo_diseno">
				<i class="bi bi-plus-lg"></i>
				Nuevo diseño
			</b-button>
		</div>

		<div
		v-if="cargando_por_primera_vez"
		class="disenos-de-etiquetas__cargando text-muted">
			<span class="spinner-border spinner-border-sm m-r-10"></span>
			Cargando diseños
		</div>

		<!--
			Sin diseños: con la API al dia no pasa (cada negocio arranca con el diseño de siempre), pero
			con una API vieja el store queda vacio y el Listado imprime la etiqueta de siempre.
		-->
		<div
		v-else-if="!modelos.length"
		class="disenos-de-etiquetas__vacio">
			<i class="bi bi-tags"></i>
			<p>Todavía no hay diseños. Las etiquetas salen con el diseño de siempre.</p>
			<b-button
			variant="outline-primary"
			@click="nuevo_diseno">
				Crear un diseño
			</b-button>
		</div>

		<div
		v-else
		class="disenos-de-etiquetas__grilla">
			<tarjeta-de-diseno
			v-for="modelo in modelos"
			:key="modelo.id"
			:modelo="modelo"
			:muestra="muestra"
			:listas="listas"
			:hay_articulos="ids_de_prueba.length > 0"
			:nota_de_la_prueba="nota_de_la_prueba"
			@editar="editar(modelo)"
			@probar="probar(modelo)"
			@duplicar="duplicar(modelo)"
			@eliminar="eliminar(modelo)"></tarjeta-de-diseno>
		</div>

		<editor-de-etiqueta
		ref="editor"
		:muestra="muestra"
		:listas="listas"
		:ids_de_prueba="ids_de_prueba"
		:nota_de_la_prueba="nota_de_la_prueba"></editor-de-etiqueta>
	</div>
</template>
<script>
import TarjetaDeDiseno from './TarjetaDeDiseno'
/*
	El editor va importado de forma directa (no con () => import) a proposito: la solapa lo abre con
	this.$refs.editor.abrir(), y un componente asincrono no tiene ref hasta que termina de cargar
	(mismo motivo que en los Diseños de Vender). La solapa entera ya se carga diferida desde abm.js.
*/
import EditorDeEtiqueta from './editor/Index'
import { normalizar_diseno, serializar_diseno } from './diseno'
import { armar_muestra, ids_para_la_prueba, hay_articulo_completo, hay_articulos_a_mano } from './muestra'
import {
	crear_diseno,
	eliminar_diseno,
	mensaje_de_error,
	abrir_prueba,
	buscar_articulos_para_la_prueba,
	SIN_ARTICULOS_PARA_PROBAR,
	BUSCANDO_ARTICULOS_PARA_PROBAR,
	NO_SE_PUDIERON_TRAER_ARTICULOS,
} from './api_de_disenos'
import { buscar_lista } from './catalogo'
import { avisar } from '@/components/abm/disenos-de-vender/avisos'

/* Largo maximo del nombre (article_ticket_designs.name es string(120)) */
const LARGO_MAXIMO_DEL_NOMBRE = 120

/**
 * Solapa "Diseños de etiquetas" del ABM de Artículos.
 *
 * Lee los diseños del store `article_ticket_design` (lo descarga recursos-iniciales al iniciar
 * sesion y se vuelve a pedir al entrar aca) y hace las escrituras de las tarjetas: duplicar y
 * eliminar. Crear y editar los hace el editor.
 */
export default {
	name: 'AbmDisenosDeEtiquetas',
	components: {
		TarjetaDeDiseno,
		EditorDeEtiqueta,
	},
	data() {
		return {
			/* Articulos traidos de la API cuando el store no tenia ninguno completo (muestra.js) */
			articulos_de_respaldo: [],
			/* 'sin_buscar' | 'buscando' | 'lista' | 'error': la busqueda de articulos_de_respaldo */
			estado_de_la_busqueda: 'sin_buscar',
		}
	},
	computed: {
		/**
		 * Los diseños del negocio, ordenados como en el menu de Listado (position y despues id).
		 *
		 * @returns {Array}
		 */
		modelos() {
			return this.$store.state.article_ticket_design.models.slice().sort(function (a, b) {
				let posicion = (Number(a.position) || 0) - (Number(b.position) || 0)
				return posicion !== 0 ? posicion : Number(a.id) - Number(b.id)
			})
		},
		/**
		 * Si todavia no hay nada para mostrar y la lista esta en camino.
		 *
		 * @returns {boolean}
		 */
		cargando_por_primera_vez() {
			return this.$store.state.article_ticket_design.loading && !this.modelos.length
		},
		/**
		 * Las listas de precios del negocio (para los precios de lista).
		 *
		 * @returns {Array}
		 */
		listas() {
			return this.$store.state.price_type ? this.$store.state.price_type.models : []
		},
		/**
		 * Datos del articulo con que se dibujan las etiquetas.
		 *
		 * @returns {Object}
		 */
		muestra() {
			return armar_muestra(this, this.articulos_de_respaldo)
		},
		/**
		 * Los articulos con que sale "Imprimir una prueba" (hasta 6: los del Listado, los del store y
		 * los traidos de la API).
		 *
		 * @returns {Array}
		 */
		ids_de_prueba() {
			return ids_para_la_prueba(this, this.articulos_de_respaldo)
		},
		/**
		 * Por que "Imprimir una prueba" no tiene con que salir (se lee solo si no hay ids).
		 *
		 * @returns {string}
		 */
		nota_de_la_prueba() {
			if (this.estado_de_la_busqueda === 'buscando') {
				return BUSCANDO_ARTICULOS_PARA_PROBAR
			}
			if (this.estado_de_la_busqueda === 'error') {
				return NO_SE_PUDIERON_TRAER_ARTICULOS
			}
			return SIN_ARTICULOS_PARA_PROBAR
		},
	},
	created() {
		/* Horizontal-nav no la pide para una solapa con componente propio (ver buildItem en Abm.vue) */
		this.$store.dispatch('article_ticket_design/getModels')
		this.buscar_articulos_de_respaldo()
	},
	methods: {
		/**
		 * Si el store no tiene ningun articulo completo (se entro sin pasar por el Listado, o el Listado
		 * no tenia codigos de barras), pide unos a la API para la muestra y la prueba. Si el store no
		 * tiene ninguno de ningun tipo, la API tambien trae los incompletos.
		 *
		 * @returns {void}
		 */
		buscar_articulos_de_respaldo() {
			let self = this
			if (hay_articulo_completo(this)) {
				return
			}

			this.estado_de_la_busqueda = 'buscando'
			buscar_articulos_para_la_prueba(this, !hay_articulos_a_mano(this))
			.then(function (articulos) {
				self.articulos_de_respaldo = articulos
				self.estado_de_la_busqueda = 'lista'
			})
			.catch(function (error) {
				console.log(error)
				self.estado_de_la_busqueda = 'error'
			})
		},
		/**
		 * Abre el editor para crear un diseño (arranca con el diseño de siempre).
		 *
		 * @returns {void}
		 */
		nuevo_diseno() {
			this.$refs.editor.abrir(null)
		},
		/**
		 * Abre el editor con un diseño.
		 *
		 * @param {Object} modelo
		 * @returns {void}
		 */
		editar(modelo) {
			this.$refs.editor.abrir(modelo)
		},
		/**
		 * "Imprimir una prueba": el PDF con este diseño y hasta 6 articulos (ids_de_prueba).
		 *
		 * @param {Object} modelo
		 * @returns {void}
		 */
		probar(modelo) {
			if (!abrir_prueba(modelo.id, this.ids_de_prueba)) {
				avisar(this, 'info', this.nota_de_la_prueba)
			}
		},
		/**
		 * "Duplicar": crea una copia con el mismo diseño y " (copia)" en el nombre. La copia es del
		 * usuario (la API le deja price_type_id en null).
		 *
		 * @param {Object} modelo
		 * @returns {void}
		 */
		duplicar(modelo) {
			let self = this
			let nombre = (String(modelo.name || 'Diseño') + ' (copia)').slice(0, LARGO_MAXIMO_DEL_NOMBRE)

			this.empezar_carga('Duplicando el diseño')

			crear_diseno(this, {
				name: nombre,
				diseno: serializar_diseno(normalizar_diseno(modelo.diseno, modelo.price_type_id)),
			})
			.then(function () {
				return self.$store.dispatch('article_ticket_design/getModels')
			})
			.then(function () {
				self.terminar_carga()
				avisar(self, 'success', 'Diseño duplicado: «' + nombre + '».')
			})
			.catch(function (error) {
				self.terminar_carga()
				console.log(error)
				self.$store.dispatch('article_ticket_design/getModels')
				avisar(self, 'error', mensaje_de_error(error, 'No se pudo duplicar el diseño. Revisá tu conexión y volvé a intentar.'))
			})
		},
		/**
		 * "Eliminar": pregunta y borra.
		 *
		 * @param {Object} modelo
		 * @returns {void}
		 */
		eliminar(modelo) {
			let self = this
			let mensaje = '¿Eliminar el diseño «' + modelo.name + '»? Deja de aparecer para imprimir en Listado. No se puede deshacer.'

			/*
				El diseño generado para una lista: al borrarlo, esa lista vuelve a tener su opcion de
				siempre en el menu de Listado (el respaldo por lista sin diseño). Se dice la verdad.
			*/
			let lista = modelo.price_type_id && this.ownerUsesListasDePrecio() ? buscar_lista(this.listas, modelo.price_type_id) : null
			if (lista) {
				mensaje = '¿Eliminar el diseño «' + modelo.name + '»? No se puede deshacer. La lista «' + lista.name + '» va a seguir apareciendo en Listado, con la etiqueta de siempre.'
			}

			this.$bvModal.msgBoxConfirm(mensaje, {
				title: 'Eliminar diseño',
				okTitle: 'Eliminar',
				okVariant: 'danger',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(function (confirmado) {
				if (!confirmado) {
					return
				}

				self.empezar_carga('Eliminando el diseño')

				return eliminar_diseno(self, modelo.id)
				.then(function () {
					/* El listado nuevo reemplaza al del store (setModels), asi que el borrado ya no aparece */
					return self.$store.dispatch('article_ticket_design/getModels')
				})
				.then(function () {
					self.terminar_carga()
					avisar(self, 'success', 'Diseño eliminado.')
				})
				.catch(function (error) {
					self.terminar_carga()
					console.log(error)
					self.$store.dispatch('article_ticket_design/getModels')
					avisar(self, 'error', mensaje_de_error(error, 'No se pudo eliminar el diseño. Revisá tu conexión y volvé a intentar.'))
				})
			})
			.catch(function () {})
		},
		/**
		 * Prende el indicador global de carga con un mensaje (patron de CLAUDE.md).
		 *
		 * @param {string} mensaje
		 * @returns {void}
		 */
		empezar_carga(mensaje) {
			this.$store.commit('auth/setMessage', mensaje)
			this.$store.commit('auth/setLoading', true)
		},
		/**
		 * Apaga el indicador global de carga.
		 *
		 * @returns {void}
		 */
		terminar_carga() {
			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
		},
	},
}
</script>
<style lang="sass">
// Colores solo por token (mismo trato que disenos-de-vender/Index.vue)
.disenos-de-etiquetas
	width: 100%
	// #app centra el texto; la solapa va a la izquierda (mismo motivo que en disenos-de-vender)
	text-align: left

	.disenos-de-etiquetas__cabecera
		display: flex
		align-items: flex-start
		justify-content: space-between
		flex-wrap: wrap
		gap: 12px 24px
		margin: 0 0 20px
		padding-top: 4px

	.disenos-de-etiquetas__intro
		flex: 1 1 360px
		max-width: 760px
		margin: 0
		color: var(--color-text-secondary)
		font-size: 14px
		line-height: 1.55

		strong
			color: var(--color-text-primary)
			font-weight: 600

	.disenos-de-etiquetas__nuevo.btn
		display: inline-flex
		align-items: center
		gap: 6px
		flex: 0 0 auto
		border-radius: 8px

	.disenos-de-etiquetas__cargando
		display: flex
		align-items: center
		padding: 12px 0

	.disenos-de-etiquetas__vacio
		display: flex
		flex-direction: column
		align-items: center
		gap: 10px
		padding: 40px 16px
		border: 1.5px dashed var(--color-border)
		border-radius: 12px
		color: var(--color-text-secondary)
		text-align: center

		i
			font-size: 1.8rem

		p
			margin: 0

	.disenos-de-etiquetas__grilla
		display: grid
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))
		gap: 16px
		margin-bottom: 20px

@media (max-width: 575.98px)
	.disenos-de-etiquetas
		.disenos-de-etiquetas__grilla
			grid-template-columns: minmax(0, 1fr)

		.disenos-de-etiquetas__nuevo.btn
			width: 100%
			justify-content: center
</style>
