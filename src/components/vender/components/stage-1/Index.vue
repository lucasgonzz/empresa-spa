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
	v-if="tiene_elementos"
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

/*
	🔴 PUENTE TEMPORAL con el evento viejo `vender:expand-stage1`.

	Hasta esta mision la barra de resumen y los atajos F3/F4 abrian ESTA etapa con ese evento y una
	clave propia ('client', 'payment_method', 'address', 'price_type'). Esos dos emisores ya pasaron
	al evento nuevo (vender:enfocar-elemento, con la key del catalogo), pero queda uno que esta
	fuera del territorio de la mision y no se toco: src/tours/ganchos.js, los ganchos
	`abrir_etapa_1_*` del tour de la demo, que lo emiten ANTES de señalar el cliente, el metodo de
	pago, el punto de venta o la lista de precios. Sin este puente, con la etapa plegada el tour
	señalaria un recuadro vacio de 0x0.

	El puente traduce la clave vieja a la key del catalogo y la manda por el evento nuevo, asi que
	se abre la etapa que tenga ese campo en el diseño en uso (con el predeterminado, esta). Una clave
	que no esta en la tabla ('ninguno', el gancho que solo despliega la etapa) abre esta etapa, que
	es lo que hacia antes.

	Se borra el dia que ganchos.js emita vender:enfocar-elemento con las keys del catalogo.
*/
const EVENTO_VIEJO_DE_LA_ETAPA_1 = 'vender:expand-stage1'

/* Clave del evento viejo -> key del catalogo (layout/elementos.js) */
const KEYS_DEL_EVENTO_VIEJO = {
	client: 'cliente',
	payment_method: 'metodo_de_pago',
	address: 'sucursal',
	price_type: 'lista_de_precios',
}

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
		 * Si el diseño en uso deja al menos un campo en esta etapa. Si no, la etapa no se dibuja.
		 *
		 * @returns {boolean}
		 */
		tiene_elementos() {
			return this.etapa_de_vender_tiene_elementos('etapa_1')
		},

		/**
		 * Si el diseño en uso puso en esta etapa algun campo que agrega articulos (codigo de
		 * barras, buscador...). Con uno de esos adentro la etapa no puede estar plegada.
		 *
		 * @returns {boolean}
		 */
		tiene_entrada_de_articulos() {
			return this.etapa_de_vender_tiene_entrada_de_articulos('etapa_1')
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
		 * agrega articulos, se abre: tiene que estar a la vista. Al reves no se cierra sola, para
		 * no plegarle la etapa al vendedor mientras la usa.
		 *
		 * @param {boolean} tiene
		 * @returns {void}
		 */
		tiene_entrada_de_articulos(tiene) {
			if (tiene) {
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
			buscador...), arranca abierta siempre: el vendedor no puede escanear en una etapa
			plegada.
		*/
		const hay_venta_en_curso = !!(
			this.$store.state.vender.items.length
			|| this.$store.state.vender.client
			|| this.$store.getters['vender/previus_sales/editando_venta_previa']
		)
		this.stage1_open = !hay_venta_en_curso || this.tiene_entrada_de_articulos
	},
	mounted() {
		/*
			Pedido de foco a un campo (lapices de la barra de resumen, atajos de teclado): lo
			emite enfocar_elemento_de_vender() del mixin y lo escuchan las tres etapas; actua la
			que tiene el campo.
		*/
		this.$root.$on(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)
		this.$root.$on(EVENTO_VIEJO_DE_LA_ETAPA_1, this.al_recibir_el_evento_viejo)
	},
	beforeDestroy() {
		this.$root.$off(EVENTO_ENFOCAR_ELEMENTO, this.al_pedir_el_foco_de_un_elemento)
		this.$root.$off(EVENTO_VIEJO_DE_LA_ETAPA_1, this.al_recibir_el_evento_viejo)
	},
	methods: {
		/**
		 * Alterna el estado abierto/cerrado de la etapa.
		 */
		toggleStage1() {
			this.stage1_open = !this.stage1_open
		},

		/**
		 * Si el campo pedido esta en esta etapa: la abre, lo trae a la vista y lo enfoca.
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
			if (!this.elemento_de_vender_esta_en_la_etapa(key, 'etapa_1')) {
				return
			}

			this.stage1_open = true
			this.enfocar_elemento_de_vender_en_esta_etapa(key, opciones, 'start')
		},

		/**
		 * Puente con el evento viejo (ver el comentario de KEYS_DEL_EVENTO_VIEJO).
		 *
		 * @param {string} clave 'client' | 'payment_method' | 'address' | 'price_type' | otra
		 * @returns {void}
		 */
		al_recibir_el_evento_viejo(clave) {
			let key = KEYS_DEL_EVENTO_VIEJO[clave]

			if (key && this.elemento_de_vender_esta_visible(key)) {
				this.$root.$emit(EVENTO_ENFOCAR_ELEMENTO, key, {})
				return
			}

			this.stage1_open = true
		},
	},
}
</script>
