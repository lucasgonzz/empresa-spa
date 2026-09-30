<template>
	<!--
		Reserva de campos de Vender (mision diseno-vender-configurable, 28/9/2026).

		Monta, ESCONDIDOS, los campos del catalogo que no monta ninguna grilla de etapa: los que el
		diseño en uso saco (ya con los forzados vueltos a su lugar, que esos si se dibujan) y los
		ubicados en una etapa que no se dibuja porque no le quedo ningun campo disponible. Se monta
		UNA sola vez, en VenderStages.vue, despues de las tres etapas.

		🔴 POR QUE EXISTE, Y POR QUE NO ALCANZA CON NO MONTARLOS.

		Antes de los diseños cada componente de las tres etapas estaba SIEMPRE montado: el v-if que
		decide si se ve vivia adentro de cada uno. Hay codigo que cuenta con eso aunque el campo no se
		vea, y sacar un campo del diseño no puede romperlo:

		1. Componentes que hacen algo al montarse o mirando el store, se vean o no. Moneda.vue, en su
		   created(), carga la cotizacion del dolar del dueño en vender/valor_dolar (iniciar_dolar):
		   sin la extension ventas_en_dolares el selector no se ve, pero sin ese created() un
		   articulo con costo en dolares se vendia a $0 hasta el primer Guardar o Limpiar.
		   SelectClient.vue recalcula los precios al cambiar el cliente (su watch), aunque el
		   cliente llegue por otro lado (una venta que se abre para editar, un presupuesto).
		2. Codigo que busca un input por id SIN guarda: document.getElementById('article-bar-code')
		   o ('article-amount') seguido de .focus() o .value (remito/ArticlesTable.vue,
		   mixins/vender/index.js, mixins/vender/check_stock.js). Con el codigo de barras o la
		   cantidad sacados del diseño, el input no existia y eso tiraba un TypeError en medio de
		   la venta. Montados aca el input existe (escondido): .value funciona, y un .focus() sobre
		   algo escondido no hace nada (el foco "de vuelta al buscador" lo resuelve
		   layout/foco.js, que busca la primera entrada A LA VISTA).

		🔴 Nunca monta un campo que ya monta una grilla: con dos, los ids se repetirian y
		getElementById devolveria el primero, que puede ser el escondido. La regla de que monta cada
		uno vive en un solo lugar (items_de_la_grilla_de_vender y elementos_de_la_reserva_de_vender
		del mixin mixins/vender/diseno_de_vender.js).

		Con el tope de items por venta alcanzado, los campos que agregan articulos no se montan ni
		aca ni en las grillas: es lo que hacia antes el v-if de remito/header-form/Index.vue, y el
		codigo que los busca ya lo contemplaba.

		display: none en linea (no en una clase que alguien pueda pisar) y aria-hidden: nada de esto
		se tiene que ver, ni enfocar, ni leer. Sin data-tour propio: el tour de la demo saltea solo
		los elementos que no se ven (motor.js, se_puede_senalar), asi que las anclas internas de
		estos componentes no le molestan.
	-->
	<div
	v-if="user"
	class="vender-reserva-de-elementos"
	style="display: none"
	aria-hidden="true">
		<component
		v-for="key in keys"
		:key="key"
		:is="componente_de(key)"></component>
	</div>
</template>

<script>
import { componente_de_elemento } from './componentes'
import diseno_de_vender from '@/mixins/vender/diseno_de_vender'

export default {
	name: 'ReservaDeElementos',
	mixins: [diseno_de_vender],
	computed: {
		/**
		 * Keys de los campos que monta la reserva, en el orden del catalogo. Un elemento sin
		 * componente en componentes.js no se monta en ningun lado (la grilla ya lo avisa).
		 *
		 * @returns {Array<string>}
		 */
		keys() {
			return this.elementos_de_la_reserva_de_vender().filter(function (key) {
				return !!componente_de_elemento(key)
			})
		},
	},
	methods: {
		/**
		 * La fabrica del componente (declarada a nivel de modulo en componentes.js: nunca una
		 * funcion nueva por render, ver el comentario de ese archivo).
		 *
		 * @param {string} key
		 * @returns {Function|null}
		 */
		componente_de(key) {
			return componente_de_elemento(key)
		},
	},
}
</script>
