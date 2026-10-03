<template>
	<!--
		Historial de modificaciones de articulos de un movimiento de deposito (mision
		movimientos-deposito-auditoria, 3/10/2026). Mismo esquema que el de ventas
		(ventas/modals/sale-modifications/): una fila por modificacion, con quien y cuando, cuantos
		articulos habia antes y despues, y un boton "Ver" que abre el detalle de esa modificacion.

		Una modificacion es CADA vez que alguien agrego, quito o cambio la cantidad de algun articulo
		despues de crear el movimiento. Crear el movimiento no cuenta.

		El `id` del modal viene por prop: lo monta el modal del listado y tambien el de alertas, y dos
		b-modal con el mismo id se abririan juntos con un solo `$bvModal.show()`.
	-->
	<div>
		<articulos-de-la-modificacion
		:id="id + '-articulos'"
		:modificacion="modificacion_elegida"></articulos-de-la-modificacion>

		<b-modal
		hide-footer
		size="lg"
		:title="titulo"
		:id="id"
		@show="cargar_modificaciones">
			<p
			class="text-muted">
				Cada fila es una vez que alguien agregó, quitó o cambió la cantidad de algún artículo de
				este movimiento después de crearlo.
			</p>

			<b-table
			v-if="!loading"
			head-variant="dark"
			responsive
			show-empty
			empty-text="Este movimiento no tiene modificaciones de artículos."
			:fields="fields"
			:items="items">
				<template #cell(detalles)="data">
					<b-button
					variant="primary"
					size="sm"
					:data-testid="'ver-modificacion-deposito-'+data.item.id"
					@click="ver_modificacion(data.item.id)">
						Ver
					</b-button>
				</template>
			</b-table>
			<div
			v-else
			class="all-center-md">
				<b-spinner
				variant="primary"></b-spinner>
			</div>
		</b-modal>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	components: {
		ArticulosDeLaModificacion: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/modificaciones/ArticulosDeLaModificacion'),
	},
	props: {
		/**
		 * Id del b-modal del historial. El del detalle de una modificacion es este mas
		 * '-articulos'.
		 */
		id: {
			type: String,
			default: 'deposit-movement-modifications',
		},
		/**
		 * El movimiento de deposito cuyo historial se muestra. Lo elige la pantalla que monta el
		 * modal, al apretar "Modificaciones (N)" en una fila.
		 */
		deposit_movement: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			modificaciones: [],
			modificacion_elegida: null,
			loading: false,
		}
	},
	computed: {
		/**
		 * Titulo del modal con el numero del movimiento.
		 *
		 * @returns {String}
		 */
		titulo() {
			if (this.deposit_movement && this.deposit_movement.id) {
				return 'Modificaciones de artículos del movimiento N° ' + this.deposit_movement.num
			}
			return 'Modificaciones de artículos'
		},
		/**
		 * Columnas de la tabla del historial.
		 *
		 * @returns {Array}
		 */
		fields() {
			return [
				{
					key: 'empleado',
					label: 'Quién',
				},
				{
					key: 'fecha',
					label: 'Cuándo',
				},
				{
					key: 'articulos_antes',
					label: 'Artículos antes',
				},
				{
					key: 'articulos_despues',
					label: 'Artículos después',
				},
				{
					key: 'detalles',
					label: '',
				},
			]
		},
		/**
		 * Filas del historial, en el orden en que las manda el backend (de la mas vieja a la mas
		 * nueva).
		 *
		 * @returns {Array}
		 */
		items() {
			let items = []
			this.modificaciones.forEach(modificacion => {
				items.push({
					id: modificacion.id,
					empleado: modificacion.user ? modificacion.user.name : 'Sin dato',
					fecha: moment(modificacion.created_at).format('DD/MM/YYYY HH:mm'),
					articulos_antes: modificacion.articulos_antes ? modificacion.articulos_antes.length : 0,
					articulos_despues: modificacion.articulos_despues ? modificacion.articulos_despues.length : 0,
				})
			})
			return items
		},
	},
	methods: {
		/**
		 * Trae el historial al abrirse el modal. La dispara el `@show` del propio <b-modal> (show,
		 * no shown: el spinner tiene que estar desde el primer pintado).
		 *
		 * 🔴 No se usa `this.$root.$on('bv::modal::show')`: darlo de baja con un `$off` sin handler
		 * borra del bus global los listeners de ese evento de TODOS los componentes (es la fuga
		 * que quedo documentada en ventas/modals/sale-modifications/Index.vue). Un evento del propio
		 * modal muere con el componente y no necesita baja ninguna.
		 *
		 * Vacia la lista antes de pedir, para que no se vea un instante el historial del movimiento
		 * que se abrio antes.
		 *
		 * @returns {void}
		 */
		cargar_modificaciones() {
			if (this.loading || !this.deposit_movement || !this.deposit_movement.id) {
				return
			}
			let self = this
			this.modificaciones = []
			this.loading = true
			this.$api.get('deposit-movement-modifications/' + this.deposit_movement.id)
			.then(function (res) {
				self.loading = false
				self.modificaciones = res.data.models
			})
			.catch(function (err) {
				self.loading = false
				console.log(err)
			})
		},
		/**
		 * Abre el detalle (articulos antes y despues) de una modificacion del historial.
		 *
		 * El `$nextTick` es para que el modal del detalle ya tenga la modificacion elegida en su
		 * prop cuando se abre.
		 *
		 * @param {Number} modificacion_id id de la modificacion elegida.
		 * @returns {void}
		 */
		ver_modificacion(modificacion_id) {
			let self = this
			this.modificacion_elegida = this.modificaciones.find(modificacion => modificacion.id == modificacion_id)
			this.$nextTick(function () {
				self.$bvModal.show(self.id + '-articulos')
			})
		},
	},
}
</script>
