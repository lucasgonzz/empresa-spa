<template>
	<!--
		Una seccion de Vender (mision vender-secciones-personalizables, 22/11/2026). Reemplaza a las
		etapas 1 y 3 de antes (stage-1/Index.vue y stage-3/Index.vue): con el diseño de Vender en uso
		cada negocio decide cuantas secciones hay, de que titulo, descripcion y color, de que ancho y
		alto, y si se pliegan. La etapa 2 (la tabla de articulos) sigue siendo stage-2/Index.vue.

		El cuerpo es una grilla (layout/GrillaDeEtapa.vue) con los campos que el diseño ubica aca. Si
		el diseño no le deja ningun campo disponible la seccion no se dibuja (v-if="se_dibuja"): la
		misma regla con la que la reserva decide que le toca montar a ella, no se reemplaza por otra.

		Index: orquesta el plegado y el foco; la logica de cada campo vive en su componente.
	-->
	<!--
		🔴 La clase vender-stage--etapa-N (o --seccion-N) es la identidad de la seccion; el color sale de
		la variable --acento-rgb que se le pone en linea (ver _vender-stages.sass), no de la clase.
	-->
	<div
	v-if="se_dibuja"
	class="vender-stage vender-stage--acento"
	:class="clases"
	:style="estilo"
	:data-seccion="id">

		<!--
			El ancla va en el header y no en el contenedor: es la franja clickeable que pliega y
			despliega la seccion, y es lo unico que se ve cuando esta plegada. Los atributos del tour
			(vender.etapa_1) y de las pruebas e2e (venta-etapa-3 y data-abierta) se conservan en la
			etapa_1 y en la etapa_3, que es donde estaban.
		-->
		<cabecera-de-seccion
		:numero="seccion.numero"
		:titulo="seccion.titulo"
		:descripcion="descripcion"
		:plegable="seccion.plegable"
		:abierta="se_ve_abierta"
		v-bind="atributos_de_la_cabecera"
		@alternar="alternar"></cabecera-de-seccion>

		<!--
			Cuerpo plegable. v-show y no v-if, a proposito: los campos tienen que existir aunque la
			seccion este plegada (el foco de un atajo, las pruebas que esperan el control en el DOM, y
			los defaults que algunos campos aplican al montarse).
		-->
		<transition name="stage-collapse">
			<div
			v-show="se_ve_abierta"
			class="vender-stage__body vender-stage__body--grilla">
				<grilla-de-etapa
				:etapa="id"
				:stage_open="se_ve_abierta"></grilla-de-etapa>
			</div>
		</transition>
	</div>
</template>

<script>
import CabeceraDeSeccion from './CabeceraDeSeccion'
import GrillaDeEtapa from '@/components/vender/layout/GrillaDeEtapa'
import { subtitulo_de_etapa } from '@/components/vender/layout/resolver_diseno'
import diseno_de_vender, { EVENTO_ENFOCAR_ELEMENTO } from '@/mixins/vender/diseno_de_vender'

export default {
	name: 'SeccionDeVender',
	mixins: [diseno_de_vender],
	components: {
		CabeceraDeSeccion,
		GrillaDeEtapa,
	},
	props: {
		/**
		 * Id de la seccion en el diseño ('etapa_1', 'etapa_3', 'seccion_4'...). Nunca 'etapa_2'.
		 */
		id: {
			type: String,
			required: true,
		},

		/**
		 * Alto en pixeles si la seccion es de alto fijo y Vender esta dibujando columnas; null si el
		 * alto es automatico (o la pantalla es angosta y todo va apilado). Lo mide VenderStages.vue.
		 */
		alto_px: {
			type: Number,
			default: null,
		},
	},
	data() {
		return {
			/* Estado de plegado elegido por el vendedor; sólo cuenta si la seccion se puede plegar */
			abierta: true,
		}
	},
	computed: {
		/**
		 * Los datos de la seccion en el diseño en uso (titulo, color, numero, plegable...). Se
		 * recalcula si el diseño cambia con Vender abierto.
		 *
		 * @returns {Object}
		 */
		seccion() {
			return this.seccion_de_vender(this.id) || {
				numero: 0, titulo: '', color: 'violeta', rgb: '111,66,193', plegable: false, alto_fijo: false, descripcion: null,
			}
		},

		/**
		 * Si la seccion se dibuja: el diseño en uso le deja al menos un campo disponible.
		 *
		 * @returns {boolean}
		 */
		se_dibuja() {
			return !!this.seccion_de_vender(this.id) && this.grilla_de_vender_se_dibuja(this.id)
		},

		/**
		 * Si la seccion no puede estar plegada: el diseño en uso puso aca un campo que agrega
		 * articulos (codigo de barras, buscador...) o el resumen de la venta, donde se ve el total.
		 *
		 * @returns {boolean}
		 */
		se_mantiene_abierta() {
			return this.etapa_de_vender_se_mantiene_abierta(this.id)
		},

		/**
		 * Si el cuerpo se ve: una seccion que no se pliega siempre, y una plegable cuando esta abierta.
		 *
		 * @returns {boolean}
		 */
		se_ve_abierta() {
			return !this.seccion.plegable || this.abierta
		},

		/**
		 * Descripcion del header: la que escribio el usuario o, si no puso ninguna, la automatica con
		 * los campos que se dibujan ("Facturación, método de pago, ... y N más").
		 *
		 * @returns {string}
		 */
		descripcion() {
			return this.seccion.descripcion || subtitulo_de_etapa(this.elementos_de_etapa_de_vender(this.id))
		},

		/**
		 * Clases de la tarjeta: identidad de la seccion, abierta y alto fijo.
		 *
		 * @returns {Array}
		 */
		clases() {
			let identidad = this.id.indexOf('etapa_') === 0
				? 'vender-stage--etapa-' + this.id.substring(6)
				: 'vender-stage--seccion-' + this.id.substring(8)

			return [
				identidad,
				{
					'vender-stage--open': this.se_ve_abierta,
					'vender-stage--alto-fijo': this.alto_px !== null,
				},
			]
		},

		/**
		 * Estilo en linea: el color de enfasis (r,g,b) del que salen el header, el numero y el borde,
		 * y el alto cuando es fijo.
		 *
		 * @returns {Object}
		 */
		estilo() {
			let estilo = { '--acento-rgb': this.seccion.rgb }
			if (this.alto_px !== null) {
				estilo.height = this.alto_px + 'px'
			}
			return estilo
		},

		/**
		 * Atributos de la cabecera que otros consumen: el ancla del tour de la demo en la etapa_1 y
		 * los de las pruebas e2e en la etapa_3 (data-testid, y data-abierta que dice si esta abierta).
		 *
		 * @returns {Object}
		 */
		atributos_de_la_cabecera() {
			if (this.id === 'etapa_1') {
				return { 'data-tour': 'vender.etapa_1' }
			}
			if (this.id === 'etapa_3') {
				return { 'data-testid': 'venta-etapa-3', 'data-abierta': this.se_ve_abierta ? 'si' : 'no' }
			}
			return {}
		},
	},
	watch: {
		/**
		 * Si el diseño cambia con Vender abierto (otro usuario puso otro en uso, o recien llego el
		 * store despues de dibujar con el predeterminado) y ahora esta seccion tiene un campo que
		 * agrega articulos o el resumen, se abre: tiene que estar a la vista. Al reves no se cierra
		 * sola, para no plegarle la seccion al vendedor mientras la usa.
		 *
		 * @param {boolean} se_mantiene
		 * @returns {void}
		 */
		se_mantiene_abierta(se_mantiene) {
			if (se_mantiene) {
				this.abierta = true
			}
		},
	},
	created() {
		this.abierta = this.estado_inicial_de_plegado()
	},
	mounted() {
		/*
			Pedido de foco a un campo (lapices de la barra de resumen, atajos de teclado, ganchos
			del tour de la demo en src/tours/ganchos.js): lo escuchan todas las secciones y actua
			la que tiene el campo.
		*/
		this.$root.$on(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)
	},
	beforeDestroy() {
		this.$root.$off(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)
	},
	methods: {
		/**
		 * Si la seccion arranca desplegada, segun su `plegado`:
		 * - 'no' (no se pliega): siempre;
		 * - 'si_hay_venta' (la etapa 1 de siempre): abierta en una venta nueva y plegada al volver
		 *   a Vender con una venta ya armada (items, cliente o editando una venta previa);
		 * - 'arranca_plegada' (la etapa 3 de siempre): plegada.
		 * En los dos ultimos, con un campo que agrega articulos o el resumen (se_mantiene_abierta),
		 * arranca abierta igual: el vendedor no puede escanear en una seccion plegada y el resumen
		 * es obligatorio justamente para que el total se vea.
		 *
		 * Antes se miraba vender.payment_method_id, propiedad que NO existe en el state; el metodo
		 * de pago tiene un valor por defecto desde que se entra al modulo, asi que NO se mira.
		 *
		 * @returns {boolean}
		 */
		estado_inicial_de_plegado() {
			if (!this.seccion.plegable || this.se_mantiene_abierta) {
				return true
			}

			if (this.seccion.plegado === 'arranca_plegada') {
				return false
			}

			const hay_venta_en_curso = !!(
				this.$store.state.vender.items.length
				|| this.$store.state.vender.client
				|| this.$store.getters['vender/previus_sales/editando_venta_previa']
			)
			return !hay_venta_en_curso
		},

		/**
		 * Alterna el estado abierto/plegado de la seccion (sólo la llaman las que se pliegan).
		 *
		 * @returns {void}
		 */
		alternar() {
			this.abierta = !this.abierta
		},

		/**
		 * Si el campo pedido esta en esta seccion y se esta mostrando: la abre, lo trae a la vista
		 * y lo enfoca. Si el campo no muestra nada (su v-if lo esconde), no abre la seccion por nada.
		 *
		 * 🔴 La alineacion depende de donde esta la seccion (bloque_de_foco_de_seccion): 'center' si
		 * esta debajo de la etapa 2 en su misma columna, porque cuando se scrollea hasta aca el
		 * bloque de la etapa 2 queda PEGADO arriba y con 'start' el campo quedaba debajo de el,
		 * tapado y con el foco adentro sin que se viera; si no, 'start' (la etapa 1 esta arriba de
		 * todo y el bloque pegado todavia no se pego). Una seccion de alto fijo scrollea por
		 * dentro, y scrollIntoView resuelve los dos scrolls solo.
		 *
		 * @param {string} key
		 * @param {Object} opciones
		 * @returns {void}
		 */
		al_pedir_el_foco_de_un_elemento(key, opciones) {
			if (!this.se_dibuja || !this.elemento_de_vender_listo_en_esta_etapa(key, this.id)) {
				return
			}

			this.abierta = true
			this.enfocar_elemento_de_vender_en_esta_etapa(key, opciones, this.bloque_de_foco_de_seccion(this.id))
		},
	},
}
</script>
