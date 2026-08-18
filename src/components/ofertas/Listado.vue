<template>
	<div class="ofertas-listado">

		<div class="j-between align-center p-t-15 m-b-15">
			<h4 class="m-b-0">
				Ofertas por cliente
			</h4>
			<div class="j-end align-center">
				<b-button
				class="m-r-10"
				variant="outline-secondary"
				title="Actualizar"
				@click="refrescar">
					<i class="bi bi-arrow-clockwise"></i>
				</b-button>
				<b-button
				variant="primary"
				@click="nueva_corrida">
					<i class="bi bi-plus-lg m-r-5"></i>
					Buscar ofertas nuevas
				</b-button>
			</div>
		</div>

		<form-nueva></form-nueva>

		<!--
			Primero lo que YA esta promocionado en la tienda: es lo que le importa a
			quien entra por Tienda Online -> Promociones, donde no hay detalle.
		-->
		<h5 class="ofertas-listado__titulo m-b-10">
			Ofertas activas
		</h5>
		<tabla-activas></tabla-activas>

		<h5 class="ofertas-listado__titulo m-t-30 m-b-10">
			Busquedas del motor
		</h5>

		<div
		v-if="loading"
		class="text-center m-t-30">
			<b-spinner></b-spinner>
		</div>

		<b-alert
		v-else-if="!corridas.length"
		show
		variant="info">
			Todavia no se busco ninguna oferta. Arranca con el boton "Buscar ofertas nuevas".
		</b-alert>

		<div
		v-else
		class="tabla-modulo-wrapper">
			<b-table
			responsive
			hover
			table-class="tabla-modulo ofertas-listado__tabla"
			:fields="fields"
			:items="corridas"
			@row-clicked="ver_detalle">

				<template #cell(status)="data">
					<b-badge
					:variant="estado(data.item).variant"
					:title="data.item.status == 'error' && data.item.error_mensaje ? data.item.error_mensaje : ''">
						{{ estado(data.item).texto }}
					</b-badge>
				</template>

				<!--
					El conteo de excluidos por deuda no es decoracion: muestra que el motor
					tuvo criterio y no le ofrecio nada a quien debe plata. La leyenda
					completa esta en el detalle; aca va el numero con el porque en el tooltip.
				-->
				<template #cell(total_clientes_excluidos_por_deuda)="data">
					<span :title="leyenda_excluidos(data.item)">
						{{ numero_o_guion(data.item.total_clientes_excluidos_por_deuda) }}
					</span>
				</template>

			</b-table>
		</div>
	</div>
</template>
<script>
/*
	Listado del modulo de ofertas: arriba las ofertas activas (lo que la tienda
	esta mostrando hoy) y abajo las busquedas del motor, para entrar al detalle
	de cada una. Es lo unico que se ve en Tienda Online -> Promociones, donde la
	ruta no tiene :id. Molde de sugerencias-de-compra/Listado.vue.
*/
export default {
	components: {
		FormNueva: () => import('@/components/ofertas/FormNueva'),
		TablaActivas: () => import('@/components/ofertas/TablaActivas'),
	},
	computed: {
		corridas() {
			return this.$store.state.offer_suggestion.models
		},
		loading() {
			return this.$store.state.offer_suggestion.loading
		},
		// Las columnas que solo formatean un valor van con formatter y no con un
		// template por columna: son cuatro y no aportan nada mas que el formato.
		fields() {
			return [
				{label: 'Fecha', key: 'created_at', formatter: value => this.date(value, true)},
				{label: 'Generacion', key: 'origen_generacion', formatter: value => value == 'automatica' ? 'Automatica' : 'Manual'},
				{label: 'Estado', key: 'status'},
				{label: 'Ofertas sugeridas', key: 'lines_count', formatter: value => this.numero_o_guion(value)},
				{label: 'Clientes', key: 'total_clientes', formatter: value => this.numero_o_guion(value)},
				{label: 'Excluidos por deuda', key: 'total_clientes_excluidos_por_deuda'},
			]
		},
	},
	created() {
		this.refrescar()
	},
	methods: {
		/**
		 * Recarga las corridas desde el servidor. Tambien lo usa el boton de
		 * actualizar: la busqueda corre en cola, asi que una "pendiente" puede
		 * haber terminado desde la ultima carga.
		 */
		refrescar() {
			this.$store.dispatch('offer_suggestion/getModels')
		},
		nueva_corrida() {
			this.$bvModal.show('oferta-form-nueva')
		},
		/**
		 * Entra al detalle de la corrida clickeada. Ojo: desde Tienda Online ->
		 * Promociones esto navega a /ofertas/:id, que es la ruta del modulo IA. Es
		 * a proposito: el detalle es el mismo componente y no hay ruta de detalle
		 * abajo de /online.
		 */
		ver_detalle(corrida) {
			this.$router.push({name: 'ofertas', params: {id: '' + corrida.id}})
		},
		/**
		 * Color y texto humano del estado, juntos: el badge necesita los dos y
		 * separarlos eran dos metodos que preguntaban lo mismo.
		 */
		estado(corrida) {
			if (corrida.status == 'terminado') {
				return {variant: 'success', texto: 'Terminada'}
			}
			if (corrida.status == 'error') {
				return {variant: 'danger', texto: 'Con error'}
			}
			return {variant: 'warning', texto: 'Buscando…'}
		},
		/**
		 * Un contador que puede venir null (corrida sin cerrar: los totales se
		 * llenan al terminar) se muestra con guion, no con un 0 que mentiria.
		 */
		numero_o_guion(valor) {
			if (valor === null || typeof valor == 'undefined' || valor === '') {
				return '—'
			}
			return valor
		},
		leyenda_excluidos(corrida) {
			if (!corrida.total_clientes_excluidos_por_deuda) {
				return ''
			}
			return corrida.total_clientes_excluidos_por_deuda + ' clientes quedaron afuera porque tienen ventas sin cobrar'
		},
	}
}
</script>
<style lang="sass">
.ofertas-listado
	&__titulo
		font-weight: 600
	&__tabla
		tbody tr
			cursor: pointer
</style>
