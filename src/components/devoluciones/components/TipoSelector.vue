<template>
	<!--
		Selector Venta / Compra: sobre qué comprobante se hace la nota de crédito.

		Es el HorizontalNav compartido en modo autónomo (contexto/estilo_interfaz_empresa.md §5,
		mismo uso que components/agenda/Index.vue): el nav solo pinta y avisa; qué pasa al cambiar
		de modo lo decide este componente.

		🔴 `:key="nav_key"`: si el usuario se arrepiente en el confirm, el nav ya marcó como activa
		la pestaña que clickeó (lo hace solo, después de emitir). Subir la key lo vuelve a crear y
		su `created()` toma de nuevo el modo real del store vía `selected_item_value`.
	-->
	<horizontal-nav
	:key="nav_key"
	:items="nav_items"
	:selected_item_value="tipo"
	:show_display="false"
	emitir_setSelected_al_inicio
	@setSelected="al_elegir_tipo"></horizontal-nav>
</template>
<script>
import limpiar from '@/mixins/devoluciones/limpiar'
export default {
	mixins: [limpiar],
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	data() {
		return {
			nav_key: 0,
		}
	},
	computed: {
		/**
		 * Modo actual del módulo ('venta' | 'compra').
		 *
		 * @returns {String}
		 */
		tipo() {
			return this.$store.state.devoluciones.tipo
		},
		/**
		 * Items del nav. `name` y `nombre` llevan el mismo texto porque HorizontalNav lee uno u
		 * otro según el idioma de la instalación. `testid` fija los data-testid
		 * (`nav-item-devolucion-tipo-venta` / `-compra`) para que no dependan del texto visible.
		 *
		 * @returns {Array}
		 */
		nav_items() {
			return [
				{
					name: 'Venta',
					nombre: 'Venta',
					route_value: 'venta',
					testid: 'devolucion-tipo-venta',
				},
				{
					name: 'Compra',
					nombre: 'Compra',
					route_value: 'compra',
					testid: 'devolucion-tipo-compra',
				},
			]
		},
		/**
		 * ¿Hay algo cargado que se perdería al cambiar de modo?
		 *
		 * @returns {Boolean}
		 */
		hay_algo_cargado() {
			let state = this.$store.state.devoluciones
			return state.items.length > 0
		},
	},
	methods: {
		/**
		 * Cambia de modo. Lo cargado en un modo no sirve en el otro (una venta no tiene proveedor
		 * ni una compra cliente), así que se limpia todo; si había renglones, se pregunta antes.
		 *
		 * @param {Object} item Item del nav elegido (`route_value` = 'venta' | 'compra').
		 */
		al_elegir_tipo(item) {
			let tipo = item.route_value

			if (tipo == this.tipo) {
				return
			}

			if (this.hay_algo_cargado) {
				let texto = tipo == 'compra' ? 'Compra' : 'Venta'
				if (!confirm('Al pasar a '+texto+' se descarta lo que cargaste. ¿Continuar?')) {
					this.nav_key++
					return
				}
			}

			this.limpiar_devolucion()
			this.$store.commit('devoluciones/set_tipo', tipo)
		},
	},
}
</script>
