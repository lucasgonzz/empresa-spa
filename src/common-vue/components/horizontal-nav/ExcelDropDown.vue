<template>

	<div>

		<export-history
		:model_name="model_name"></export-history>

		<masive-update-history
		v-if="show_masive_update_history"
		:model_name="model_name"></masive-update-history>

		<smart-images-history-modal
		v-if="show_smart_images_history"></smart-images-history-modal>

		<!-- Modal de importación IA: mismo criterio que el ítem del menú (evita id inexistente al abrir) -->
		<ai-excel-import-modal
		v-if="can_import_ai"
		:model="model_name">
		</ai-excel-import-modal>

		<!--
			🔴 Historial de importaciones. Vive ACA desde que se saco la importacion clasica de
			Listado, Clientes y Proveedores: hasta entonces el unico lugar donde se montaba el modal
			`import-history` era `common-vue/components/import/Index.vue`, o sea adentro del modal
			clasico. Sacar ese modal sin remontar este dejaba el item "Historial de importaciones"
			de este mismo menu apuntando a un id que ya no existe — y BootstrapVue NO tira error
			cuando le pedis mostrar un modal inexistente: el click simplemente no hace nada.

			Va con `can_import || can_import_ai`, y no solo con `can_import`, por dos razones:

			1. El item del menu "Historial de importaciones" usa `can_import`, pero la tarjeta de
			   progreso (`import-status`, abajo) se monta SIN condicion y su boton "Ver detalle"
			   tambien hace `$bvModal.show('import-history')`. Con solo `can_import`, un usuario que
			   puede importar con IA pero no tiene el permiso clasico veia la tarjeta de fallo y ese
			   boton no hacia nada — el mismo click mudo que este bloque vino a evitar, reintroducido
			   por la puerta de al lado.
			2. Desde que la importacion clasica salio de estas pantallas, quien importa lo hace con
			   IA: atar el historial al permiso del flujo que ya no existe deja gente sin poder ver
			   sus propias importaciones.

			El unico otro lugar que todavia monta `common-vue/components/import/Index.vue` es la
			importacion de articulos a una compra a proveedor (`provider/modals/orders/Import.vue`),
			y esa pantalla NO dibuja este menu (no pasa `show_excel_drop_down`), asi que no hay
			forma de que los dos ids convivan en la misma pantalla.
		-->
		<import-history
		v-if="can_import || can_import_ai"
		:model_name="model_name"></import-history>

		<!--
			🔴 Tarjeta flotante de progreso de la importacion ("Procesandoce / X de Y lotes"). Se
			remonta por lo mismo que el historial: la dibujaba el modal clasico. El store se llena
			por broadcast (`common-vue/mixins/broadcast.js`, evento `.ImportStatusUpdated`) desde
			cualquier pantalla, pero el componente que lo DIBUJA solo existia donde estuviera montado
			ese modal — asi que sin esto la importacion con IA se quedaba sin tarjeta de progreso.

			Sin `v-if`: es exactamente el alcance que tenia antes (las tres pantallas que montaban el
			modal clasico son las tres que dibujan este menu), y el componente no muestra nada
			mientras el store este vacio.
		-->
		<import-status></import-status>

		<!--
			Sin `right` a proposito: ese atributo alinea el menu por su borde DERECHO contra el
			boton (placement bottom-end + .dropdown-menu-right), y "Crear" vive en la zona izquierda
			del view-header. Un menu de min-width 300px anclado por su derecha a un boton que esta a
			~120px del borde se extendia hacia afuera de la pantalla y quedaba clavado contra el
			margen izquierdo. Alineado por la izquierda (bottom-start) cae debajo del boton y crece
			hacia la derecha, que es donde hay lugar.
		-->
		<b-dropdown

		split

		:id="'dropdown_'+model_name"

		size="sm"

		class="toolbar-btn--acento"

		boundary="viewport"

		:popper-opts="dropdown_popper_opts"

		menu-class="excel-create-dropdown-menu"

		v-if="can_create || has_permission_create_dropdown"

		@click="call_set_model">

			<template 

			#button-content>

				<span

				:dusk="'btn_create_'+model_name"

				:data-testid="'btn-crear-'+model_name">

					<i class="bi bi-plus-lg"></i>

					Crear

				</span>

			</template>

			<excel-dropdown-option-item
			v-if="can_create"
			icon="bi bi-plus-lg"
			@click="setModel(null, model_name)">
				{{ create_spanish(model_name) }}
			</excel-dropdown-option-item>

			<excel-dropdown-submenu
			v-if="show_export_submenu"
			icon="bi bi-box-arrow-up"
			label="Exportación">
				<excel-dropdown-option-item
				icon="bi bi-box-arrow-up"
				@click="exportModels">
					Nueva exportación
				</excel-dropdown-option-item>
				<excel-dropdown-option-item
				icon="bi bi-clock-history"
				@click="open_export_history">
					Historial de exportaciones
				</excel-dropdown-option-item>
			</excel-dropdown-submenu>

			<excel-dropdown-submenu
			v-if="show_import_submenu"
			icon="bi bi-box-arrow-in-down"
			label="Importación">
				<excel-dropdown-option-item
				v-if="can_import_ai"
				icon="bi bi-stars"
				@click="open_ai_import">
					Importar con IA
				</excel-dropdown-option-item>
				<!--
					Misma condicion que el montaje del modal (`can_import || can_import_ai`, mas
					arriba). Iban distintas: el modal se monta para quien puede importar con IA y el
					item quedaba solo para `can_import`, asi que un empleado con permisos restringidos
					podia importar con IA pero no llegaba a ver sus propias importaciones — salvo por
					el boton "Ver detalle" de la tarjeta de progreso, que existe solo mientras la
					importacion corre.

					Desde que la importacion clasica salio de estas pantallas, atar el historial al
					permiso de ese flujo deja gente afuera de su propio historial.
				-->
				<excel-dropdown-option-item
				v-if="can_import || can_import_ai"
				icon="bi bi-clock-history"
				:data_tour="model_name === 'article' ? 'listado.boton_importar_excel' : null"
				@click="open_import_history">
					Historial de importaciones
				</excel-dropdown-option-item>
			</excel-dropdown-submenu>

			<excel-dropdown-option-item
			v-if="show_masive_update_history"
			icon="bi bi-arrow-repeat"
			@click="open_masive_update_history">
				Historial de actualizaciones masivas
			</excel-dropdown-option-item>

			<excel-dropdown-option-item
			v-if="show_smart_images_history"
			icon="bi bi-images"
			@click="open_smart_images_history">
				Historial de imágenes inteligentes
			</excel-dropdown-option-item>

			<slot name="excel_drop_down_options"></slot>
		</b-dropdown>

	</div>

</template>

<script>
import ExcelDropdownSubmenu from '@/common-vue/components/horizontal-nav/ExcelDropdownSubmenu'
import ExcelDropdownOptionItem from '@/common-vue/components/horizontal-nav/ExcelDropdownOptionItem'

export default {

	components: {
		ExportHistory: () => import('@/common-vue/components/horizontal-nav/ExportHistory'),
		MasiveUpdateHistory: () => import('@/common-vue/components/horizontal-nav/MasiveUpdateHistory'),
		SmartImagesHistoryModal: () => import('@/components/listado/components/selected-filtered-options/SmartImagesHistoryModal'),
		AiExcelImportModal: () => import('@/components/listado/modals/ai-excel-import/Index'),
		// Los dos que se remontaron acá al sacar la importación clásica (ver el template).
		ImportHistory: () => import('@/common-vue/components/import/ImportHistory'),
		ImportStatus: () => import('@/common-vue/components/import/import-status/Index'),
		// Estos dos van SINCRONOS y los modales de arriba siguen asincronos.
		//
		// Son el CONTENIDO del menu: si llegan por un chunk aparte, hay una ventana en la que el
		// menu se puede desplegar todavia vacio y Popper mide contra eso. Los modifiers `flip` y
		// `preventOverflow` si dependen del tamano del menu, asi que en esa ventana la posicion
		// puede salir mal, y del segundo clic en adelante el chunk ya esta en cache -- lo que
		// encaja con el "se acomoda despues de varios clics" que se reporto.
		//
		// 🔴 Honestidad sobre esto: la hipotesis NO quedo confirmada. Con `lazy` en false el slot se
		// renderiza en el mount de la barra, no en el clic, asi que la ventana es "el usuario abre
		// antes de que baje el chunk" y no "el primer clic siempre"; y con el placement bottom-start
		// que quedo, `top` y `left` los calcula Popper contra el boton, sin mirar el tamano del
		// menu. La causa medida del menu mal ubicado es la alineacion `right` que se saco mas
		// arriba. Esto se deja igual porque es barato, cierra una ventana real y estos dos
		// componentes son chicos y sin dependencias propias -- no porque este demostrado que era el
		// bug. Los modales SI se quedan asincronos: son pesados y no participan del despliegue.
		ExcelDropdownSubmenu,
		ExcelDropdownOptionItem,
	},
	props: {

		model_name: String,

		check_permissions: Boolean,

		can_create: Boolean,

		has_permission_create_dropdown: Boolean,

	},

	data() {
		return {
			// Popper en fixed para que el menú no quede limitado por el ancho del botón split.
			//
			// 🔴 gpuAcceleration: false NO es una micro-optimizacion al reves: es lo que permite que
			// el submenu de Importacion/Exportacion viva adentro del menu. Popper 1.16 posiciona por
			// defecto con `transform: translate3d(...)`, y un elemento transformado se vuelve el
			// bloque contenedor de sus descendientes `position: fixed` -- o sea que el submenu,
			// aunque sea fixed, quedaba anclado al menu y recortado por su overflow. Esa es la razon
			// por la que alguien termino moviendo el <ul> del submenu a document.body con
			// appendChild, y de ahi salia el bug de que el menu se rompiera entero al pasar el
			// mouse: un nodo movido por afuera deja al patching de Vue 2 comparando contra hermanos
			// que ya no estan donde cree. Con esto Popper posiciona con top/left, no hay transform,
			// el fixed vuelve a anclarse al viewport y el submenu no necesita escaparse de ningun
			// lado. Un menu que no se anima no pierde nada por no ir por GPU.
			//
			// 🔴 Y va adentro de `modifiers.computeStyle`, NO en el nivel superior. Popper 1.16 lee
			// esa opcion del objeto del MODIFIER (`runModifiers` invoca `fn(data, modifier)`), asi
			// que un `gpuAcceleration: false` suelto arriba queda en `this.options` y no lo mira
			// nadie: el menu conserva el transform y todo esto no hace nada. `positionFixed` si es
			// opcion de nivel superior, por eso conviven en niveles distintos. BootstrapVue mergea
			// popper-opts con mergeDeep, asi que declarar solo computeStyle no pisa el resto de los
			// modifiers por defecto.
			dropdown_popper_opts: {
				positionFixed: true,
				modifiers: {
					computeStyle: {
						gpuAcceleration: false,
					},
				},
			},
		}
	},

	methods: {

		/**
		 * Encola una nueva exportación Excel del modelo actual.
		 *
		 * @return {void}
		 */
		exportModels() {

			this.$api.get(this.model_name + '/excel/export')

			.then(() => {

				this.$toast.success('La exportacion se esta procesando. Te avisaremos cuando el excel este listo.', {

					duration: 4000,

				})

			})

			.catch(() => {

				this.$toast.error('No se pudo iniciar la exportacion de excel', {

					duration: 4000,

				})

			})

		},

		/**
		 * Abre el modal de historial de exportaciones del modelo actual.
		 *
		 * @return {void}
		 */
		open_export_history() {
			this.$bvModal.show('export-history')
		},

		/**
		 * Abre el modal de historial de importaciones del modelo actual.
		 *
		 * @return {void}
		 */
		open_import_history() {
			this.$bvModal.show('import-history')
		},

		/**
		 * Abre el modal de importación asistida por IA según el model_name.
		 *
		 * @return {void}
		 */
		open_ai_import() {
			// nextTick heredado, y NO SE POR QUE HACE FALTA. Lo dejo porque sacarlo es un cambio de
			// comportamiento que esta mision no pidio, pero que quede claro que es lo unico que lo
			// sostiene:
			//   - el comentario original decia "el submenu teleportado puede cerrar el dropdown en
			//     el mismo tick del click". Ese teleport ya no existe.
			//   - la explicacion obvia de reemplazo tampoco es cierta: BDropdownItem.closeDropdown()
			//     difiere el hide con requestAnimationFrame, o sea DESPUES de cualquier microtarea
			//     de $nextTick; y el modal es HERMANO del b-dropdown, no descendiente, asi que
			//     cerrar el dropdown no puede desmontarlo.
			// Si alguien lo saca y nada se rompe, era esto.
			let modal_id = this.ai_import_modal_id
			let self = this
			this.$nextTick(function () {
				self.$bvModal.show(modal_id)
			})
		},

		/**
		 * Abre el historial de actualizaciones masivas (solo artículos).
		 *
		 * @return {void}
		 */
		open_masive_update_history() {
			this.$bvModal.show('masive-update-history')
		},

		/**
		 * Abre el historial de imágenes inteligentes (solo artículos).
		 *
		 * @return {void}
		 */
		open_smart_images_history() {
			this.$bvModal.show('smart-images-history')
		},

		/**
		 * Acción del botón principal split: crear registro si hay permiso.
		 *
		 * @return {void}
		 */
		call_set_model() {
			if (this.can_create) {

				this.setModel(null, this.model_name)

			}

		},

	},

	computed: {

		/**
		 * Permiso de exportación Excel según check_permissions y can().
		 *
		 * @return {boolean}
		 */
		can_export() {

			if (!this.check_permissions || this.can(this.model_name + '.excel.export')) {

				return true

			} 

			return false 

		},

		/**
		 * Permiso de importación: hoy gobierna el ítem "Historial de importaciones" y el montaje
		 * del modal `import-history`. El flujo clásico ya no existe en estas pantallas.
		 *
		 * @return {boolean}
		 */
		can_import() {
			if (!this.check_permissions || this.can(this.model_name + '.excel.import')) {
				return true
			}
			return false
		},

		/**
		 * True si el modelo actual soporta importación con IA (artículos, clientes, proveedores).
		 *
		 * @return {boolean}
		 */
		can_import_ai() {
			let models_with_ai = ['article', 'client', 'provider']
			return models_with_ai.indexOf(this.model_name) !== -1
		},

		/**
		 * ID del modal de importación IA según model_name (compatible con instancias existentes).
		 *
		 * @return {string}
		 */
		ai_import_modal_id() {
			if (this.model_name === 'article') {
				return 'ai-excel-import-modal'
			}
			return 'ai-' + this.model_name + '-excel-import-modal'
		},

		/**
		 * Muestra el submenú Exportación cuando hay permiso de exportar.
		 *
		 * @return {boolean}
		 */
		show_export_submenu() {
			return this.can_export
		},

		/**
		 * Muestra el submenú Importación si hay al menos una opción hija visible.
		 *
		 * @return {boolean}
		 */
		show_import_submenu() {
			return this.can_import || this.can_import_ai
		},

		/**
		 * Historial de actualizaciones masivas solo aplica al listado de artículos.
		 *
		 * @return {boolean}
		 */
		show_masive_update_history() {
			return this.model_name === 'article'
		},

		/**
		 * Historial de imágenes inteligentes solo aplica al listado de artículos. Es un computed
		 * distinto de `show_masive_update_history` a propósito: hoy comparten el mismo criterio
		 * pero son condiciones independientes que pueden divergir a futuro.
		 *
		 * @return {boolean}
		 */
		show_smart_images_history() {
			return this.model_name === 'article'
		},
	}
}
</script>

<!--
	Sin <style> propio: el tratamiento de .excel-create-dropdown-menu (ancho, alto maximo, overflow
	y padding) es el mismo de los otros dos menus del listado y vive en
	src/sass/_menus_desplegables.sass desde la mision 28. Tenerlo aca era la mitad del bug del scroll
	horizontal: el de Crear declaraba overflow-x y max-width, y los otros dos no.
-->
