<template>
	<!--
		Grilla de una etapa de Vender (mision diseno-vender-configurable, 28/9/2026).

		Dibuja los campos que el diseño en uso ubica en esta etapa, en su orden y con su ancho, en
		la grilla de 12 columnas de Bootstrap: cada item es `col-12 col-md-N`, o sea que el ancho
		elegido rige desde 768px y en un telefono todo va a lo ancho (como los buscadores de la
		etapa 2 de antes). Que campos, en que orden y de que ancho lo decide el mixin
		mixins/vender/diseno_de_vender.js; que componente dibuja cada uno, layout/componentes.js.

		🔴 Monta TODOS los campos ubicados en la etapa, esten disponibles o no para este negocio
		(items_de_la_grilla_de_vender del mixin). Antes de los diseños cada componente estaba
		siempre montado y se escondia solo con su v-if, y varios hacen cosas al montarse aunque no
		se vean (Moneda.vue carga la cotizacion del dolar del dueño): si la grilla montara solo los
		disponibles, eso se perderia. Lo que no monta ninguna grilla lo monta ReservaDeElementos.vue.

		`data-vender-elemento` en cada item es por donde las etapas encuentran un campo para
		enfocarlo (evento vender:enfocar-elemento) sin conocer su componente.

		🔴 ENTRE EL <div> DEL ITEM Y SU COMPONENTE NO PUEDE QUEDAR NINGUN NODO DE TEXTO.

		Un campo cuyo componente no dibuja nada (un v-if falso en su raiz: la caja con el pago
		repartido, los interruptores del cliente sin cliente, la cantidad sin "pedir cantidad al
		vender", cualquier campo de una extension apagada) tiene que desaparecer, no dejar un hueco
		de N columnas con su margen. Lo hace la regla `.vender-grilla__item:empty { display: none }`
		de abajo: lo que deja en el DOM un v-if falso (o un componente asincrono que todavia no
		llego) es un comentario HTML vacio, y los comentarios no cuentan para :empty. Un espacio SI
		cuenta: con un solo nodo de texto el item deja de estar vacio y el hueco vuelve, sin ningun
		error.

		Hoy no queda ninguno, y no por casualidad. El compilador de plantillas (el de vue 2.7, que es
		el que usa vue-loader 15.10 con vue 2.7) descarta siempre el espacio que sigue a una etiqueta
		de apertura y el que precede a un cierre, y el que queda entre el <hr v-if> y el
		<component v-else-if> lo saca el propio v-else-if. Encima Vue CLI 4.5 lo configura con
		`whitespace: 'condense'` (node_modules/@vue/cli-service/lib/config/base.js; vue.config.js
		solo le agrega transformAssetUrls y conserva el resto), que borra cualquier espacio con salto
		de linea entre dos etiquetas. Verificado el 28/9/2026 compilando esta plantilla con
		vue/compiler-sfc: con 'condense', y tambien con 'preserve', el item sale con un unico hijo
		(el hr o el componente). Lo que SI lo rompe es agregar adentro del item un hermano o texto
		suelto (un icono, un espacio entre dos etiquetas en la misma linea): se verifica ocultando un
		campo (la caja con el pago repartido en varios metodos) y mirando que no quede un hueco.

		El salto de fila NO lleva la clase vender-grilla__item, a proposito: es un div sin contenido
		que ocupa el 100% de la fila con alto 0, y con esa clase la regla :empty lo esconderia y
		dejaria de cortar la fila (ver el estilo de abajo).

		El v-if="user" es el que tenia remito/header-form/Index.vue sobre los buscadores: varios
		componentes leen `user.` en su plantilla sin guarda (Amount.vue, por ejemplo) y al cerrar
		sesion con Vender abierto el usuario pasa a null antes de que cambie la ruta. La reserva
		lleva el mismo, asi las dos montan lo mismo en el mismo momento.
	-->
	<div
	v-if="user"
	class="vender-grilla">
		<div
		v-for="item in items"
		:key="clave_del_item(item)"
		:class="clases_del_item(item)"
		:data-vender-elemento="item.key">
			<hr
			v-if="es_separador(item)"
			class="vender-grilla__separador">
			<component
			v-else-if="!es_marcador_del_item(item)"
			:is="componente_del_item(item)"
			v-bind="atributos_del_item(item)"></component>
		</div>
	</div>
</template>

<script>
import {
	KEY_SEPARADOR,
	KEY_SALTO_DE_FILA,
	es_marcador,
	esta_disponible,
	acotar_cols,
} from './elementos'
import { componente_de_elemento } from './componentes'
import diseno_de_vender from '@/mixins/vender/diseno_de_vender'

export default {
	name: 'GrillaDeEtapa',
	mixins: [diseno_de_vender],
	props: {
		/**
		 * Que etapa dibuja: 'etapa_1' | 'etapa_2' | 'etapa_3'.
		 */
		etapa: {
			type: String,
			required: true,
		},

		/**
		 * Si la etapa esta abierta. Se lo pasa a los campos que tienen que volver a medirse al
		 * abrirse (las observaciones: un textarea plegado con v-show mide 0).
		 */
		stage_open: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		/**
		 * Los items de esta etapa que se montan, en orden: todos los campos ubicados (disponibles o
		 * no) y los marcadores que sobreviven a la limpieza. Con el tope de items por venta
		 * alcanzado quedan afuera los campos que agregan articulos, esten en la etapa que esten
		 * (antes lo hacia remito/header-form/Index.vue con toda la fila de buscadores); el aviso lo
		 * muestra la etapa 2. Ver items_de_la_grilla_de_vender() del mixin.
		 *
		 * @returns {Array}
		 */
		items() {
			return this.items_de_la_grilla_de_vender(this.etapa).filter(function (item) {
				if (es_marcador(item.key) || componente_de_elemento(item.key)) {
					return true
				}
				console.log('diseño de vender: el elemento ' + item.key + ' no tiene componente en layout/componentes.js')
				return false
			})
		},

		/**
		 * Key del primer campo DISPONIBLE de la grilla, o null. Los no disponibles se montan pero no
		 * dibujan nada, asi que para saber cual se ve primero hay que saltearlos.
		 *
		 * @returns {string|null}
		 */
		key_del_primer_campo_disponible() {
			let self = this
			let key = null
			this.items.forEach(function (item) {
				if (key === null && !es_marcador(item.key) && esta_disponible(item.key, self)) {
					key = item.key
				}
			})
			return key
		},
	},
	methods: {
		/**
		 * @param {Object} item
		 * @returns {boolean}
		 */
		es_separador(item) {
			return item.key === KEY_SEPARADOR
		},

		/**
		 * @param {Object} item
		 * @returns {boolean}
		 */
		es_salto_de_fila(item) {
			return item.key === KEY_SALTO_DE_FILA
		},

		/**
		 * Si el item es un marcador (separador o salto de fila) y no un campo.
		 *
		 * @param {Object} item
		 * @returns {boolean}
		 */
		es_marcador_del_item(item) {
			return es_marcador(item.key)
		},

		/**
		 * Clave estable del item para el v-for: la key del elemento (aparece una sola vez en el
		 * diseño) o key + id del marcador (puede haber varios). Estable es lo que importa: si el
		 * diseño cambia con Vender abierto, un campo que se mueve conserva lo que tenia tipeado.
		 *
		 * @param {Object} item
		 * @returns {string}
		 */
		clave_del_item(item) {
			return es_marcador(item.key) ? item.key + ':' + item.id : item.key
		},

		/**
		 * Clases del item. Un separador va siempre a lo ancho; el salto de fila lleva solo su clase
		 * (ni la del item, por el :empty, ni las col-* de Bootstrap, que le pondrian padding).
		 *
		 * @param {Object} item
		 * @returns {Array<string>}
		 */
		clases_del_item(item) {
			if (this.es_salto_de_fila(item)) {
				return ['vender-grilla__salto-de-fila']
			}

			let cols = es_marcador(item.key) ? 12 : acotar_cols(item.cols, 12)
			let clases = ['vender-grilla__item', 'col-12', 'col-md-' + cols]

			if (this.es_separador(item)) {
				clases.push('vender-grilla__item--separador')
			}

			if (this.es_resumen_a_lo_ancho(item, cols)) {
				clases.push('vender-grilla__item--resumen-a-lo-ancho')
			}

			return clases
		},

		/**
		 * El resumen (ContextBar.vue) en su lugar de siempre: primer campo disponible de la etapa 2
		 * y a lo ancho.
		 *
		 * Ahi se dibuja como franja pegada al header y de borde a borde de la tarjeta, que es como
		 * se vio siempre: ContextBar trae margenes negativos (-8px -14px) que asumen exactamente el
		 * padding del cuerpo de la etapa 2. En cualquier otro lugar esos margenes lo harian
		 * pisar a sus vecinos, asi que se dibuja como una tarjeta contenida (ver el estilo de abajo).
		 *
		 * "Primero" cuenta solo los campos disponibles: uno de una extension apagada ubicado antes se
		 * monta pero no se ve, y no le puede quitar el lugar.
		 *
		 * @param {Object} item
		 * @param {number} cols
		 * @returns {boolean}
		 */
		es_resumen_a_lo_ancho(item, cols) {
			return item.key === 'resumen'
				&& this.etapa === 'etapa_2'
				&& cols === 12
				&& this.key_del_primer_campo_disponible === 'resumen'
		},

		/**
		 * La fabrica del componente del item (declarada a nivel de modulo en componentes.js).
		 *
		 * @param {Object} item
		 * @returns {Function|null}
		 */
		componente_del_item(item) {
			return componente_de_elemento(item.key)
		},

		/**
		 * Props y atributos que cada campo recibia del Index de su etapa antes de los diseños, y
		 * que no se pueden perder. Los que caen como atributo (data-tour) van a la raiz del
		 * componente, igual que antes.
		 *
		 * @param {Object} item
		 * @returns {Object}
		 */
		atributos_del_item(item) {
			if (item.key === 'sucursal') {
				/*
					Tal cual lo pasaba stage-1/Index.vue: `<select-address show-help>`.

					⚠️ OJO: este atributo NO prende la ayuda. El prop de Address.vue se llama
					`show_help` (guion bajo) y Vue solo empareja `show-help` con `showHelp`, asi que
					cae como atributo HTML suelto y el icono de ayuda nunca se dibujo (desde el commit
					578cffd1 que lo agrego). Se deja igual a proposito: prender la ayuda cambia lo que
					ve cada cliente y no es parte de esta mision. Queda anotado en el informe.
				*/
				return { 'show-help': '' }
			}

			if (item.key === 'cliente') {
				return { 'data-tour': 'vender.selector_cliente' }
			}

			if (item.key === 'buscador_de_articulos') {
				/*
					🔴 Esta ancla del tour de la demo cambio de lugar con esta mision: antes estaba
					sobre <header-form>, o sea sobre TODA la fila de buscadores (codigo de barras,
					nombre, combos, promociones, servicio y cantidad). Esa fila ya no existe: cada
					buscador es un campo del diseño y puede estar en otra etapa. Queda sobre el
					buscador por nombre, que es lo que el nombre del ancla dice.
				*/
				return { 'data-tour': 'vender.buscador_articulos' }
			}

			if (item.key === 'observaciones' || item.key === 'observaciones_ocultas') {
				return { stage_open: this.stage_open }
			}

			return {}
		},
	},
}
</script>

<style lang="sass">
/* Fila de la grilla: el gutter es de 16px (8px por lado) en vez de los 30px de .row de Bootstrap, */
/* el mismo aire horizontal que tenian los campos de las etapas antes de los diseños (gap 16px). */
.vender-grilla
	display: flex
	flex-wrap: wrap
	margin: 0 -8px

/* Selector de DOS clases a proposito: .col-12 y .col-md-N de Bootstrap ponen padding de 15px con */
/* una sola clase, y con la misma especificidad ganaria el que se cargue ultimo. El margen de */
/* abajo es el aire vertical entre filas (el gap de 10px de antes); el ultimo lo absorbe el padding */
/* inferior del cuerpo de cada etapa (ver _vender-stages.sass). */
.vender-grilla > .vender-grilla__item
	padding: 0 8px
	margin-bottom: 10px

	/* Un campo que no dibuja nada no ocupa lugar. Ver en la plantilla por que no puede haber */
	/* texto entre el item y su componente. */
	&:empty
		display: none

/* Salto de fila: un item invisible que ocupa la fila entera con alto 0, asi lo que sigue arranca */
/* en una fila nueva aunque en la anterior quedara lugar. Sin la clase vender-grilla__item (el */
/* :empty de arriba lo esconderia y dejaria de cortar la fila) y sin margen ni padding, para que */
/* no agregue aire: el de la fila de arriba ya lo pone el margen de sus items. */
.vender-grilla > .vender-grilla__salto-de-fila
	flex: 0 0 100%
	max-width: 100%
	height: 0
	margin: 0
	padding: 0

/* Linea horizontal a lo ancho (el <hr> que tenian las etapas 1 y 3 antes de los campos del */
/* cliente y de los descuentos). Con los 10px del item de arriba y los del suyo queda el mismo */
/* aire de siempre alrededor de la linea. */
.vender-grilla > .vender-grilla__item > .vender-grilla__separador
	margin: 12px 0
	border-color: var(--color-border-tertiary)

/* Descuentos y recargos lado a lado quedan del mismo alto, como en la grilla de dos columnas de */
/* antes: el item se estira al alto de la fila y el panel (height 100% en su caja) lo sigue. */
.vender-grilla > .vender-grilla__item > .vender-rate-panel
	height: 100%

/* El resumen en su lugar de siempre (ver es_resumen_a_lo_ancho): se deja el estilo propio de */
/* ContextBar.vue, franja a sangre pegada al header, y solo se le saca el margen de abajo, que */
/* ahora lo pone el item. Tres clases para ganarle al estilo scoped del componente (dos). */
.vender-grilla > .vender-grilla__item--resumen-a-lo-ancho > .vender-context-bar
	margin-bottom: 0

/* El resumen en cualquier otro lugar (otra etapa, no primero, mas angosto): tarjeta contenida. */
/* Sin esto los margenes negativos de ContextBar.vue lo harian pisar a los campos de al lado. */
.vender-grilla > .vender-grilla__item:not(.vender-grilla__item--resumen-a-lo-ancho) > .vender-context-bar
	margin: 0
	border: 1px solid var(--color-border-tertiary)
	border-radius: 6px
</style>
