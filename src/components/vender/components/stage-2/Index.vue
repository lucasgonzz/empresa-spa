<template>
	<!--
		Etapa 2 — Artículos y servicios.
		Siempre expandida, no colapsable.
		Index: orquesta el layout fijo; la lógica vive en cada subcomponente.

		Los campos del bloque pegado (el resumen de la venta y los buscadores) los decide el diseño
		de Vender en uso (mision diseno-vender-configurable, 28/9/2026), igual que en las etapas 1 y
		3: se dibujan con layout/GrillaDeEtapa.vue. Lo fijo de esta etapa es lo que scrollea debajo
		(las ventas anteriores vinculadas y la tabla de articulos), que ningun diseño toca.

		La clase vender-stage--etapa-2 es la que le da el verde de la etapa (ver _vender-stages.sass).
	-->
	<div class="vender-stage vender-stage--etapa-2 vender-stage--open vender-stage--no-collapse">

		<!--
			Bloque pegado (sticky): header + total + buscador de artículos.
			Queda visible arriba durante TODO el scroll -- tambien cuando entra la etapa 3 --,
			respetando el mismo margen que esta etapa tiene con la anterior. Lo que lo hace
			posible es que la tarjeta no genere caja: ver .vender-stage--no-collapse en el sass.
		-->
		<div
		class="vender-stage__pinned"
		:class="{ 'vender-stage__pinned--pegado': pegado && !sin_espacio, 'vender-stage__pinned--suelto': sin_espacio }"
		ref="pinned">

			<!-- Header informativo (sin toggle) -->
			<div class="vender-stage__header vender-stage__header--no-collapse">
				<span class="vender-stage__number">2</span>
				<div class="vender-stage__header-text">
					<span class="vender-stage__label">Artículos y servicios</span>
					<span class="vender-stage__sublabel">Buscar artículos, servicios, combos y promociones</span>
				</div>
			</div>

			<!--
				Los campos que el diseño pone en esta etapa: con el predeterminado, el resumen de la
				venta (total, cliente, metodo de pago y vuelto) a lo ancho y abajo los buscadores
				(codigo de barras, nombre, combos, promociones, servicio y cantidad), que es lo que
				habia antes de los diseños. El ancla vender.buscador_articulos del tour ya no esta
				aca sino sobre el buscador por nombre (ver GrillaDeEtapa.vue).

				Sin campos ni aviso (un diseño que se llevo todo a otras etapas) el cuerpo no se
				dibuja: quedaria una franja vacia debajo del header.
			-->
			<div
			v-if="tiene_elementos || tope_de_items_de_vender_alcanzado"
			class="vender-stage__body vender-stage__body--always-open vender-stage__body--pinned">

				<grilla-de-etapa
				etapa="etapa_2"
				:stage_open="true"></grilla-de-etapa>

				<!--
					Tope de items por venta (owner.max_items_in_sale) alcanzado: la grilla esconde los
					campos que agregan articulos, esten en la etapa que esten, y aca se explica por
					que. Mismo texto que mostraba remito/header-form/Index.vue en lugar de la fila de
					buscadores.
				-->
				<div
				v-if="tope_de_items_de_vender_alcanzado"
				class="vender-stage__tope-de-items">
					<p>
						Limite de Items en una venta alcanzado.
					</p>
					<p>
						Guarde esta venta para comenzar una nueva.
					</p>
				</div>

			</div>
		</div>

		<!-- Body que sigue scrolleando debajo del bloque pegado -->
		<div class="vender-stage__body vender-stage__body--always-open vender-stage__body--scroll">

			<!-- Indicador de ventas anteriores vinculadas -->
			<previus-sale-data></previus-sale-data>

			<!-- Tabla de artículos agregados -->
			<articles-table data-tour="vender.lista_articulos"></articles-table>

		</div>
	</div>
</template>

<script>
import PreviusSaleData from '@/components/vender/components/remito/PreviusSaleData.vue'
import ArticlesTable from '@/components/vender/components/remito/ArticlesTable.vue'
import GrillaDeEtapa from '@/components/vender/layout/GrillaDeEtapa'
import diseno_de_vender, { EVENTO_ENFOCAR_ELEMENTO } from '@/mixins/vender/diseno_de_vender'

/*
	Mismo valor que $vender_stage_gap en _vender-stages.sass: la distancia, en pixeles desde el borde
	del area que scrollea, a la que el bloque queda pegado. Si se cambia alla, se cambia aca.
*/
const GAP_ENTRE_ETAPAS = 18

/*
	Fraccion del area que scrollea que el bloque pegado puede ocupar como maximo. Pasada esa marca
	deja de pegarse: en un telefono los cuatro buscadores se apilan y el bloque llega a los 396px
	sobre un area de 561px (medido a 375px de ancho), o sea que fijarlo tapa el 70% de lo que se
	quiere mirar. Va por proporcion y no por un breakpoint de dispositivo porque lo que decide es
	cuanto lugar queda, y eso tambien cambia con lo que muestre la barra de contexto.
*/
const MAXIMO_DEL_AREA = 0.5

export default {
	name: 'VenderStage2',
	mixins: [diseno_de_vender],
	components: {
		/* El resumen (ContextBar) y los buscadores los dibuja la grilla, segun el diseño en uso */
		GrillaDeEtapa,
		PreviusSaleData,
		ArticlesTable,
	},
	computed: {
		/**
		 * Si el diseño en uso deja algun campo en esta etapa (con el predeterminado, siempre: el
		 * resumen es obligatorio y vive aca, salvo que alguien lo mueva).
		 *
		 * @returns {boolean}
		 */
		tiene_elementos() {
			return this.etapa_de_vender_tiene_elementos('etapa_2')
		},
	},
	data() {
		return {
			/* true mientras el bloque de arriba esta efectivamente pegado al borde del scroll. */
			/* No hay selector CSS que distinga un sticky pegado de uno en reposo, y la diferencia */
			/* importa: la sombra solo tiene sentido cuando flota sobre el contenido. */
			pegado: false,
			/* true cuando el bloque es tan alto que fijarlo no dejaria lugar para la tabla. */
			sin_espacio: false,
			/* Contenedor que scrollea (.vender-stages). Se guarda para poder sacarle el listener. */
			contenedor: null,
			/* Evita medir mas de una vez por cuadro mientras el usuario scrollea. */
			medicion_pedida: false,
			observador_de_medidas: null,
		}
	},
	mounted() {
		/*
			Pedido de foco a un campo (atajos F1/F2 a los buscadores, o cualquier campo que el diseño
			haya puesto en esta etapa). Va antes del return de abajo: no depende del contenedor.
		*/
		this.$root.$on(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)

		this.contenedor = this.$el.parentElement

		if (!this.contenedor) {
			return
		}

		this.contenedor.addEventListener('scroll', this.pedir_medicion, { passive: true })

		/*
			El alto del bloque y el del area que scrollea cambian los dos con el ancho de pantalla
			(los buscadores se apilan, la barra de contexto envuelve), asi que la proporcion entre
			ellos se vuelve a medir con ResizeObserver y no una sola vez al montar.
		*/
		if (typeof ResizeObserver !== 'undefined') {
			this.observador_de_medidas = new ResizeObserver(this.medir_espacio)
			this.observador_de_medidas.observe(this.$refs.pinned)
			this.observador_de_medidas.observe(this.contenedor)
		}

		this.medir_espacio()
		this.medir_pegado()
	},
	beforeDestroy() {
		this.$root.$off(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)

		if (this.contenedor) {
			this.contenedor.removeEventListener('scroll', this.pedir_medicion)
		}

		if (this.observador_de_medidas) {
			this.observador_de_medidas.disconnect()
			this.observador_de_medidas = null
		}
	},
	methods: {
		/**
		 * Si el campo pedido esta en esta etapa, lo trae a la vista y lo enfoca. No hay nada que
		 * abrir: la etapa 2 no se pliega.
		 *
		 * `block: 'nearest'` y no 'start': los campos de esta etapa viven en el bloque pegado, que
		 * casi siempre ya esta a la vista, y con 'nearest' el scroll no se mueve si no hace falta
		 * (F1/F2 enfocaban el buscador sin mover nada, y asi siguen). Solo scrollea cuando el
		 * bloque quedo fuera de vista, que pasa en un telefono, donde no se pega (sin_espacio).
		 *
		 * @param {string} key
		 * @param {Object} opciones
		 * @returns {void}
		 */
		al_pedir_el_foco_de_un_elemento(key, opciones) {
			if (!this.elemento_de_vender_esta_en_la_etapa(key, 'etapa_2')) {
				return
			}

			this.enfocar_elemento_de_vender_en_esta_etapa(key, opciones, 'nearest')
		},

		/* Decide si el bloque tiene derecho a pegarse, mirando cuanto del area ocuparia. */
		medir_espacio() {
			if (!this.contenedor || !this.$refs.pinned) {
				return
			}

			let alto_del_area = this.contenedor.clientHeight

			if (!alto_del_area) {
				return
			}

			/* offsetHeight y no el rect: con la clase --suelto puesta el bloque sigue midiendo lo */
			/* mismo, asi que la medicion no depende de la decision anterior y no oscila. */
			this.sin_espacio = this.$refs.pinned.offsetHeight > alto_del_area * MAXIMO_DEL_AREA
		},

		/* Agenda una medicion para el proximo cuadro, en vez de medir en cada evento de scroll. */
		pedir_medicion() {
			if (this.medicion_pedida) {
				return
			}

			this.medicion_pedida = true

			let self = this

			window.requestAnimationFrame(function() {
				self.medicion_pedida = false
				self.medir_pegado()
			})
		},

		/*
			Esta pegado cuando su borde superior llego al tope del area de scroll. Se compara contra
			el borde del contenedor con un pixel de tolerancia: el sticky se posiciona con decimales
			y una comparacion exacta parpadea.
		*/
		medir_pegado() {
			if (!this.contenedor || !this.$refs.pinned) {
				return
			}

			let tope_del_bloque = this.$refs.pinned.getBoundingClientRect().top
			let tope_del_contenedor = this.contenedor.getBoundingClientRect().top

			this.pegado = tope_del_bloque - tope_del_contenedor < GAP_ENTRE_ETAPAS + 1
		},
	},
}
</script>
