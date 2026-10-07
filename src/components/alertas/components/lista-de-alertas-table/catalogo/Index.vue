<template>
<div
class="alertas-catalogo"
data-testid="alertas-catalogo"
:data-subsolapa="sub_activa">

	<!--
		La segunda fila de solapas (Imagenes | Categorias), atada a la ruta: /alertas/catalogo/<sub>.
		Solo se dibuja si la persona puede ver MAS DE UNA: un empleado no ve Categorias, y con una sola
		solapa la barra no aporta nada (Imagenes queda para el exactamente como era cuando era la
		solapa de primer nivel).

		El margen negativo del contenedor (ver el <style>) deja las dos barras a 15px una de la otra,
		como en Cheques: el nav trae 15px de aire arriba y el de Alertas ya le puso 15px abajo al
		primero.
	-->
	<div
	v-if="items_de_subsolapas.length > 1"
	class="alertas-catalogo__subnav"
	data-testid="catalogo-subnav">
		<horizontal-nav
		class="m-b-15"
		set_sub_view
		emitir_setSelected_al_inicio
		:show_display="false"
		:items="items_de_subsolapas"
		@setSelected="al_elegir_subsolapa"></horizontal-nav>
	</div>

	<!--
		Cada seccion se monta solo mientras su solapa esta abierta (v-if), asi sus pedidos y timers
		existen solo con la pestaña a la vista. `imagenes/` no se toca: se monta tal cual estaba.
	-->
	<imagenes v-if="sub_activa === 'imagenes'"></imagenes>
	<categorias v-else-if="sub_activa === 'categorias'"></categorias>

</div>
</template>
<script>
import { SUBSOLAPAS_DEL_CATALOGO, ruta_normalizada, subsolapas_permitidas } from '@/components/alertas/solapas'

/**
 * Solapa "Catálogo" de Alertas (misión categorizacion-tres-modelos, 5/10/2026): lo que antes era la
 * solapa de primer nivel "Imágenes" pasa a ser una sub-solapa de esta, y al lado se suma "Categorías".
 *
 * Qué sub-solapa se ve lo decide la ruta (/alertas/catalogo/imagenes, /alertas/catalogo/categorias),
 * normalizada con el helper de components/alertas/solapas.js: la misma regla que usa views/Alertas.vue
 * para dejar la URL en forma, así lo que se ve y lo que dice la dirección no pueden discrepar. Incluye
 * el alias viejo /alertas/imagenes (que Alertas.vue convierte a la URL canónica con un `replace`): con
 * él, Imágenes se ve desde el primer instante, sin parpadeo.
 *
 * La lista de sub-solapas sale de un helper (`SUBSOLAPAS_DEL_CATALOGO`) para que Resumen, Marcas y
 * Descripciones (Fase 2) se sumen agregando un renglón allá y su sección acá, sin rehacer nada.
 *
 * Los números rojos de cada sub-solapa salen de los getters de sus stores (el mismo número que la
 * solapa de arriba suma y que la campana del menú).
 */
export default {
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
		Imagenes: () => import('@/components/alertas/components/lista-de-alertas-table/imagenes/Index'),
		Categorias: () => import('@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/Index'),
	},
	computed: {
		/**
		 * True si la sesión entró con la clave maestra (lo manda la API en el usuario).
		 *
		 * @returns {Boolean}
		 */
		es_acceso_maestro() {
			let usuario = this.$store.state.auth.user
			return !!(usuario && usuario.es_acceso_maestro)
		},
		/**
		 * Las sub-solapas que esta persona puede ver (Categorías, solo dueño o acceso maestro).
		 *
		 * @returns {Array<String>}
		 */
		permitidas() {
			return subsolapas_permitidas(!!this.is_owner, this.es_acceso_maestro)
		},
		/**
		 * La sub-solapa que corresponde a la ruta, ya normalizada: la que se monta.
		 *
		 * @returns {String|null}
		 */
		sub_activa() {
			return ruta_normalizada(this.view, this.sub_view, this.permitidas).sub_view
		},
		/**
		 * El número rojo de cada sub-solapa.
		 *
		 * @returns {Object} valor de la sub-solapa -> número
		 */
		alertas_por_subsolapa() {
			return {
				imagenes: this.$store.getters['image_assignment/badge'],
				categorias: this.$store.getters['category_proposal/badge'],
			}
		},
		/**
		 * Items del horizontal-nav: solo las permitidas. `route_value` y `testid` van explícitos porque
		 * "Imágenes" y "Categorías" no pueden salir del nombre (`routeString` no saca tildes).
		 *
		 * @returns {Array}
		 */
		items_de_subsolapas() {
			let self = this
			let items = []
			SUBSOLAPAS_DEL_CATALOGO.forEach(function (subsolapa) {
				if (self.permitidas.indexOf(subsolapa.valor) === -1) {
					return
				}
				items.push({
					name: subsolapa.nombre,
					route_value: subsolapa.valor,
					testid: subsolapa.testid,
					alert: self.alertas_por_subsolapa[subsolapa.valor],
				})
			})
			return items
		},
	},
	methods: {
		/**
		 * Clic en una sub-solapa. El nav avisa ANTES de cambiar la ruta (`emitir_setSelected_al_inicio`),
		 * así que acá `sub_activa` todavía es la de antes. Si la que se toca es la que ya estaba abierta,
		 * se recarga lo suyo: es la forma de ver lo último, igual que volver a tocar una solapa de las de
		 * arriba. Si es otra, no hace falta nada: su sección se monta sola y carga lo suyo.
		 *
		 * Los dos pedidos son los mismos que hace cada sección al entrar. El de imágenes muestra su propio
		 * estado de carga en la tabla; el de categorías es silencioso (con datos a la vista no parpadea).
		 *
		 * @param {Object} item Item del nav ({ name, route_value, testid }).
		 */
		al_elegir_subsolapa(item) {
			let valor = item ? item.route_value : null
			if (valor !== this.sub_activa) {
				return
			}
			if (valor === 'categorias') {
				this.$store.dispatch('category_proposal/get_actual')
				this.$store.dispatch('category_proposal/get_resumen')
				return
			}
			if (valor === 'imagenes') {
				this.$store.dispatch('image_assignment/get_asignaciones')
			}
		},
	},
}
</script>
<style lang="sass">
// El nav de la segunda fila trae `margin-top: 15px` en su contenedor interno (.cont-left > div) y el
// nav de Alertas de arriba ya le dejo 15px de aire abajo (`m-b-15`): sumados serian 30px entre las
// dos barras. Con -15px quedan a 15px, igual que las dos filas de solapas de Cheques.
.alertas-catalogo__subnav
	margin-top: -15px
</style>
