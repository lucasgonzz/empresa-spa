<template>
	<!--
		Notificacion de coincidencias del buscador general (grupo 274, prompt 03): panel fijo abajo
		al centro que explica en que propiedades se busco y cuantos resultados aporto cada una.
		El desglose (matches) lo manda el backend (GlobalSearchMatchesHelper, prompt 01): este
		componente solo lo traduce a texto, nunca lo recalcula.
	-->
	<transition name="notificacion-coincidencias-fade">
		<div
		v-if="visible && matches"
		class="notificacion-coincidencias"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave">
			<button
			type="button"
			class="notificacion-coincidencias__cerrar"
			title="Cerrar"
			@click="cerrar">
				<i class="icon-close"></i>
			</button>

			<p class="notificacion-coincidencias__linea1">{{ textoPropiedadesBuscadas }}</p>

			<p class="notificacion-coincidencias__linea2">
				<span class="notificacion-coincidencias__total">{{ textoTotal }}</span>
				<span
				v-for="propiedad in propiedadesConResultados"
				:key="propiedad.key"
				class="notificacion-coincidencias__pastilla">
					{{ propiedad.label }} <strong>{{ propiedad.cantidad }}</strong>
				</span>
			</p>

			<p v-if="textoConMultiples" class="notificacion-coincidencias__aclaracion">{{ textoConMultiples }}</p>
			<p v-if="textoSinAtribuir" class="notificacion-coincidencias__aclaracion">{{ textoSinAtribuir }}</p>
			<p v-if="textoSinCoincidencias" class="notificacion-coincidencias__aclaracion">{{ textoSinCoincidencias }}</p>
		</div>
	</transition>
</template>
<script>
export default {
	/**
	 * NotificacionCoincidencias — cartel que aparece abajo al centro despues de cada busqueda del
	 * buscador general, explicando el desglose de coincidencias que manda el backend (`matches`,
	 * ver GlobalSearchMatchesHelper). No recalcula nada: solo traduce el desglose a texto legible.
	 * La metrica de origen NO es exclusiva (un resultado puede coincidir por mas de una propiedad),
	 * por eso las aclaraciones de con_multiples/sin_atribuir son parte central del mensaje, no un
	 * detalle menor.
	 */
	props: {
		/**
		 * Desglose devuelto por el backend (o null si no hay nada que mostrar).
		 */
		matches: {
			type: Object,
			default: null,
		},

		/**
		 * Contador del store: cada incremento (busqueda nueva del usuario, nunca paginacion)
		 * dispara la aparicion del panel.
		 */
		nonce: {
			type: Number,
			required: true,
		},

		/**
		 * Mapa 'own:<key>' / 'relation:<relation>' -> etiqueta legible, armado por Index.vue (es
		 * quien conoce las etiquetas reales del modelo).
		 */
		etiquetas: {
			type: Object,
			default: function () {
				return {}
			},
		},
	},
	data() {
		return {
			// Controla si el panel esta en pantalla.
			visible: false,
			// Id del setTimeout de auto-ocultado en curso (null si no hay ninguno agendado).
			timer: null,
		}
	},
	computed: {
		/**
		 * Renglon 1: en que propiedades se busco, todas (incluidas las que dieron 0 resultados).
		 *
		 * @returns {String}
		 */
		textoPropiedadesBuscadas() {
			if (!this.matches) {
				return ''
			}
			let self = this
			let etiquetas_buscadas = []
			this.matches.propiedades.forEach(function (propiedad) {
				etiquetas_buscadas.push(self.etiquetaDe(propiedad))
			})
			return 'Se busco en ' + this.listaConY(etiquetas_buscadas)
		},

		/**
		 * "N resultados" (o "1 resultado"), para el inicio del renglon 2.
		 *
		 * @returns {String}
		 */
		textoTotal() {
			if (!this.matches) {
				return ''
			}
			return this.matches.total + ' ' + this.plural(this.matches.total, 'resultado', 'resultados')
		},

		/**
		 * Propiedades que aportaron al menos un resultado, en el orden que ya manda el backend
		 * (cantidad descendente), listas para pintar como pastilla.
		 *
		 * @returns {Array} [{ key, label, cantidad }]
		 */
		propiedadesConResultados() {
			if (!this.matches) {
				return []
			}
			let self = this
			let result = []
			this.matches.propiedades.forEach(function (propiedad) {
				if (propiedad.cantidad > 0) {
					result.push({
						key: propiedad.kind + ':' + (propiedad.kind === 'own' ? propiedad.key : propiedad.relation),
						label: self.etiquetaDe(propiedad),
						cantidad: propiedad.cantidad,
					})
				}
			})
			return result
		},

		/**
		 * Aclaracion de con_multiples: explica por que la suma de las pastillas puede superar el
		 * total. Vacio si con_multiples es 0 (no se muestra la linea).
		 *
		 * @returns {String}
		 */
		textoConMultiples() {
			if (!this.matches || !this.matches.con_multiples) {
				return ''
			}
			let verbo = this.matches.con_multiples === 1 ? 'coincide' : 'coinciden'
			return this.matches.con_multiples + ' ' + verbo + ' por mas de una propiedad'
		},

		/**
		 * Aclaracion de sin_atribuir: resultados que trajo el SQL (ej: por un filtro fijo, o por
		 * una divergencia de collation) pero que PHP no le pudo atribuir a ninguna propiedad
		 * tildada. Vacio si sin_atribuir es 0.
		 *
		 * @returns {String}
		 */
		textoSinAtribuir() {
			if (!this.matches || !this.matches.sin_atribuir) {
				return ''
			}
			let verbo = this.matches.sin_atribuir === 1 ? 'aparecio' : 'aparecieron'
			return this.matches.sin_atribuir + ' ' + verbo + ' por los filtros, no por el texto'
		},

		/**
		 * Aclaracion de las propiedades tildadas que no aportaron ningun resultado: le dice al
		 * usuario que puede destildarlas. Vacio si no hay ninguna.
		 *
		 * @returns {String}
		 */
		textoSinCoincidencias() {
			if (!this.matches) {
				return ''
			}
			let self = this
			let sin_coincidencias = []
			this.matches.propiedades.forEach(function (propiedad) {
				if (propiedad.cantidad === 0) {
					sin_coincidencias.push(self.etiquetaDe(propiedad))
				}
			})
			if (!sin_coincidencias.length) {
				return ''
			}
			return 'Sin coincidencias en: ' + sin_coincidencias.join(', ')
		},
	},
	watch: {
		/**
		 * Cada incremento del nonce es una busqueda nueva del usuario (nunca un cambio de pagina,
		 * ver doc del state en __base_store.js). Si hay desglose con resultados, muestra el panel y
		 * agenda el auto-ocultado; si no, lo oculta.
		 */
		nonce() {
			if (this.matches && this.matches.total > 0) {
				this.mostrar()
			} else {
				this.ocultar()
			}
		},
	},
	beforeDestroy() {
		// Sin esto queda un timer vivo apuntando a un componente ya destruido cada vez que se
		// cambia de modulo con el panel en pantalla.
		this.cancelarTimer()
	},
	methods: {
		/**
		 * Etiqueta legible de una propiedad del desglose, resuelta contra el mapa `etiquetas` que
		 * arma Index.vue. Si la key no esta en el mapa (caso raro, no deberia pasar en uso normal),
		 * cae a la key/relation cruda en vez de romper.
		 *
		 * @param {Object} propiedad { kind, key|relation, cantidad }
		 * @returns {String}
		 */
		etiquetaDe(propiedad) {
			let clave = propiedad.kind === 'own' ? ('own:' + propiedad.key) : ('relation:' + propiedad.relation)
			return this.etiquetas[clave] || (propiedad.key || propiedad.relation)
		},

		/**
		 * Une una lista de textos en criollo: "a", "a y b", "a, b y c".
		 *
		 * @param {Array} items
		 * @returns {String}
		 */
		listaConY(items) {
			if (!items.length) {
				return ''
			}
			if (items.length === 1) {
				return items[0]
			}
			let todos_menos_ultimo = items.slice(0, items.length - 1)
			return todos_menos_ultimo.join(', ') + ' y ' + items[items.length - 1]
		},

		/**
		 * Resuelve singular/plural segun la cantidad.
		 *
		 * @param {Number} cantidad
		 * @param {String} singular
		 * @param {String} plural_word
		 * @returns {String}
		 */
		plural(cantidad, singular, plural_word) {
			return cantidad === 1 ? singular : plural_word
		},

		/**
		 * Muestra el panel y (re)agenda el auto-ocultado a los 9 segundos, cancelando cualquier
		 * timer anterior.
		 *
		 * @return {void}
		 */
		mostrar() {
			this.visible = true
			this.agendarOcultado(9000)
		},

		/**
		 * Oculta el panel y cancela cualquier timer pendiente.
		 *
		 * @return {void}
		 */
		ocultar() {
			this.visible = false
			this.cancelarTimer()
		},

		/**
		 * Cancela el timer de auto-ocultado en curso, si habia uno.
		 *
		 * @return {void}
		 */
		cancelarTimer() {
			if (this.timer) {
				clearTimeout(this.timer)
				this.timer = null
			}
		},

		/**
		 * Agenda (cancelando cualquier timer anterior) el auto-ocultado del panel.
		 *
		 * @param {Number} ms
		 * @return {void}
		 */
		agendarOcultado(ms) {
			this.cancelarTimer()
			this.timer = setTimeout(() => {
				this.timer = null
				this.visible = false
			}, ms)
		},

		/**
		 * Boton de cerrar: oculta en el acto y cancela el auto-ocultado agendado.
		 *
		 * @return {void}
		 */
		cerrar() {
			this.ocultar()
		},

		/**
		 * Al pasar el mouse por encima se cancela el auto-ocultado: un cartel con datos para leer
		 * no se puede escapar mientras el usuario lo esta leyendo.
		 *
		 * @return {void}
		 */
		onMouseEnter() {
			this.cancelarTimer()
		},

		/**
		 * Al sacar el mouse se reagenda el auto-ocultado, con un plazo mas corto (4 segundos) que
		 * el inicial: si el usuario ya lo leyo y se fue, no hace falta esperar otros 9 segundos.
		 *
		 * @return {void}
		 */
		onMouseLeave() {
			this.agendarOcultado(4000)
		},
	},
}
</script>
<style lang="sass">
// Entrada/salida: fade + un desplazamiento chico desde abajo, nada mas elaborado que eso.
.notificacion-coincidencias-fade-enter-active,
.notificacion-coincidencias-fade-leave-active
	transition: opacity 0.2s ease, transform 0.2s ease

.notificacion-coincidencias-fade-enter,
.notificacion-coincidencias-fade-leave-to
	opacity: 0
	transform: translate(-50%, 8px)

// Mismo lenguaje visual que el pill del buscador: blanco, borde sutil, sombra suave, esquinas
// redondeadas.
.notificacion-coincidencias
	position: fixed
	bottom: 24px
	left: 50%
	transform: translateX(-50%)
	z-index: 1050
	max-width: min(560px, calc(100vw - 32px))
	background: #fff
	border: 1px solid #e2e4e7
	border-radius: 14px
	padding: 12px 16px
	box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 12px 0px
	font-size: 0.85rem
	color: #1d1d1f

	.notificacion-coincidencias__cerrar
		position: absolute
		top: 8px
		right: 8px
		display: flex
		align-items: center
		justify-content: center
		width: 22px
		height: 22px
		border: none
		background: transparent
		border-radius: 50%
		color: #86868b
		cursor: pointer
		box-shadow: none

		&:hover
			background: #f2f3f4
			color: #1d1d1f

		i
			font-size: 0.7rem

	.notificacion-coincidencias__linea1
		margin: 0 22px 4px 0
		color: #1d1d1f

	.notificacion-coincidencias__linea2
		margin: 0 22px 0 0
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 6px

	.notificacion-coincidencias__total
		font-weight: 600

	.notificacion-coincidencias__pastilla
		display: inline-flex
		align-items: center
		gap: 4px
		background: #f2f3f4
		color: #1d1d1f
		border-radius: 12px
		padding: 2px 8px
		font-size: 0.8rem

		strong
			font-weight: 600

	.notificacion-coincidencias__aclaracion
		margin: 6px 22px 0 0
		color: #86868b
		font-size: 0.75rem
</style>
