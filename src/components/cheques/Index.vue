<template>
	<div
	class="m-t-10">
		<!--
			Misión cheques-endoso-y-bancos (21/9/2026): el módulo vivía en Reportes > Cheques y
			pasó a Tesorería > Cheques, con ruta propia (/cheques/:sub_view?/:sub_sub_view?). Acá
			ya no hay `view` que mirar: la vista que lo monta (views/Cheques.vue) es solo de
			cheques.

			La guarda de abajo reemplaza al `v-if="view == 'cheques'"` que había, y no es
			decorativa: el store de cheques nace como `[]` y recién después de `cheque/getModels`
			toma la forma {recibido: {...}, emitido: {...}} que leen NavComponent (badges de cada
			solapa) y list/Index (cheques_to_show). Dibujar las solapas antes de eso, o con la
			ruta todavía sin una solapa válida, era un TypeError en render.
		-->
		<div
		v-if="listo">
			<!--
				Barra superior: navegación entre sub-vistas de cheques y acceso a la configuración
				de columnas (mismo flujo que en vistas estándar con `view-header`).
			-->
			<b-row
			class="align-items-center m-b-10"
			no-gutters>
				<b-col>
					<nav-component></nav-component>
				</b-col>
				<b-col
				cols="auto"
				class="text-right">
					<props-to-show model_name="cheque"></props-to-show>
				</b-col>
			</b-row>

			<list></list>
		</div>

		<div
		v-else
		class="j-center p-15"
		data-testid="cheques-cargando">
			<b-spinner
			variant="primary"></b-spinner>
		</div>
	</div>
</template>
<script>
/*
	Misión cheques-solapa-endosados (2/10/2026): un filtro u orden de columna se aplica SOBRE la
	solapa en la que está parado el usuario, y las dos filas de solapas no desaparecen.

	Cómo funciona, de punta a punta:

	1. Filtrar u ordenar una columna llega a `cheque/runGlobalSearch` del factory, que hace
	   POST global-search/cheque. Ese endpoint busca en TODOS los cheques del usuario: no sabe
	   en qué solapa estás. La solapa se calcula en la SPA (los buckets de GET cheque), así que
	   en vez de repetir esa lógica en SQL se le pasa a la API la lista de ids de la solapa como
	   un filtro extra `{key: 'id', operator: 'in', value: [...]}`.

	2. Ese filtro viaja por `state.extra_filters_de_barra`, que `runGlobalSearch` lee en CADA
	   request (el mismo mecanismo que usa el select de sucursal del Listado de artículos). Este
	   componente lo mantiene sincronizado con la solapa vigente: si el filtro quedara con los
	   ids de otra solapa, la búsqueda devolvería cheques que no están en la pantalla.

	3. Cambiar de solapa limpia los criterios y el orden (cada solapa arranca limpia: las
	   columnas visibles cambian de una a otra y los criterios de una columna que ya no está se
	   descartarían en silencio).

	4. Si se recargan los cheques estando en la misma solapa (cobrar, rechazar, endosar,
	   eliminar: todas terminan en `cheque/getModels`), la búsqueda vigente se vuelve a ejecutar
	   para que la tabla no muestre un cheque que ya pasó a otra solapa. `getModels` además vacía
	   el resultado filtrado y apaga `is_filtered` antes de pedir los modelos, por eso hay que
	   volver a pedirlo aunque los cheques de la solapa sean los mismos.

	Los pasos 3 y 4 son watchers (más uno que cuenta las recargas de los modelos) y el orden en
	que están declarados importa: ver el comentario de `watch`.
*/
import { cheques_de_la_solapa, solapa_es_valida } from '@/components/cheques/solapas'
import filters_mixin from '@/common-vue/mixins/filters'

export default {
	components: {
		NavComponent: () => import('@/components/cheques/NavComponent'),
		List: () => import('@/components/cheques/list/Index'),
		/** Selector de columnas visibles, orden y ancho; persiste en API (`table-column-preference`). */
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
	},
	data() {
		return {
			// Clave de la solapa (ver `clave_de_la_solapa`) con la que se sincronizó el filtro de
			// ids por última vez. Sirve para distinguir "cambió la solapa" de "cambió la lista
			// de la misma solapa" sin depender del orden en que corren los watchers. Arranca en
			// null: la primera sincronización cuenta como cambio de solapa.
			solapa_sincronizada: null,
			// Cuántas veces se REEMPLAZARON los modelos del store (cada respuesta de
			// `cheque/getModels`). Lo incrementa el watcher de `cheques` y entra en
			// `clave_de_sincronizacion`: ver ahí por qué no alcanza con mirar los ids.
			version_de_los_modelos: 0,
		}
	},
	created() {
		// Entrar al módulo con los datos ya cargados (los modelos quedan en el store entre visitas)
		// no dispara ningún watcher, así que el filtro de ids se escribe acá. Sin esto la primera
		// búsqueda de la visita saldría sin restricción y buscaría en todos los cheques.
		this.sincronizar_filtro_de_la_solapa()
	},
	beforeDestroy() {
		// El store de cheques vive más que este componente: sobrevive a la navegación. Se deja
		// limpio para que la próxima visita no herede ni un orden puesto ni, sobre todo, la
		// restricción a los ids de una solapa de la visita anterior.
		this.$store.dispatch('cheque/reiniciar_busqueda_de_columnas')
		this.$store.commit('cheque/set_extra_filters_de_barra', [])
	},
	computed: {
		/**
		 * Los cheques agrupados tal cual los devolvió GET cheque (o `[]` antes de cargar).
		 *
		 * @returns {Object|Array}
		 */
		cheques() {
			return this.$store.state.cheque.models
		},
		/**
		 * Si ya se puede dibujar el módulo: el store tiene la forma agrupada que devuelve
		 * GET cheque y la ruta trae una solapa válida (views/Cheques.vue completa y corrige la
		 * ruta con router.replace si falta algo). Endosado es válida sin segundo nivel.
		 *
		 * @returns {Boolean}
		 */
		listo() {
			let cheques = this.cheques
			return !!(cheques && cheques.recibido && solapa_es_valida(this.sub_view, this.sub_sub_view))
		},
		/**
		 * Ids de los cheques de la solapa vigente, en el orden en que los trae la API. Es la
		 * lista a la que se acota cualquier filtro u orden de columna.
		 *
		 * @returns {Array<Number>}
		 */
		ids_de_la_solapa() {
			/** Cheques de la solapa que marca la ruta (`[]` si no hay una válida). */
			let cheques_de_esta_solapa = cheques_de_la_solapa(this.cheques, this.sub_view, this.sub_sub_view)
			let ids = []
			cheques_de_esta_solapa.forEach(function (cheque) {
				ids.push(cheque.id)
			})
			return ids
		},
		/**
		 * Identifica la solapa vigente con un string. Endosado no tiene segundo nivel, así que su
		 * clave ignora el `sub_sub_view`: HorizontalNav cambia de solapa con un push relativo que
		 * deja `/cheques/endosado/pendientes` por un instante (views/Cheques.vue lo corrige), y
		 * eso no puede contar como dos cambios de solapa.
		 *
		 * @returns {String}
		 */
		clave_de_la_solapa() {
			if (this.sub_view == 'endosado') {
				return 'endosado'
			}
			return this.sub_view + '/' + this.sub_sub_view
		},
		/**
		 * Todo lo que, si cambia, obliga a re-escribir el filtro de ids (y, si hay una búsqueda
		 * puesta, a re-ejecutarla): si se puede dibujar, la solapa, cuántas veces se recargaron
		 * los modelos y los ids de la solapa. Es un string y no un array/objeto para que el
		 * watcher compare por valor.
		 *
		 * 🔴 `version_de_los_modelos` es lo que cubre el `getModels` que devuelve EXACTAMENTE los
		 * mismos cheques en esta solapa: `getModels` vacía `filtered` y apaga `is_filtered` antes
		 * de pedir los modelos, así que aunque los ids no cambien la tabla ya perdió su resultado
		 * filtrado y hay que volver a pedirlo. Solo con los ids, ese caso quedaba con los
		 * criterios y la flecha de orden prendidos y la tabla sin filtrar. Los ids siguen
		 * adentro por si algún día una mutación cambia las listas sin reemplazar los modelos.
		 *
		 * `listo` va adentro para que una solapa VACÍA también se sincronice al terminar de
		 * cargar: sin eso su clave sería la misma antes y después de cargar y la restricción
		 * (que para una solapa vacía es "ningún cheque") nunca se escribiría.
		 *
		 * @returns {String}
		 */
		clave_de_sincronizacion() {
			return (this.listo ? 'listo' : 'cargando') + '|' + this.clave_de_la_solapa + '|' + this.version_de_los_modelos + '|' + this.ids_de_la_solapa.join(',')
		},
	},
	watch: {
		/*
			🔴 El ORDEN de estos tres watchers importa: Vue 2 los crea (y, dentro de un mismo ciclo
			de render, los corre) en el orden en que están declarados acá.

			1) `cheques`: llegaron modelos nuevos -> sumar uno a `version_de_los_modelos`.
			2) `clave_de_la_solapa`: cambió de solapa -> limpiar la búsqueda.
			3) `clave_de_sincronizacion`: cambió la solapa o los modelos -> re-escribir el filtro
			   de ids y, si la solapa NO cambió y hay una búsqueda puesta, re-ejecutarla.

			El 1 va primero porque alimenta a la clave del 3: así, cuando llegan modelos nuevos, el
			3 ya corre con la versión nueva (Vue lo encola igual si el 1 lo invalida estando en
			pleno ciclo, porque tiene un id mayor).

			Cuando cambia la solapa se disparan el 2 y el 3 en el mismo ciclo: primero se limpia y
			recién después se escribe el filtro de ids. Si corrieran al revés, sincronizar vería
			todavía los criterios de la solapa anterior. Igual no depende solo del orden:
			`sincronizar_filtro_de_la_solapa` compara la solapa contra `solapa_sincronizada` y NO
			re-ejecuta nada cuando la solapa cambió.

			Ninguno retroalimenta a otro: limpiar y re-ejecutar cambian `filtered`, `is_filtered`,
			`filters` y la paginación, y ni los modelos ni la ruta dependen de eso.
		*/

		/**
		 * Llegaron modelos nuevos (cada `cheque/getModels` reemplaza `state.models` por un
		 * objeto nuevo, aunque traiga los mismos cheques): se cuenta una versión más.
		 *
		 * @returns {void}
		 */
		cheques() {
			this.version_de_los_modelos++
		},
		/**
		 * Cambió la solapa (de primer o de segundo nivel): la búsqueda de columnas arranca en
		 * cero. Cada solapa tiene sus propias columnas visibles (Emitido no tiene Cliente,
		 * Endosado tiene Proveedor/Gasto) y `display/table/Index.vue::set_filters` descarta en
		 * silencio los criterios de una columna que ya no está: dejarlos es arrastrar un filtro
		 * que nadie ve.
		 *
		 * @returns {void}
		 */
		clave_de_la_solapa() {
			this.$store.dispatch('cheque/reiniciar_busqueda_de_columnas')
		},
		/**
		 * Cambió la solapa o llegaron modelos nuevos: se sincroniza el filtro de ids.
		 *
		 * @returns {void}
		 */
		clave_de_sincronizacion() {
			this.sincronizar_filtro_de_la_solapa()
		},
	},
	methods: {
		/**
		 * Hay una búsqueda de columnas puesta: o la tabla está mostrando resultados filtrados, o
		 * quedó algún criterio u orden en las columnas.
		 *
		 * Se mira también `state.filters` y no solo `is_filtered` porque `cheque/getModels`
		 * (cobrar, rechazar, endosar, eliminar) apaga `is_filtered` y vacía `filtered` ANTES de
		 * pedir los modelos, pero deja los criterios y la flecha de orden en `state.filters`.
		 * Con solo `is_filtered`, después de cobrar un cheque con un orden puesto la tabla
		 * volvería a la lista sin ordenar y la flecha seguiría prendida.
		 *
		 * @returns {Boolean}
		 */
		hay_busqueda_de_columnas() {
			/** Estado del store de cheques. */
			let state = this.$store.state.cheque
			if (state.is_filtered) {
				return true
			}

			/** true si alguna columna tiene un criterio de valor o un orden puesto. */
			let hay_criterio = false
			state.filters.forEach(function (filter) {
				if (filters_mixin.methods.filter_has_active_values(filter)) {
					hay_criterio = true
				}
			})
			return hay_criterio
		},
		/**
		 * Deja el filtro de ids del store al día con la solapa vigente y, si hace falta,
		 * vuelve a ejecutar la búsqueda de columnas.
		 *
		 * - Siempre (con la solapa lista para dibujar): escribe `[{key: 'id', operator: 'in',
		 *   value: ids}]` en `extra_filters_de_barra`. Con una solapa vacía los ids son `[]`, y
		 *   la API lo resuelve como "ninguna fila" (no como "sin filtro").
		 * - Solo si la solapa NO cambió y hay una búsqueda de columnas puesta: re-ejecuta
		 *   `runGlobalSearch({page: 1})`. Es el caso de cobrar/rechazar/endosar/eliminar con un
		 *   orden o filtro puesto: la lista de la solapa cambió y la tabla tiene que reflejarlo
		 *   sola. No se usa `silencioso`: es una búsqueda de verdad y el cartel "Buscando
		 *   cheques" es lo que el usuario espera ver.
		 *
		 * Si la solapa cambió no se re-ejecuta nada: el otro watcher ya limpió la búsqueda y la
		 * solapa nueva se muestra tal cual.
		 *
		 * @returns {void}
		 */
		sincronizar_filtro_de_la_solapa() {
			// Sin datos o sin solapa válida no hay nada que sincronizar: el módulo ni se dibuja.
			if (!this.listo) {
				return
			}

			/** true si esta sincronización es por haber cambiado de solapa (y no solo la lista). */
			let la_solapa_cambio = this.solapa_sincronizada !== this.clave_de_la_solapa
			this.solapa_sincronizada = this.clave_de_la_solapa

			this.$store.dispatch('cheque/restringir_a_ids', {ids: this.ids_de_la_solapa})

			if (!la_solapa_cambio && this.hay_busqueda_de_columnas()) {
				this.$store.dispatch('cheque/runGlobalSearch', {page: 1})
			}
		},
	},
}
</script>
