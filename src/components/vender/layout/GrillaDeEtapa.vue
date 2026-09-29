<template>
	<!--
		Grilla de una etapa de Vender (mision diseno-vender-configurable, 28/9/2026).

		Dibuja los campos que el diseño en uso ubica en esta etapa, en su orden y con su ancho, en
		la grilla de 12 columnas de Bootstrap: cada item es `col-12 col-md-N`, o sea que el ancho
		elegido rige desde 768px y en un telefono todo va a lo ancho (como los buscadores de la
		etapa 2 de antes). Que campos, en que orden y de que ancho lo decide el mixin
		mixins/vender/diseno_de_vender.js; que componente dibuja cada uno, layout/componentes.js.

		`data-vender-elemento` en cada item es por donde las etapas encuentran un campo para
		enfocarlo (evento vender:enfocar-elemento) sin conocer su componente.

		🔴 ENTRE EL <div> DEL ITEM Y SU COMPONENTE NO PUEDE QUEDAR NINGUN NODO DE TEXTO.

		Un campo cuyo componente no dibuja nada (un v-if falso en su raiz: la caja con el pago
		repartido, los interruptores del cliente sin cliente, la cantidad sin "pedir cantidad al
		vender") tiene que desaparecer, no dejar un hueco de N columnas con su margen. Lo hace la
		regla `.vender-grilla__item:empty { display: none }` de abajo: lo que deja en el DOM un
		v-if falso (o un componente asincrono que todavia no llego) es un comentario HTML vacio, y
		los comentarios no cuentan para :empty. Un espacio SI cuenta: con un solo nodo de texto el item
		deja de estar vacio y el hueco vuelve, sin ningun error.

		Hoy no queda ninguno, y no por casualidad: el compilador de plantillas (el de vue 2.7, que
		es el que usa vue-loader 15.10 con vue 2.7) descarta siempre el espacio que sigue a una
		etiqueta de apertura y el que precede a un cierre, y Vue CLI 4.5 lo configura con
		`whitespace: 'condense'` (node_modules/@vue/cli-service/lib/config/base.js; vue.config.js
		solo le agrega transformAssetUrls y conserva el resto), que borra el espacio con salto de
		linea entre dos etiquetas; el que queda entre el <hr v-if> y el <component v-else> ademas lo
		saca el propio v-else. Si alguien pasa el proyecto a `whitespace: 'preserve'` o mete texto
		suelto adentro del item, esto se rompe en silencio: se verifica ocultando un campo (la caja
		con el pago repartido en varios metodos) y mirando que no quede un hueco.

		El v-if="user" es el que tenia remito/header-form/Index.vue sobre los buscadores: varios
		componentes leen `user.` en su plantilla sin guarda (Amount.vue, por ejemplo) y al cerrar
		sesion con Vender abierto el usuario pasa a null antes de que cambie la ruta.
	-->
	<div
	v-if="user"
	class="vender-grilla">
		<div
		v-for="(item, indice) in items"
		:key="clave_del_item(item)"
		:class="clases_del_item(item, indice)"
		:data-vender-elemento="item.key">
			<hr
			v-if="es_separador(item)"
			class="vender-grilla__separador">
			<component
			v-else
			:is="componente_del_item(item)"
			v-bind="atributos_del_item(item)"></component>
		</div>
	</div>
</template>

<script>
import { KEY_SEPARADOR, acotar_cols, es_entrada_de_articulos } from './elementos'
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
		 * Los items de esta etapa que se dibujan, en orden.
		 *
		 * Con el tope de items por venta alcanzado se esconden los elementos que agregan articulos,
		 * esten en la etapa que esten (antes lo hacia remito/header-form/Index.vue con toda la fila
		 * de buscadores). El aviso lo muestra la etapa 2.
		 *
		 * @returns {Array}
		 */
		items() {
			let self = this

			let visibles = this.elementos_de_etapa_de_vender(this.etapa, {
				excluir: function (item) {
					return self.tope_de_items_de_vender_alcanzado && es_entrada_de_articulos(item.key)
				},
			})

			return visibles.filter(function (item) {
				if (item.key === KEY_SEPARADOR || componente_de_elemento(item.key)) {
					return true
				}
				console.log('diseño de vender: el elemento ' + item.key + ' no tiene componente en layout/componentes.js')
				return false
			})
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
		 * Clave estable del item para el v-for: la key del elemento (aparece una sola vez en el
		 * diseño) o el id del separador (puede haber varios). Estable es lo que importa: si el
		 * diseño cambia con Vender abierto, un campo que se mueve conserva lo que tenia tipeado.
		 *
		 * @param {Object} item
		 * @returns {string}
		 */
		clave_del_item(item) {
			return this.es_separador(item) ? 'separador:' + item.id : item.key
		},

		/**
		 * Clases del item. Un separador va siempre a lo ancho.
		 *
		 * @param {Object} item
		 * @param {number} indice posicion entre los items que se dibujan
		 * @returns {Array<string>}
		 */
		clases_del_item(item, indice) {
			let cols = this.es_separador(item) ? 12 : acotar_cols(item.cols, 12)
			let clases = ['vender-grilla__item', 'col-12', 'col-md-' + cols]

			if (this.es_separador(item)) {
				clases.push('vender-grilla__item--separador')
			}

			if (this.es_resumen_a_lo_ancho(item, indice, cols)) {
				clases.push('vender-grilla__item--resumen-a-lo-ancho')
			}

			return clases
		},

		/**
		 * El resumen (ContextBar.vue) en su lugar de siempre: primero de la etapa 2 y a lo ancho.
		 *
		 * Ahi se dibuja como franja pegada al header y de borde a borde de la tarjeta, que es como
		 * se vio siempre: ContextBar trae margenes negativos (-8px -14px) que asumen exactamente el
		 * padding del cuerpo de la etapa 2. En cualquier otro lugar esos margenes lo harian
		 * pisar a sus vecinos, asi que se dibuja como una tarjeta contenida (ver el estilo de abajo).
		 *
		 * @param {Object} item
		 * @param {number} indice
		 * @param {number} cols
		 * @returns {boolean}
		 */
		es_resumen_a_lo_ancho(item, indice, cols) {
			return item.key === 'resumen'
				&& this.etapa === 'etapa_2'
				&& indice === 0
				&& cols === 12
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
