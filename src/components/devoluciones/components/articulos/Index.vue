<template>
	<!--
		Tarjeta Artículos: lo que se devuelve.
		- Con comprobante (venta o compra): sus renglones, con "Marcar todo como devuelto".
		- Sin comprobante (nota libre): el buscador de artículos y los renglones agregados a mano.
	-->
	<tarjeta
	titulo="Artículos"
	:subtitulo="subtitulo">

		<template
		v-if="hay_comprobante && items.length"
		#acciones>
			<btn-marcar-todo></btn-marcar-todo>
		</template>

		<buscador-articulos
		v-if="!hay_comprobante"></buscador-articulos>

		<tabla-articulos
		v-if="items.length"></tabla-articulos>

		<div
		v-else
		class="dev-vacio"
		:data-testid="'devolucion-articulos-vacio'">
			<i class="bi bi-box-seam"></i>
			<p>{{ vacio_titulo }}</p>
			<p class="dev-vacio__detalle">{{ vacio_detalle }}</p>
		</div>
	</tarjeta>
</template>
<script>
export default {
	components: {
		Tarjeta: () => import('@/components/devoluciones/components/Tarjeta'),
		BuscadorArticulos: () => import('@/components/devoluciones/components/articulos/BuscadorArticulos'),
		TablaArticulos: () => import('@/components/devoluciones/components/articulos/TablaArticulos'),
		BtnMarcarTodo: () => import('@/components/devoluciones/components/articulos/BtnMarcarTodo'),
	},
	computed: {
		/**
		 * @returns {Boolean} true si el módulo está en modo Compra.
		 */
		es_compra() {
			return this.$store.state.devoluciones.tipo == 'compra'
		},
		/**
		 * @returns {Array} Renglones de la devolución.
		 */
		items() {
			return this.$store.state.devoluciones.items
		},
		/**
		 * ¿Hay una venta/compra cargada? Con comprobante los renglones salen de él y no se
		 * agregan a mano (igual que antes en venta).
		 *
		 * @returns {Boolean}
		 */
		hay_comprobante() {
			let state = this.$store.state.devoluciones
			if (this.es_compra) {
				return !!state.provider_order
			}
			return !!state.sale
		},
		/**
		 * @returns {String} Bajada de la tarjeta.
		 */
		subtitulo() {
			if (this.hay_comprobante) {
				return 'Indicá cuántas unidades vuelven de cada renglón.'
			}
			return 'Agregá los artículos uno por uno con el buscador.'
		},
		/**
		 * @returns {String} Texto principal del estado vacío.
		 */
		vacio_titulo() {
			if (this.hay_comprobante) {
				return this.es_compra ? 'La compra no tiene artículos.' : 'La venta no tiene artículos.'
			}
			return 'Todavía no hay artículos para devolver.'
		},
		/**
		 * @returns {String} Ayuda del estado vacío: qué hacer para empezar.
		 */
		vacio_detalle() {
			if (this.hay_comprobante) {
				return ''
			}
			if (this.es_compra) {
				return 'Buscá una compra por su número o elegí un proveedor y agregá artículos.'
			}
			return 'Buscá una venta por su número o elegí un cliente y agregá artículos.'
		},
	},
}
</script>
