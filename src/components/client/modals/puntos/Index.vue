<template>
<b-modal
id="puntos-cliente"
size="xl"
body-class="p-0"
hide-footer
:title="titulo"
@hidden="al_cerrar">

	<saldo :valor_punto="valor_punto"></saldo>

	<div class="puntos-cliente__barra">
		<b-button
		size="sm"
		:variant="mostrar_ajuste ? 'secondary' : 'outline-primary'"
		@click="mostrar_ajuste = !mostrar_ajuste">
			<i class="bi bi-sliders m-r-5"></i>
			<span v-if="mostrar_ajuste">Cerrar el ajuste</span>
			<span v-else>Ajustar puntos a mano</span>
		</b-button>
	</div>

	<ajuste-manual
	v-if="mostrar_ajuste"
	:client_id="client_id"
	@ajustado="ajustado"></ajuste-manual>

	<list @pagina="cargar"></list>

</b-modal>
</template>
<script>
/**
 * Modal "Puntos" de un cliente: el saldo arriba y el libro de movimientos abajo.
 *
 * Es el hermano conceptual del modal de cuenta corriente
 * (`common/current-acounts/Index.vue`) y está armado con la misma forma: se monta UNA sola vez
 * en la vista (`views/Client.vue`, como hermano de `<clients>`) y se abre por id. Adentro del
 * slot de la tabla se instanciaría una vez por fila, que es el error que ya documenta
 * `common/BtnActividadCliente.vue`.
 *
 * 🔴 A QUIÉN MIRA SE RECIBE POR EL BUS DE $root Y NO POR UNA PROP.
 * El botón que lo abre vive en `client/components/clients/Index.vue`, adentro del slot
 * `table_left_options` del `<view-component>`, o sea en otro subárbol: no hay relación de
 * padre/hijo por donde bajar una prop. La alternativa era guardar el nombre del cliente en
 * `store/puntos.js`, pero ese store lo construye U8 y no tiene dónde: guarda `client_id` y
 * nada más. `$root.$emit` ya es el mecanismo del repo para este mismo problema
 * (`vender:expand-stage1`, `open-change-provider-modal`).
 *
 * El pedido lo dispara ESTE componente y no el botón, igual que el modal de actividad: así el
 * único lugar que sabe cómo se carga esta pantalla es esta pantalla, y cambiar de página reusa
 * exactamente el mismo camino que abrirla.
 *
 * 🔴 `valor_punto` VIVE ACÁ Y NO EN EL STORE, y no es por comodidad: la acción
 * `puntos/getCliente` de U8 commitea el saldo, lo que vence y los movimientos, pero NO
 * `valor_punto` ni `equivalencia_pesos`, que el endpoint sí manda. Se toma del payload que la
 * acción devuelve y baja como prop a `<saldo>`. Tocar el store es de U8, no de esta unidad.
 */
export default {
	components: {
		Saldo: () => import('@/components/client/modals/puntos/Saldo'),
		List: () => import('@/components/client/modals/puntos/List'),
		AjusteManual: () => import('@/components/client/modals/puntos/AjusteManual'),
	},
	data() {
		return {
			client_id: null,
			nombre: '',
			/*
				Pesos que vale un punto en el programa activo. Es config del programa: no cambia
				entre páginas ni después de un ajuste, así que alcanza con leerlo en la primera
				carga.
			*/
			valor_punto: 0,
			mostrar_ajuste: false,
		}
	},
	created() {
		this.$root.$on('puntos-cliente:abrir', this.abrir)
	},
	beforeDestroy() {
		// El bus de $root es global: sin el $off, cambiar de vista y volver deja dos escuchas
		// vivas y cada click del botón dispararía dos pedidos.
		this.$root.$off('puntos-cliente:abrir', this.abrir)
	},
	computed: {
		titulo() {
			if (this.nombre) {
				return 'Puntos de ' + this.nombre
			}
			return 'Puntos del cliente'
		},
	},
	methods: {
		/**
		 * Abre el modal para un cliente. Lo llama el bus de $root desde el botón de la fila.
		 *
		 * @param {Object} payload
		 * @param {Number} payload.client_id
		 * @param {String} payload.nombre
		 */
		abrir(payload) {
			if (!payload || !payload.client_id) {
				return
			}
			this.client_id = payload.client_id
			this.nombre = payload.nombre ? payload.nombre : ''
			this.mostrar_ajuste = false
			this.valor_punto = 0
			// El pedido va ANTES del show y no en un `@show`: el modal es lazy, así que al
			// abrirlo el cuerpo se monta con lo que ya haya en el store. Pedir primero evita
			// que aparezca por un instante el saldo del cliente anterior.
			this.cargar(1)
			this.$bvModal.show('puntos-cliente')
		},
		/**
		 * Pide la ficha: saldo, lo que vence en 90 días y una página del libro.
		 *
		 * @param {Number} page
		 */
		cargar(page) {
			if (!this.client_id) {
				return
			}
			let self = this
			this.$store.dispatch('puntos/getCliente', {
				client_id: this.client_id,
				page: page ? page : 1,
			})
			.then(function (data) {
				if (data) {
					self.valor_punto = Number(data.valor_punto) || 0
				}
			})
		},
		/**
		 * El ajuste ya lo recargó todo: la acción `puntos/ajuste` vuelve a pedir la ficha por su
		 * cuenta. Acá solo se cierra el formulario, para que se vea el movimiento nuevo arriba
		 * de todo en la lista.
		 */
		ajustado() {
			this.mostrar_ajuste = false
		},
		al_cerrar() {
			this.client_id = null
			this.nombre = ''
			this.valor_punto = 0
			this.mostrar_ajuste = false
			// Deja el saldo en cero: si no, el próximo cliente que se abra muestra los puntos
			// del anterior durante todo el ida y vuelta del pedido.
			this.$store.commit('puntos/limpiarCliente')
		},
	},
}
</script>
<style lang="sass" scoped>
// Los colores salen SIEMPRE de tokens y nunca de hexadecimales: los modales de bootstrap-vue se
// montan colgando de body, FUERA de #app, y un hex deja el modal blanco en modo oscuro. Es la
// misma regla que documenta el encabezado del modal de cuenta corriente.
.puntos-cliente__barra
	display: flex
	justify-content: flex-end
	padding: 10px 20px 0 20px
</style>
