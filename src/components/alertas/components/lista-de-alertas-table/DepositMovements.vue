<template>
	<div>
		<div
		v-if="view == 'movimientos-de-depositos'">

			<!--
				Mision movimientos-deposito-auditoria (3/10/2026): mismos slots que el modal del
				listado (deposit-movements/modal/Index.vue, donde esta explicado el fallback del slot
				`#articles`). La lista son los movimientos con el stock TODAVIA SIN MOVER del empleado
				(`en_curso`): al mover el stock desde una fila, BtnMoverStock refresca `en_curso` y el
				movimiento sale de aca.
			-->
			<view-component 
			model_name="deposit_movement"
			show_models_if_empty
			:show_btn_create="false"
			:show_btn_delete="false"
			:show_btn_save="mostrar_btn_guardar"
			:check_permissions="false"
			:models_to_show="models_to_show"
			@modelSaved="modelSaved"
			:show_previus_days="false">
				<template #modal_buttons>
					<pdf-button></pdf-button>		
				</template>

				<template #model_modal_header="{ model }">
					<aviso-stock-movido
					:model="model"></aviso-stock-movido>
				</template>

				<template #articles="{ model }">
					<articulos-solo-lectura
					v-if="deposit_movement_articulos_bloqueados(model)"
					:model="model"></articulos-solo-lectura>
				</template>

				<template #table_left_options="{ model }">
					<acciones-de-fila
					:model="model"
					@ver-modificaciones="ver_modificaciones"></acciones-de-fila>
				</template>
			</view-component>

			<!--
				Id propio, distinto del del listado: si las dos pantallas llegaran a estar montadas a
				la vez, un `$bvModal.show()` con el mismo id abriria los dos historiales.
			-->
			<modificaciones
			id="deposit-movement-modifications-alertas"
			:deposit_movement="movimiento_del_historial"></modificaciones>

		</div>
	</div>

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
		models_to_show() {
			return this.$store.state.deposit_movement.en_curso.models 
		},
		model() {
			return this.$store.state.deposit_movement.model
		},
		/**
		 * Si el formulario muestra "Guardar y cerrar": mismo criterio que el modal del listado. Aca
		 * no hay altas (`show_btn_create` en false), asi que es siempre un movimiento ya creado:
		 * hace falta poder editar los datos o los articulos.
		 *
		 * @returns {Boolean}
		 */
		mostrar_btn_guardar() {
			if (!this.model.id) {
				return true
			}
			return this.can('deposit_movement.update') || this.can('deposit_movement.update_articles')
		},
	},
	methods: {
		modelSaved() {
			this.$store.dispatch('deposit_movement/en_curso/getModels')
		},
		/**
		 * Abre el historial de modificaciones de articulos de un movimiento (boton
		 * "Modificaciones (N)" de la fila). Ver el mismo metodo en deposit-movements/modal/Index.vue.
		 *
		 * @param {Object} deposit_movement el movimiento de la fila.
		 * @returns {void}
		 */
		ver_modificaciones(deposit_movement) {
			let self = this
			this.movimiento_del_historial = deposit_movement
			this.$nextTick(function () {
				self.$bvModal.show('deposit-movement-modifications-alertas')
			})
		},
	},
}
</script>