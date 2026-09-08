<template>
	<b-row
	v-if="authenticated">
		<b-col>
			<div
			v-if="has_views"
			class="abm-modulos-row">
				<horizontal-nav
				:show_display="false"
				@setSelected="setSelectedView"
				set_view
				:items="views"></horizontal-nav>

				<abm-search></abm-search>
			</div>

			<horizontal-nav
			:show_display="false"
			@setSelected="setSelected"
			:set_view="has_views ? false : true"
			:set_sub_view="has_views ? true : false"
			:items="items"></horizontal-nav>
			
			<!--
				Una solapa del segundo nivel puede declarar un componente propio en vez del ABM
				generico (ver `componentes` en src/mixins/abm.js). Es lo que permite que
				Integraciones -> Tienda online sea una pantalla de tarjetas y no una tabla.
			-->
			<component
			v-if="selected_component"
			:is="selected_component"></component>

			<view-component
			v-else
			show_filter_modal
			:check_permissions="false"
			:model_name="selected_model">
				<template #table_left_options="{ model }">
					<btn-duplicate-pdf-profile
					v-if="selected_model === 'pdf_column_profile'"
					:model="model"></btn-duplicate-pdf-profile>
				</template>
			</view-component>
		</b-col>
	</b-row>
</template>
<script>
import abm from '@/mixins/abm'
import routes from '@/router/routes'
export default {
	mixins: [abm],
	components: {
		AbmSearch: () => import('@/common-vue/components/abm-search/Index'),
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnDuplicatePdfProfile: () => import('@/common-vue/components/pdf/BtnDuplicatePdfProfile'),
	},
	data() {
		return {
			selected_model: '',
		}
	},
	computed: {
		has_views() {
			return typeof this.models == 'undefined'
		},
		views() {
			let views = []
			this.abm_views.forEach(view => {
				 
				if (view.if_has_extencion) {
					if (this.hasExtencion(view.if_has_extencion)) {

						views.push({
							name: view.view,
						})
					}
				} else {

					views.push({
						name: view.view,
					})
				}
				
			})
			return views 
		},
		items() {
			let items = []
			if (this.has_views) {
				this.abm_views.forEach(view => {
					if (this.view == this.routeString(view.view)) {
						view.models.forEach(model => {
							if (this.checkModel(model)) {
								items.push(this.buildItem(model, view))
							}
						})
					}
				})
			} else {
				this.models.forEach(model => {
					if (this.checkModel(model)) {
						items.push(this.buildItem(model, null))
					}
				})
			}
			return items
		},
		/**
		 * Componente propio de la solapa activa, o null si esa solapa renderiza el ABM generico.
		 *
		 * @returns {Function|Object|null}
		 */
		selected_component() {
			if (!this.selected_model) {
				return null
			}
			return this.componentForModel(this.selected_model)
		},
	},
	methods: {
		setSelectedView(item) {
			let view = this.abm_views.find(_view => this.routeString(_view.view) == this.view)
			let model_name = view.models[0]
			this.$router.push({params: {sub_view: (this.routeString(this.plural(model_name)))}})
			this.selected_model = model_name
		},
		checkModel(model, items) {
			return (!model.check_permissions || typeof model.check_permissions == 'undefined' || this.can(model.replaceAll(' ', '_')+'.index'))
		},
		/**
		 * Arma un item del segundo nivel de nav para un modelo del ABM.
		 *
		 * Dos cosas que un item puede declarar y antes no podia, las dos opcionales y las dos
		 * en la view (src/mixins/abm.js):
		 *
		 * - `nombres[model]`: una etiqueta propia para la solapa. El segmento de la URL NO
		 *   cambia --sale del plural del modelo, via `route_value`--, asi que los enlaces
		 *   viejos y los que arma el buscador de recursos del ABM siguen resolviendo igual, y
		 *   la solapa se sigue marcando como activa.
		 * - `componentes[model]`: la solapa monta ese componente en vez del ABM generico. Un
		 *   item asi NO lleva `call_models` a proposito: no tiene store detras, y horizontal-nav
		 *   dispatchearia `<model>/getModels` sobre un modulo que no existe.
		 *
		 * @param {string} model Nombre interno del modelo (o de la solapa, si es un componente).
		 * @param {Object|null} view View del ABM que lo contiene, o null.
		 * @returns {Object} Item para horizontal-nav.
		 */
		buildItem(model, view) {
			var plural = this.plural(model)
			var nombre_propio = (view && view.nombres && view.nombres[model]) ? view.nombres[model] : null
			var item = {
				model_name: model,
			}
			if (this.idiom == 'es') {
				item.nombre = nombre_propio ? nombre_propio : plural
			} else {
				item.name = nombre_propio ? nombre_propio : plural
			}
			if (nombre_propio) {
				item.route_value = plural
			}
			if (!this.componentForModel(model)) {
				item.call_models = model
			}
			return item
		},
		/**
		 * Componente propio declarado para un modelo del ABM, buscandolo en todas las views.
		 * Los nombres de modelo no se repiten entre views, asi que con el nombre alcanza.
		 *
		 * @param {string} model Nombre interno del modelo.
		 * @returns {Function|Object|null} Componente (o fabrica asincrona) declarado, o null.
		 */
		componentForModel(model) {
			var self = this
			var i
			for (i = 0; i < self.abm_views.length; i++) {
				var v = self.abm_views[i]
				if (v.componentes && v.componentes[model]) {
					return v.componentes[model]
				}
			}
			return null
		},
		setSelected(item) {
			// `model_name` lo pone buildItem y esta siempre; `call_models` queda como respaldo
			// para cualquier item armado a mano fuera de esta vista.
			this.selected_model = item.model_name ? item.model_name : item.call_models
		},
		/**
		 * Sincroniza `selected_model` con la URL (/abm/:view/:sub_view) o con el default del menú.
		 * Antes siempre se usaba routes.js (category), ignorando params al entrar desde un router-link.
		 */
		setView() {
			var route_view = this.$route.params.view
			var route_sub_view = this.$route.params.sub_view

			if (route_view && route_sub_view) {
				var resolved = this.resolveSelectedModelFromRoute(route_view, route_sub_view)
				if (resolved) {
					this.selected_model = resolved
					return
				}
			}

			if (route_view && !route_sub_view) {
				var first_in_view = this.firstModelInView(route_view)
				if (first_in_view) {
					this.selected_model = first_in_view
					return
				}
			}

			var abm_route = routes.find(function (r) {
				return r.name == 'abm'
			})
			if (abm_route && abm_route.params && abm_route.params.model_name) {
				this.selected_model = abm_route.params.model_name
			}
		},

		/**
		 * Obtiene el nombre interno del modelo cuyo plural en ruta coincide con sub_view.
		 *
		 * @param {string} route_view Valor de $route.params.view (ej. ventas).
		 * @param {string} route_sub_view Valor de $route.params.sub_view (ej. remitentes).
		 * @returns {string|null} model_name o null.
		 */
		resolveSelectedModelFromRoute(route_view, route_sub_view) {
			var self = this
			var i
			var j
			for (i = 0; i < self.abm_views.length; i++) {
				var v = self.abm_views[i]
				if (v.if_has_extencion && !self.hasExtencion(v.if_has_extencion)) {
					continue
				}
				if (self.routeString(v.view) !== route_view) {
					continue
				}
				for (j = 0; j < v.models.length; j++) {
					var model = v.models[j]
					if (!self.checkModel(model)) {
						continue
					}
					if (self.routeString(self.plural(model)) === route_sub_view) {
						return model
					}
				}
			}
			return null
		},

		/**
		 * Primer modelo permitido dentro de la pestaña ABM indicada por view (sin sub_view en la URL).
		 *
		 * @param {string} route_view Segmento view de la ruta.
		 * @returns {string|null}
		 */
		firstModelInView(route_view) {
			var self = this
			var i
			var j
			for (i = 0; i < self.abm_views.length; i++) {
				var v = self.abm_views[i]
				if (v.if_has_extencion && !self.hasExtencion(v.if_has_extencion)) {
					continue
				}
				if (self.routeString(v.view) !== route_view) {
					continue
				}
				for (j = 0; j < v.models.length; j++) {
					var model = v.models[j]
					if (self.checkModel(model)) {
						return model
					}
				}
			}
			return null
		},
	},
	watch: {
		'$route.params.view'() {
			this.setView()
		},
		'$route.params.sub_view'() {
			this.setView()
		},
	},
	created() {
		this.setView()
	}
}
</script>
<style scoped lang="sass">
.abm-modulos-row
	display: flex
	align-items: center
	justify-content: space-between
	gap: 15px
	width: 100%
	// El margen de abajo ya eran 15px; el de arriba faltaba y por eso esta fila quedaba pegada al
	// borde superior de la pantalla. 15px es el mismo aire que separa al segundo horizontal-nav (el
	// de modelos) de los botones del header que arma el view-component de mas abajo: ese aire lo
	// pone el `p-t-15` de `.view-header-toolbar`, que esta fila no hereda porque va ANTES del
	// view-component. Mismo diagnostico y mismo arreglo que ya se aplico en
	// payment-plan/Index.vue (mision 40).
	margin-top: 15px
	margin-bottom: 15px

	// 🔴 `nowrap` y no `wrap` (mision 33). La intencion de esta fila ya estaba escrita --que el
	// buscador quede al lado del nav-- y aun asi no funcionaba: con `flex-wrap: wrap` el nav supera
	// el ancho disponible y ENVUELVE, asi que el buscador cae a la linea de abajo. `flex: 0 1 auto`
	// permite encoger, pero un contenedor flex no baja de su ancho de contenido sin `min-width: 0`.
	//
	// Precision que dejo la verificacion: el nav de esta fila es el de las VISTAS del ABM
	// (`:items="views"`, las catorce de mixins/abm.js mas vinoteca y meli), que son las mismas en
	// toda la seccion. El nav de modelos de cada vista va aparte, fuera de esta fila. O sea que esto
	// no es "Articulos entra y los demas no": en TODOS los ABM el nav cede los ~315px del buscador y
	// resuelve el sobrante con su scroll.
	flex-wrap: nowrap

	// El horizontal-nav de modulos viene con width:100% (pensado para cuando va solo en su fila,
	// como en los Listados). Aca conviven con el buscador, asi que le pedimos que ocupe
	// solo el ancho de su contenido y no fuerce al buscador a la linea de abajo.
	//
	// El min-width: 0 es lo que hace que ese `flex: 0 1 auto` sirva de algo: el sobrante lo resuelve
	// el scroll horizontal que el nav ya tiene.
	::v-deep .cont-navs
		width: auto
		flex: 0 1 auto
		min-width: 0

		// horizontal-nav le pone un margin-top de 15px a su pista, pensado para cuando el nav va
		// solo en su fila. Adentro de esta, con align-items: center, ese margen entra en la caja y
		// deja las pestañas ~7px mas abajo que el buscador. Con `wrap` no se veia porque caian en
		// renglones distintos; el nowrap lo expone. Misma linea que en payment-plan/Index.vue.
		.cont-left > div
			margin-top: 0

	::v-deep .cont-left
		min-width: 0

	// En telefono vuelve el wrap: ahi el buscador abajo del nav es lo correcto.
	@media screen and (max-width: 768px)
		flex-wrap: wrap
</style>