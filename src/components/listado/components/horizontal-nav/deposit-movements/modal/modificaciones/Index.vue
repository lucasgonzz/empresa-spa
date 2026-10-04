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
		@show="al_mostrar"
		@hidden="al_ocultar">
			<p
			class="text-muted">
				Cada fila es una vez que alguien agregó, quitó o cambió la cantidad de algún artículo de
				este movimiento después de crearlo.
			</p>

			<!--
				Spinner mientras se pide el historial Y mientras todavia no se sabe de que movimiento
				es (`id_cargado` en null): sin esto, en el instante entre abrir el modal y que llegue
				el movimiento por prop se veia "no tiene modificaciones", que es mentira.
			-->
			<b-table
			v-if="!mostrar_spinner"
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
			/**
			 * Hay un pedido del historial en vuelo.
			 */
			loading: false,
			/**
			 * El modal esta abierto (true entre su `show` y su `hidden`). El `watch` del movimiento
			 * solo carga con el modal abierto.
			 */
			visible: false,
			/**
			 * Id del movimiento cuyo historial esta cargado o pidiendose. null = todavia nada (al
			 * abrir, o despues de cerrar). Sirve para no pedir dos veces lo mismo y para descartar
			 * la respuesta de un pedido que ya no corresponde.
			 */
			id_cargado: null,
		}
	},
	watch: {
		/**
		 * 🔴 Por que hace falta este watch (defecto visto en vivo en s8, 3/10/2026): la pantalla
		 * que monta el historial setea el movimiento y abre el modal en el `$nextTick`, pero este
		 * componente vive adentro del contenido de otro b-modal (`#deposit-movements`), que
		 * BootstrapVue lleva por su portal y re-renderiza un tick mas tarde. Resultado: el `show`
		 * llegaba ANTES que el prop, la carga salia por "no hay movimiento" y el modal mostraba
		 * "no tiene modificaciones" aunque el backend devolviera una. La segunda vez andaba porque
		 * el prop ya estaba.
		 *
		 * En vez de adivinar cuantos ticks esperar, la carga se dispara por los dos lados y gana
		 * el que llegue con el dato: el `show` si el movimiento ya esta, y este watch si el
		 * movimiento llega (o cambia) con el modal ya abierto. `cargar_modificaciones()` no repite
		 * un pedido para el mismo id.
		 *
		 * @param {Number|null} id id del movimiento nuevo.
		 * @returns {void}
		 */
		id_del_movimiento(id) {
			if (this.visible && id) {
				this.cargar_modificaciones(id)
			}
		},
	},
	computed: {
		/**
		 * Id del movimiento que llega por prop, o null si todavia no hay ninguno. Se observa el id
		 * y no el objeto: si el store reemplaza la fila por otra con el mismo id (por ejemplo al
		 * guardar el movimiento), no hay nada nuevo que pedir.
		 *
		 * @returns {Number|null}
		 */
		id_del_movimiento() {
			if (this.deposit_movement && this.deposit_movement.id) {
				return this.deposit_movement.id
			}
			return null
		},
		/**
		 * Spinner en vez de la tabla: mientras hay un pedido en vuelo, o mientras todavia no se
		 * sabe de que movimiento es el historial.
		 *
		 * @returns {Boolean}
		 */
		mostrar_spinner() {
			return this.loading || !this.id_cargado
		},
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
		 * `@show` del propio <b-modal> (show, no shown: el spinner tiene que estar desde el primer
		 * pintado). Marca el modal como abierto y, si el movimiento ya llego por prop, pide su
		 * historial. Si todavia no llego, lo pide el watch de `id_del_movimiento` cuando llegue.
		 *
		 * 🔴 No se usa `this.$root.$on('bv::modal::show')`: darlo de baja con un `$off` sin handler
		 * borra del bus global los listeners de ese evento de TODOS los componentes (es la fuga
		 * que quedo documentada en ventas/modals/sale-modifications/Index.vue). Un evento del propio
		 * modal muere con el componente y no necesita baja ninguna.
		 *
		 * @returns {void}
		 */
		al_mostrar() {
			this.visible = true
			if (this.id_del_movimiento) {
				this.cargar_modificaciones(this.id_del_movimiento)
			}
		},
		/**
		 * `@hidden` del propio <b-modal>: lo marca cerrado y olvida lo cargado, asi la proxima vez
		 * que se abra (aunque sea el mismo movimiento) se pide el historial de nuevo, con lo ultimo
		 * que haya. Si quedo un pedido en vuelo, su respuesta se descarta (ver
		 * `cargar_modificaciones`).
		 *
		 * @returns {void}
		 */
		al_ocultar() {
			this.visible = false
			this.id_cargado = null
			this.loading = false
			this.modificaciones = []
		},
		/**
		 * Pide el historial de un movimiento: `GET deposit-movement-modifications/{id}`.
		 *
		 * - Si ese id ya esta cargado o pidiendose, no hace nada: el `show` y el watch pueden
		 *   llegar los dos con el mismo movimiento y no tiene que salir dos veces el mismo pedido.
		 * - Vacia la lista antes de pedir y prende el spinner, para que no se vea ni un instante el
		 *   historial del movimiento anterior ni el texto de "no tiene modificaciones".
		 * - Si mientras tanto se pidio OTRO movimiento (o se cerro el modal), la respuesta de este
		 *   pedido se descarta: `id_cargado` ya no es este id. Puede pasar si el `show` llega con el
		 *   movimiento anterior todavia en el prop y el nuevo llega despues por el watch.
		 *
		 * Los errores 4xx los muestra el manejador global (common-vue/components/error/Index.vue).
		 *
		 * @param {Number} deposit_movement_id id del movimiento.
		 * @returns {void}
		 */
		cargar_modificaciones(deposit_movement_id) {
			if (!deposit_movement_id || this.id_cargado == deposit_movement_id) {
				return
			}
			let self = this
			this.id_cargado = deposit_movement_id
			this.modificaciones = []
			this.loading = true
			this.$api.get('deposit-movement-modifications/' + deposit_movement_id)
			.then(function (res) {
				if (self.id_cargado != deposit_movement_id) {
					return
				}
				self.loading = false
				self.modificaciones = res.data.models
			})
			.catch(function (err) {
				if (self.id_cargado != deposit_movement_id) {
					return
				}
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
