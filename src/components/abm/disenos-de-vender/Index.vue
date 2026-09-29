<template>
	<!--
		Solapa ABM -> Ventas -> "Diseños de Vender" (mision diseno-vender-configurable, 28/9/2026).

		No es el ABM generico: la monta Abm.vue a traves de `componentes` en src/mixins/abm.js (mismo
		camino que Integraciones -> Tienda online). Muestra una tarjeta por diseño, con su miniatura, y
		abre el editor de arrastrar y soltar al tocar una.
	-->
	<div class="disenos-de-vender">

		<div class="disenos-de-vender__cabecera">
			<p class="disenos-de-vender__intro">
				Elegí cómo se ve Vender: en qué etapa va cada campo, en qué orden y de qué ancho.
				Todo el negocio vende con el diseño que está <strong>En uso</strong>.
			</p>
			<b-button
			variant="primary"
			class="disenos-de-vender__nuevo"
			@click="nuevo_diseno">
				<i class="bi bi-plus-lg"></i>
				Nuevo diseño
			</b-button>
		</div>

		<div
		v-if="cargando_por_primera_vez"
		class="disenos-de-vender__cargando text-muted">
			<span class="spinner-border spinner-border-sm m-r-10"></span>
			Cargando diseños
		</div>

		<!--
			Sin diseños: con la API al dia no pasa (el listado crea el predeterminado si el negocio no
			tiene ninguno), pero con una API vieja el store queda vacio y Vender usa el diseño
			predeterminado igual. Se ofrece crear uno.
		-->
		<div
		v-else-if="!modelos.length"
		class="disenos-de-vender__vacio">
			<i class="bi bi-layout-three-columns"></i>
			<p>Todavía no hay diseños. Vender se ve con el diseño predeterminado.</p>
			<b-button
			variant="outline-primary"
			@click="nuevo_diseno">
				Crear un diseño
			</b-button>
		</div>

		<div
		v-else
		class="disenos-de-vender__grilla">
			<tarjeta-de-diseno
			v-for="modelo in modelos"
			:key="modelo.id"
			:modelo="modelo"
			:en_uso="modelo.id === id_en_uso"
			@editar="editar(modelo)"
			@usar="usar(modelo)"
			@duplicar="duplicar(modelo)"
			@eliminar="eliminar(modelo)"></tarjeta-de-diseno>
		</div>

		<editor-de-diseno ref="editor"></editor-de-diseno>
	</div>
</template>
<script>
import TarjetaDeDiseno from './TarjetaDeDiseno'
/*
	El editor va importado de forma directa (no con () => import) a proposito: la solapa lo abre con
	this.$refs.editor.abrir(), y un componente asincrono no tiene ref hasta que termina de cargar, asi
	que el primer clic en "Editar" no haria nada. La solapa entera ya se carga diferida desde abm.js.
*/
import EditorDeDiseno from './editor/Index'
import { resolver_diseno, serializar_diseno, diseno_en_uso } from '@/components/vender/layout/resolver_diseno'
import { crear_diseno, actualizar_diseno, eliminar_diseno, mensaje_de_error } from './api_de_disenos'

/* Largo maximo del nombre de un diseño (vender_layouts.name es string(120)) */
const LARGO_MAXIMO_DEL_NOMBRE = 120

/* Mensaje del backend para el diseño en uso: se repite aca para no pedir un DELETE que ya se sabe que da 422 */
const NO_SE_ELIMINA_EL_EN_USO = 'No se puede eliminar el diseño en uso. Poné otro diseño en uso y después eliminá este.'

/**
 * Solapa "Diseños de Vender" del ABM de Ventas.
 *
 * Lee los diseños del store `vender_layout` (lo descarga recursos-iniciales al iniciar sesion y se
 * vuelve a pedir al entrar aca) y hace las escrituras de las tarjetas: usar, duplicar y eliminar.
 * Crear y editar los hace el editor. Despues de CUALQUIER escritura se vuelve a pedir la lista:
 * poner un diseño en uso apaga al que estaba, asi que cambia mas de una fila.
 */
export default {
	name: 'AbmDisenosDeVender',
	components: {
		TarjetaDeDiseno,
		EditorDeDiseno,
	},
	computed: {
		/**
		 * Los diseños del negocio, en el orden del backend (por id).
		 *
		 * @returns {Array}
		 */
		modelos() {
			return this.$store.state.vender_layout.models
		},
		/**
		 * id del diseño en uso. Se usa diseno_en_uso() del contrato (el mismo criterio que Vender) y
		 * no el `en_uso` de cada fila: en el instante en que llegan las notificaciones de otro
		 * dispositivo puede haber dos prendidos, y la insignia tiene que estar en uno solo.
		 *
		 * @returns {number|null}
		 */
		id_en_uso() {
			let en_uso = diseno_en_uso(this.modelos)
			return en_uso ? en_uso.id : null
		},
		/**
		 * Si todavia no hay nada para mostrar y la lista esta en camino.
		 *
		 * @returns {boolean}
		 */
		cargando_por_primera_vez() {
			return this.$store.state.vender_layout.loading && !this.modelos.length
		},
	},
	created() {
		/* Horizontal-nav no la pide para una solapa con componente propio (ver buildItem en Abm.vue) */
		this.$store.dispatch('vender_layout/getModels')
	},
	methods: {
		/**
		 * Abre el editor para crear un diseño (arranca con el predeterminado).
		 *
		 * @returns {void}
		 */
		nuevo_diseno() {
			this.$refs.editor.abrir(null, false)
		},
		/**
		 * Abre el editor con un diseño.
		 *
		 * @param {Object} modelo
		 * @returns {void}
		 */
		editar(modelo) {
			this.$refs.editor.abrir(modelo, modelo.id === this.id_en_uso)
		},
		/**
		 * "Usar este diseño": lo pone en uso (el backend apaga al que estaba) y refresca la lista.
		 *
		 * @param {Object} modelo
		 * @returns {void}
		 */
		usar(modelo) {
			let self = this

			this.empezar_carga('Poniendo el diseño en uso')

			actualizar_diseno(this, modelo.id, { en_uso: true })
			.then(function () {
				return self.$store.dispatch('vender_layout/getModels')
			})
			.then(function () {
				self.terminar_carga()
				self.$toast.success('Listo: todo el negocio vende con «' + modelo.name + '».')
			})
			.catch(function (error) {
				self.terminar_carga()
				console.log(error)
				self.$toast.error(mensaje_de_error(error, 'No se pudo poner el diseño en uso. Revisá tu conexión y volvé a intentar.'))
			})
		},
		/**
		 * "Duplicar": crea una copia con el diseño resuelto y serializado (queda como diseño fijo,
		 * aunque el original sea el predeterminado del sistema) y sin estar en uso.
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
				layout: serializar_diseno(resolver_diseno(modelo.layout, this)),
				en_uso: false,
			})
			.then(function () {
				return self.$store.dispatch('vender_layout/getModels')
			})
			.then(function () {
				self.terminar_carga()
				self.$toast.success('Diseño duplicado: «' + nombre + '».')
			})
			.catch(function (error) {
				self.terminar_carga()
				console.log(error)
				self.$toast.error(mensaje_de_error(error, 'No se pudo duplicar el diseño. Revisá tu conexión y volvé a intentar.'))
			})
		},
		/**
		 * "Eliminar": pregunta y borra. El que esta en uso no se elimina (el boton ya viene
		 * deshabilitado; si igual llega, se explica sin pedir nada). Si el backend lo rechaza (422:
		 * justo lo pusieron en uso desde otro lado), se muestra su mensaje.
		 *
		 * @param {Object} modelo
		 * @returns {void}
		 */
		eliminar(modelo) {
			let self = this

			if (modelo.id === this.id_en_uso) {
				this.$toast.warning(NO_SE_ELIMINA_EL_EN_USO)
				return
			}

			this.$bvModal.msgBoxConfirm('¿Eliminar el diseño «' + modelo.name + '»? No se puede deshacer.', {
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
					return self.$store.dispatch('vender_layout/getModels')
				})
				.then(function () {
					self.terminar_carga()
					self.$toast.success('Diseño eliminado.')
				})
				.catch(function (error) {
					self.terminar_carga()
					console.log(error)
					self.$toast.error(mensaje_de_error(error, 'No se pudo eliminar el diseño. Revisá tu conexión y volvé a intentar.'))
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
// Colores solo por token (mismo criterio que integraciones/TiendaOnline.vue).
.disenos-de-vender
	width: 100%

	.disenos-de-vender__cabecera
		display: flex
		align-items: flex-start
		justify-content: space-between
		flex-wrap: wrap
		gap: 12px 24px
		margin: 0 0 20px
		// Aire arriba: entra pegado a la fila de solapas del ABM (mismo motivo que TiendaOnline.vue)
		padding-top: 4px

	.disenos-de-vender__intro
		flex: 1 1 360px
		max-width: 720px
		margin: 0
		color: var(--color-text-secondary)
		font-size: 14px
		line-height: 1.55

		strong
			color: var(--color-text-primary)
			font-weight: 600

	.disenos-de-vender__nuevo.btn
		display: inline-flex
		align-items: center
		gap: 6px
		flex: 0 0 auto
		border-radius: 8px

	.disenos-de-vender__cargando
		display: flex
		align-items: center
		padding: 12px 0

	.disenos-de-vender__vacio
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

	// Tarjetas en grilla: tantas columnas como entren de 280px; una sola en telefono
	.disenos-de-vender__grilla
		display: grid
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))
		gap: 16px
		margin-bottom: 20px

@media (max-width: 575.98px)
	.disenos-de-vender
		.disenos-de-vender__grilla
			grid-template-columns: minmax(0, 1fr)

		.disenos-de-vender__nuevo.btn
			width: 100%
			justify-content: center
</style>
