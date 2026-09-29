<template>
	<!--
		Etapa 1 — Configuración inicial.

		Que campos tiene, en que orden y de que ancho lo decide el diseño de Vender en uso (mision
		diseno-vender-configurable, 28/9/2026): el cuerpo es una grilla (layout/GrillaDeEtapa.vue)
		y el subtitulo del header se arma con los campos que la grilla dibuja. Si el diseño no le
		deja ningun campo, la etapa no se dibuja.

		Index: orquesta el colapso y el foco; la logica de cada campo vive en su componente.
	-->
	<!--
		🔴 La clase vender-stage--etapa-1 es la que le da el color azul de la etapa (ver
		_vender-stages.sass). Antes el color salia de :nth-child(1), que dejo de servir cuando una
		etapa sin campos dejo de dibujarse: la etapa 2 pasaba a ser la primera y se teñia de azul.
	-->
	<div
	v-if="se_dibuja"
	class="vender-stage vender-stage--etapa-1"
	:class="{ 'vender-stage--open': stage1_open }">

		<!-- Header de la etapa 1 -->
		<!--
			El ancla va en el header y no en el contenedor: es la franja clickeable que abre y
			cierra la etapa, y es lo unico que se ve cuando la etapa esta colapsada (que es como
			queda apenas la venta tiene items, cliente o esta en edicion).
		-->
		<div
		class="vender-stage__header"
		data-tour="vender.etapa_1"
		@click="toggleStage1">
			<span class="vender-stage__number">1</span>
			<div class="vender-stage__header-text">
				<span class="vender-stage__label">{{ titulo }}</span>
				<span class="vender-stage__sublabel">{{ subtitulo }}</span>
			</div>
			<i
			:class="stage1_open ? 'icon-up' : 'icon-down'"
			class="vender-stage__chevron"></i>
		</div>

		<!--
			Cuerpo colapsable. v-show y no v-if, a proposito: los campos tienen que existir aunque la
			etapa este plegada (el foco de un atajo, las pruebas que esperan el control en el DOM, y
			los defaults que algunos campos aplican al montarse).
		-->
		<transition name="stage-collapse">
			<div
			v-show="stage1_open"
			class="vender-stage__body vender-stage__body--grilla">
				<grilla-de-etapa
				etapa="etapa_1"
				:stage_open="stage1_open"></grilla-de-etapa>
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
	name: 'VenderStage1',
	mixins: [diseno_de_vender],
	components: {
		GrillaDeEtapa,
	},
	data() {
		return {
			/* Estado de colapso: abierta si no hay datos previos (se calcula en created) */
			stage1_open: true,
		}
	},
	computed: {
		/**
		 * Titulo de la etapa, el mismo que muestra el editor de diseños.
		 *
		 * @returns {string}
		 */
		titulo() {
			return TITULOS_DE_ETAPAS.etapa_1
		},

		/**
		 * Si la etapa se dibuja: el diseño en uso le deja al menos un campo disponible. La misma
		 * regla decide que le toca a la reserva (ReservaDeElementos.vue), asi que no se reemplaza
		 * por otra condicion aca.
		 *
		 * @returns {boolean}
		 */
		se_dibuja() {
			return this.grilla_de_vender_se_dibuja('etapa_1')
		},

		/**
		 * Si la etapa no puede estar plegada: el diseño en uso puso aca un campo que agrega
		 * articulos (codigo de barras, buscador...) o el resumen de la venta, donde se ve el total.
		 *
		 * @returns {boolean}
		 */
		se_mantiene_abierta() {
			return this.etapa_de_vender_se_mantiene_abierta('etapa_1')
		},

		/**
		 * Subtitulo del header: los campos que se dibujan, "Facturación, método de pago, ... y N más".
		 *
		 * @returns {string}
		 */
		subtitulo() {
			return subtitulo_de_etapa(this.elementos_de_etapa_de_vender('etapa_1'))
		},
	},
	watch: {
		/**
		 * Si el diseño cambia con Vender abierto (otro usuario puso otro en uso, o recien llego el
		 * store despues de dibujar con el predeterminado) y ahora esta etapa tiene un campo que
		 * agrega articulos o el resumen, se abre: tiene que estar a la vista. Al reves no se cierra
		 * sola, para no plegarle la etapa al vendedor mientras la usa.
		 *
		 * @param {boolean} se_mantiene
		 * @returns {void}
		 */
		se_mantiene_abierta(se_mantiene) {
			if (se_mantiene) {
				this.stage1_open = true
			}
		},
	},
	created() {
		/*
			Colapsar si ya hay una venta en curso: arranca abierta en una venta nueva vacia
			y colapsada al volver al modulo con una venta ya armada.

			Antes se miraba vender.payment_method_id, propiedad que NO existe en el state
			(la real se llama current_acount_payment_method_id), asi que ese termino nunca
			evaluaba nada. Ojo: NO alcanza con corregirle el nombre — el metodo de pago
			tiene un valor por defecto desde que se entra al modulo, asi que la etapa
			quedaria colapsada practicamente siempre.

			Y con un diseño que ponga aca un campo de entrada de articulos (codigo de barras,
			buscador...) o el resumen de la venta, arranca abierta siempre: el vendedor no puede
			escanear en una etapa plegada, y el resumen es obligatorio justamente para que el total
			se vea.
		*/
		const hay_venta_en_curso = !!(
			this.$store.state.vender.items.length
			|| this.$store.state.vender.client
			|| this.$store.getters['vender/previus_sales/editando_venta_previa']
		)
		this.stage1_open = !hay_venta_en_curso || this.se_mantiene_abierta
	},
	mounted() {
		/*
			Pedido de foco a un campo (lapices de la barra de resumen, atajos de teclado, ganchos
			del tour de la demo en src/tours/ganchos.js): lo escuchan las tres etapas y actua la
			que tiene el campo.
		*/
		this.$root.$on(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)
	},
	beforeDestroy() {
		this.$root.$off(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)
	},
	methods: {
		/**
		 * Alterna el estado abierto/cerrado de la etapa.
		 */
		toggleStage1() {
			this.stage1_open = !this.stage1_open
		},

		/**
		 * Si el campo pedido esta en esta etapa y se esta mostrando: la abre, lo trae a la vista y
		 * lo enfoca. Si el campo no muestra nada (su v-if lo esconde), no abre la etapa por nada.
		 *
		 * `block: 'start'` como siempre: esta etapa esta arriba de todo, y cuando un campo suyo
		 * queda al tope del area que scrollea, el bloque pegado de la etapa 2 (que viene despues)
		 * todavia no se pego, asi que no lo tapa.
		 *
		 * @param {string} key
		 * @param {Object} opciones
		 * @returns {void}
		 */
		al_pedir_el_foco_de_un_elemento(key, opciones) {
			if (!this.elemento_de_vender_listo_en_esta_etapa(key, 'etapa_1')) {
				return
			}

			this.stage1_open = true
			this.enfocar_elemento_de_vender_en_esta_etapa(key, opciones, 'start')
		},
	},
}
</script>
