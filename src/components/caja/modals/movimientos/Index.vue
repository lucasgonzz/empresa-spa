<template>
	<b-modal
	size="lg"
	:title="title"
	hide-footer
	id="movimientos-caja">
		<!--
			listado_paginado_por_defecto en false: este modal ya carga los movimientos
			scopeados por la apertura elegida (route_prefix = apertura_caja.id +
			movimiento_caja/getModels, ver clicked() en aperturas/Index.vue) antes de
			abrirse. Mismo problema que en aperturas/Index.vue: movimiento_cajas tampoco
			tiene columna user_id, asi que el runListadoPorDefecto del grupo 221 rompe con
			500 apenas monta. Ver hallazgo 20260810-buscador-general-modelos-sin-user-id.

			show_actualizar_option en false: sin la opción masiva "Actualizar" en los menús de
			seleccionados y filtrados. Un movimiento se corrige de a uno, y solo si es manual y del
			turno abierto; `PUT update/movimiento_caja` no mira nada de eso y la API lo rechaza con
			422 (misión movimientos-caja-manuales, 9/10/2026). "Eliminar" masivo sigue: pasa por el
			`destroy` de cada fila, que sí aplica las reglas.
		-->
		<view-component
		@modelSaved="actualizar_info"
		@modelDeleted="actualizar_info"
		:set_model_on_row_selected="false"
		@clicked="clicked"
		:show_actualizar_option="false"
		:show_btn_save="show_btn_save"
		:props_to_send_on_save="props_to_send_on_save"
		:listado_paginado_por_defecto="false"
		model_name="movimiento_caja">
			<template #header>
				<info-apertura-caja></info-apertura-caja>
			</template>

			<template #table-prop-concepto_movimiento_caja_id="props">
				<btn-concepto
				:movimiento_caja="props.model"></btn-concepto>
			</template>

			<!--
				Los montos de ingreso y egreso salian los dos en negro y una celda vacia no se
				distinguia de un cero. El guion largo marca "no hay monto".
			-->
			<template #table-prop-ingreso="props">
				<span
				v-if="props.model.ingreso"
				class="movimiento-monto movimiento-monto--ingreso">
					{{ price(props.model.ingreso) }}
				</span>
				<span
				v-else
				class="movimiento-monto--vacio">—</span>
			</template>

			<template #table-prop-egreso="props">
				<span
				v-if="props.model.egreso"
				class="movimiento-monto movimiento-monto--egreso">
					{{ price(props.model.egreso) }}
				</span>
				<span
				v-else
				class="movimiento-monto--vacio">—</span>
			</template>
		</view-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		InfoAperturaCaja: () => import('@/components/caja/modals/movimientos/InfoAperturaCaja'),
		BtnConcepto: () => import('@/components/caja/modals/movimientos/BtnConcepto'),
	},
	computed: {
		caja() {
			return this.$store.state.caja.model 
		},
		movimiento_caja() {
			return this.$store.state.movimiento_caja.model 
		},
		title() {
			if (this.caja) {
				return 'Movimientos de '+this.caja.name
			}
		},
		/*
			"Guardar" se muestra en un alta y también al editar un movimiento: un movimiento manual
			del turno abierto se puede CORREGIR, no solo eliminar (decisión de Lucas, misión
			movimientos-caja-manuales, 9/10/2026). Antes era solo `id === null`, así que al abrir un
			movimiento existente quedaban "×" y "Eliminar" nada más.

			Al editar se muestra SOLO si la API dice explícitamente `editable === true`. Una venta, un
			gasto, un pago, una transferencia o una compensación llegan con `editable === false` y ni
			siquiera se abren (los frena `clicked()`).

			🔴 Con una API vieja, que no manda `editable`, NO se muestra: queda como antes, sin
			"Guardar" al editar. El `update` viejo guarda la fila y después revienta con 500 al
			recalcular los saldos, así que dejaba la caja descuadrada (medido en el chequeo de la
			misión). Corregir un movimiento existe solo contra la API que lo valida.

			El estado inicial del store es `{}` (sin id): ahí no hay ningún formulario abierto y se
			devuelve false, igual que antes.
		*/
		show_btn_save() {
			if (this.movimiento_caja.id === null) {
				return true
			}
			if (!this.movimiento_caja.id) {
				return false
			}
			return this.movimiento_caja.editable === true
		},
		props_to_send_on_save() {
			if (this.caja) {

				return [
					{
						key: 'caja_id',
						value: this.caja.id,
					},
					{
						key: 'apertura_caja_id',
						value: this.caja.current_apertura_caja_id,
					}
				]
			}
		},
	},
	methods: {
		/*
			Abre el formulario de un movimiento solo si se puede corregir o eliminar a mano.

			Quién decide es la API (misión movimientos-caja-manuales, 9/10/2026): cada fila de
			`GET movimiento-caja/{apertura}` trae `editable` y `motivo_no_editable`, y el back
			rechaza con 422 el `update` y el `destroy` de lo que no es manual. Acá solo se evita
			abrir un formulario que después no va a poder guardar ni eliminar.

			Orden de las guardas:
			1. Apertura cerrada: se mantiene del lado del front porque compara contra la caja que
			   está en pantalla, y es lo primero que tiene que leer el usuario.
			2. API nueva (`editable` viene): si es `false`, se muestra el motivo que manda el back.
			3. API vieja (`editable` es `undefined`): las tres guardas de siempre, por `sale_id`,
			   `expense_id` y `current_acount_id`, con sus textos originales. Estuvieron comentadas
			   hasta esta misión, así que la fila de una venta se abría con "Eliminar". Lo que pasa
			   estas guardas se abre como antes, solo con "Eliminar": sin `editable === true` no hay
			   "Guardar" (ver `show_btn_save`).
		*/
		clicked(movimiento_caja) {

			if (movimiento_caja.apertura_caja_id != this.caja.current_apertura_caja_id) {

				this.$toast.error('No se pueden editar movimientos de una apertura ya cerrada')
				return
			}

			if (movimiento_caja.editable === false) {
				this.$toast.error(movimiento_caja.motivo_no_editable || 'Este movimiento no se puede editar desde la caja.')
				return
			}

			if (typeof movimiento_caja.editable == 'undefined') {

				if (movimiento_caja.sale_id) {
					this.$toast.error('No pueden actualizar los movimientos originados desde una VENTA')
					return
				}

				if (movimiento_caja.expense_id) {
					this.$toast.error('No pueden actualizar los movimientos originados desde un GASTO')
					return
				}

				if (movimiento_caja.current_acount_id) {
					this.$toast.error('No pueden actualizar los movimientos originados desde un PAGO de Cuenta Corriente')
					return
				}
			}

			// Una copia y no la fila: movimiento_caja tiene full_reactivity, asi que el form edita el
			// modelo del store, y con la fila misma lo que se tipee en un movimiento ya guardado y se
			// cierre sin guardar quedaria pintado en la tabla como si se hubiera guardado.
			this.setModel({...movimiento_caja}, 'movimiento_caja')
		},
		actualizar_info(movimiento_caja) {
			console.log('actualizar_info, movimiento_caja:')
			console.log(movimiento_caja)

			if (typeof movimiento_caja == 'undefined') {
				// Es porque se elimino y no viene por parametro
				movimiento_caja = this.$store.state.movimiento_caja.delete
				console.log('ahora:')
				console.log(movimiento_caja)
			}

			this.$store.dispatch('movimiento_caja/getModels')
			this.loadModel('caja', movimiento_caja.caja_id)
			this.loadModel('apertura_caja', movimiento_caja.apertura_caja_id, '/show/')
			.then(() => {

				let current_apertura_caja = this.$store.state.apertura_caja.models[0]
				this.$store.commit('apertura_caja/setModel', {model: current_apertura_caja, properties: []})
			})


			// this.$bvModal.hide('movimientos-caja')
			// this.$bvModal.show('movimientos-caja')
		}
	}
}
</script>
<style scoped lang="sass">
// Funciona con scoped aunque las clases se usen dentro de la tabla: en Vue 2 el contenido de
// un slot se compila en el scope del componente que lo escribe, o sea este, asi que recibe
// este scope id y no el de common-vue.
.movimiento-monto
	font-weight: 600

	&--ingreso
		color: var(--caja-abierta-texto)

	&--egreso
		color: var(--caja-cerrar-texto)

	&--vacio
		color: var(--color-text-secondary)
</style>