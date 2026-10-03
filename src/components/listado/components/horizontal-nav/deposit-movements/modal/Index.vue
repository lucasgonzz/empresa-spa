<template>
	<b-modal
	title="Movimientos de Depositos"
	hide-footer
	size="lg"
	id="deposit-movements">
		<div>
			<view-component 
			model_name="deposit_movement"
			order_list_by="deposit_movement_status"
			change_from_dates_option
			:check_permissions="false"
			:show_btn_save="mostrar_btn_guardar"
			:show_btn_delete="mostrar_btn_eliminar"
			:show_previus_days="show_previus_days">

				<template #modal_buttons>
					<pdf-button></pdf-button>		
				</template>

				<!--
					Mision movimientos-deposito-auditoria (3/10/2026): arriba del formulario, el aviso
					"Stock movido el ... por ..." cuando el stock del movimiento ya se movio.
				-->
				<template #model_modal_header="{ model }">
					<aviso-stock-movido
					:model="model"></aviso-stock-movido>
				</template>

				<!--
					🔴 Slot `#articles` CON FALLBACK (mision movimientos-deposito-auditoria, 3/10/2026).

					view/Index.vue y model/Index.vue reenvian a ModelForm un slot por cada `prop.key`,
					y ModelForm dibuja `<slot :name="prop.key">` con el buscador + la tabla editable
					como contenido POR DEFECTO. La tabla de la relacion no tiene modo de solo lectura,
					asi que cuando los articulos estan bloqueados (stock movido, o sin el permiso
					`deposit_movement.update_articles`) este slot la reemplaza por
					ArticulosSoloLectura.

					Cuando NO estan bloqueados, el `v-if` en false hace que el slot devuelva un unico
					nodo comentario, y Vue (2.6+; aca 2.7.14) normaliza ese resultado a `undefined`
					(`normalizeScopedSlot` en vue.runtime.esm.js: "res.length === 1 &&
					vnode.isComment" -> undefined). Un slot que devuelve `undefined` en cada salto del
					reenvio (view/Index -> model/Index -> ModelForm) termina en `renderSlot` de ModelForm
					como "slot vacio", y ahi cae el contenido por defecto: el buscador y la tabla
					editable de siempre. Es el mismo camino por el que hoy cualquier campo sin slot
					propio sigue mostrando su input, aunque los dos componentes reenvien todas las keys.

					El `v-if` va en el HIJO y no en el <template>: la condicion necesita el `model` del
					scope del slot, y un `v-if` en el <template v-slot> se evalua en el scope de esta
					vista, sin el `model`.
				-->
				<template #articles="{ model }">
					<articulos-solo-lectura
					v-if="deposit_movement_articulos_bloqueados(model)"
					:model="model"></articulos-solo-lectura>
				</template>

				<!--
					Acciones de cada fila: "Mover stock", "Stock movido" y "Modificaciones (N)".
				-->
				<template #table_left_options="{ model }">
					<acciones-de-fila
					:model="model"
					@ver-modificaciones="ver_modificaciones"></acciones-de-fila>
				</template>

			</view-component>

			<!--
				Historial de modificaciones de articulos: uno solo para toda la tabla. Lo abre
				"Modificaciones (N)" de cada fila, via `ver_modificaciones`.
			-->
			<modificaciones
			id="deposit-movement-modifications"
			:deposit_movement="movimiento_del_historial"></modificaciones>
		</div>
	</b-modal>
</template>
<script> 
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		PdfButton: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/PdfButton'),
		AvisoStockMovido: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/AvisoStockMovido'),
		ArticulosSoloLectura: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/ArticulosSoloLectura'),
		AccionesDeFila: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/acciones-de-fila/Index'),
		Modificaciones: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/modificaciones/Index'),
	},
	data() {
		return {
			/**
			 * Movimiento cuyo historial de modificaciones se esta mirando (lo elige
			 * `ver_modificaciones`).
			 */
			movimiento_del_historial: null,
		}
	},
	computed: {
		show_previus_days() {
			return this.$store.state.deposit_movement.from_dates
		},
		model() {
			return this.$store.state.deposit_movement.model
		},
		/**
		 * Si el formulario muestra "Guardar y cerrar".
		 *
		 * En un alta siempre (crear un movimiento no pide permiso). Con un movimiento ya creado, si
		 * el usuario puede editar algo: los datos (`deposit_movement.update`) o los articulos
		 * (`deposit_movement.update_articles`). El dueño pasa siempre.
		 *
		 * Antes se escondia con el estado "Recibido" (id 2), que era el que movia el stock. Ahora el
		 * stock lo mueve el boton "Mover stock" y, con el stock movido, igual se pueden cambiar el
		 * estado, el empleado y las notas: lo que se bloquea campo por campo es el resto (ver los
		 * `disabled_function` de src/models/deposit_movement.js).
		 *
		 * @returns {Boolean}
		 */
		mostrar_btn_guardar() {
			if (!this.model.id) {
				return true
			}
			return this.can('deposit_movement.update') || this.can('deposit_movement.update_articles')
		},
		/**
		 * Si el formulario muestra "Eliminar": no, si el stock del movimiento ya se movio (borrarlo
		 * no devuelve el stock, y el backend lo rechaza con un 422). "Ya se movio" incluye el
		 * `recibido_at` del frente viejo: criterio unico en `deposit_movement_stock_movido`
		 * (src/mixins/model_functions.js).
		 *
		 * @returns {Boolean}
		 */
		mostrar_btn_eliminar() {
			return !this.deposit_movement_stock_movido(this.model)
		},
	},
	methods: {
		/**
		 * Abre el historial de modificaciones de articulos de un movimiento. La dispara el boton
		 * "Modificaciones (N)" de la fila.
		 *
		 * El `$nextTick` NO garantiza que el historial ya tenga el movimiento en su prop cuando se
		 * dispara su `@show`: este modal viaja por el portal de BootstrapVue y el prop puede llegar
		 * un tick despues (visto en vivo el 3/10/2026). Por eso el historial pide los datos tanto
		 * en su `show` como cuando le cambia el movimiento con el modal abierto: anda en cualquier
		 * orden (ver modificaciones/Index.vue).
		 *
		 * @param {Object} deposit_movement el movimiento de la fila.
		 * @returns {void}
		 */
		ver_modificaciones(deposit_movement) {
			let self = this
			this.movimiento_del_historial = deposit_movement
			this.$nextTick(function () {
				self.$bvModal.show('deposit-movement-modifications')
			})
		},
	},
}
</script>