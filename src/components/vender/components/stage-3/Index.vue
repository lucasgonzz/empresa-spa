<template>
	<!--
		Etapa 3 — Cierre y opciones.
		Colapsada por defecto.

		Que campos tiene, en que orden y de que ancho lo decide el diseño de Vender en uso (mision
		diseno-vender-configurable, 28/9/2026): el cuerpo es una grilla (layout/GrillaDeEtapa.vue)
		y el subtitulo del header se arma con los campos que la grilla dibuja. Si el diseño no le
		deja ningun campo, la etapa no se dibuja.

		Index: orquesta el colapso y el foco; la logica de cada campo vive en su componente.

		La clase vender-stage--etapa-3 es la que le da el naranja de la etapa (ver
		_vender-stages.sass): antes salia de :nth-child(3), que deja de servir si la etapa 1 no se
		dibuja.
	-->
	<div
	v-if="se_dibuja"
	class="vender-stage vender-stage--etapa-3"
	:class="{ 'vender-stage--open': stage3_open }">

		<!-- Header de la etapa 3 -->
		<!--
			🔴 data-testid y data-abierta los usa abrir_etapa_3() de e2e/helpers/vender.js para
			desplegar la etapa antes de tocar un descuento. No se cambian.
		-->
		<div
		class="vender-stage__header"
		data-testid="venta-etapa-3"
		:data-abierta="stage3_open ? 'si' : 'no'"
		@click="toggleStage3">
			<span class="vender-stage__number">3</span>
			<div class="vender-stage__header-text">
				<span class="vender-stage__label">{{ titulo }}</span>
				<span class="vender-stage__sublabel">{{ subtitulo }}</span>
			</div>
			<i
			:class="stage3_open ? 'icon-up' : 'icon-down'"
			class="vender-stage__chevron"></i>
		</div>

		<!--
			Cuerpo colapsable. v-show y no v-if, a proposito: los campos existen en el DOM aunque la
			etapa este plegada (las pruebas y el foco de un atajo cuentan con eso).
		-->
		<transition name="stage-collapse">
			<div
			v-show="stage3_open"
			class="vender-stage__body vender-stage__body--grilla">
				<grilla-de-etapa
				etapa="etapa_3"
				:stage_open="stage3_open"></grilla-de-etapa>
			</div>
		</transition>
	</div>
</template>

<script>
import GrillaDeEtapa from '@/components/vender/layout/GrillaDeEtapa'
import { TITULOS_DE_ETAPAS } from '@/components/vender/layout/elementos'
import { subtitulo_de_etapa } from '@/components/vender/layout/resolver_diseno'
import diseno_de_vender, { EVENTO_ENFOCAR_ELEMENTO } from '@/mixins/vender/diseno_de_vender'

export default {
	name: 'VenderStage3',
	mixins: [diseno_de_vender],
	components: {
		GrillaDeEtapa,
	},
	data() {
		return {
			/* Estado de colapso: cerrada por defecto (se calcula en created) */
			stage3_open: false,
		}
	},
	computed: {
		/**
		 * Titulo de la etapa, el mismo que muestra el editor de diseños.
		 *
		 * @returns {string}
		 */
		titulo() {
			return TITULOS_DE_ETAPAS.etapa_3
		},

		/**
		 * Si la etapa se dibuja: el diseño en uso le deja al menos un campo disponible. La misma
		 * regla decide que le toca a la reserva (ReservaDeElementos.vue), asi que no se reemplaza
		 * por otra condicion aca.
		 *
		 * @returns {boolean}
		 */
		se_dibuja() {
			return this.grilla_de_vender_se_dibuja('etapa_3')
		},

		/**
		 * Si la etapa no puede arrancar plegada: el diseño en uso trajo hasta aca un campo que
		 * agrega articulos (el codigo de barras o un buscador) o el resumen de la venta, que es
		 * obligatorio justamente para que el total se vea.
		 *
		 * @returns {boolean}
		 */
		se_mantiene_abierta() {
			return this.etapa_de_vender_se_mantiene_abierta('etapa_3')
		},

		/**
		 * Subtitulo del header: los campos que se dibujan, "IVA, stock, observaciones... y N más".
		 *
		 * @returns {string}
		 */
		subtitulo() {
			return subtitulo_de_etapa(this.elementos_de_etapa_de_vender('etapa_3'))
		},
	},
	watch: {
		/**
		 * Si el diseño cambia con Vender abierto y ahora esta etapa tiene un campo que agrega
		 * articulos o el resumen, se abre (ver la etapa 1: al reves no se cierra sola).
		 *
		 * @param {boolean} se_mantiene
		 * @returns {void}
		 */
		se_mantiene_abierta(se_mantiene) {
			if (se_mantiene) {
				this.stage3_open = true
			}
		},
	},
	created() {
		/*
			Cerrada por defecto, como siempre, SALVO que el diseño en uso haya traido hasta aca un
			campo que agrega articulos (el vendedor no puede escanear en una etapa plegada) o el
			resumen de la venta (es obligatorio para que el total se vea: plegado no se veria).
		*/
		this.stage3_open = this.se_mantiene_abierta
	},
	mounted() {
		/* Pedido de foco a un campo: actua la etapa que lo tiene (ver diseno_de_vender.js) */
		this.$root.$on(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)
	},
	beforeDestroy() {
		this.$root.$off(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)
	},
	methods: {
		/**
		 * Alterna el estado abierto/cerrado de la etapa.
		 */
		toggleStage3() {
			this.stage3_open = !this.stage3_open
		},

		/**
		 * Si el campo pedido esta en esta etapa y se esta mostrando: la abre, lo trae a la vista y
		 * lo enfoca. Si el campo no muestra nada (su v-if lo esconde), no abre la etapa por nada.
		 *
		 * 🔴 `block: 'center'` y NO 'start': esta etapa esta debajo de la tabla, y cuando se scrollea
		 * hasta aca el bloque de la etapa 2 queda PEGADO arriba. Con 'start' el campo quedaba al
		 * tope del area... debajo del bloque pegado, tapado, y con el foco adentro sin que se viera.
		 * Centrado queda libre: el bloque solo se pega si ocupa menos de la mitad del area (ver
		 * MAXIMO_DEL_AREA en stage-2/Index.vue).
		 *
		 * @param {string} key
		 * @param {Object} opciones
		 * @returns {void}
		 */
		al_pedir_el_foco_de_un_elemento(key, opciones) {
			if (!this.elemento_de_vender_listo_en_esta_etapa(key, 'etapa_3')) {
				return
			}

			this.stage3_open = true
			this.enfocar_elemento_de_vender_en_esta_etapa(key, opciones, 'center')
		},
	},
}
</script>
