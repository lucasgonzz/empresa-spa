<template>
	<div class="sugerencias-listado">

		<div class="j-between align-center p-t-15 m-b-15">
			<h4 class="m-b-0">
				Sugerencias de stock
			</h4>
			<div class="j-end align-center">
				<b-button
				class="m-r-10"
				variant="outline-secondary"
				title="Actualizar el listado"
				@click="refrescar">
					<i class="bi bi-arrow-clockwise"></i>
				</b-button>
				<b-button
				variant="primary"
				@click="nueva_sugerencia">
					<i class="bi bi-plus-lg m-r-5"></i>
					Nueva sugerencia
				</b-button>
			</div>
		</div>

		<form-nueva></form-nueva>

		<div
		v-if="loading"
		class="text-center m-t-30">
			<b-spinner></b-spinner>
		</div>

		<b-alert
		v-else-if="!sugerencias.length"
		show
		variant="info">
			Todavia no hay sugerencias generadas. Crea la primera con el boton "Nueva sugerencia".
		</b-alert>

		<b-table
		v-else
		head-variant="dark"
		responsive
		hover
		class="sugerencias-listado__tabla"
		:fields="fields"
		:items="sugerencias"
		@row-clicked="ver_detalle">

			<template #cell(created_at)="data">
				{{ date(data.item.created_at, true) }}
			</template>

			<template #cell(origen_generacion)="data">
				<span v-if="data.item.origen_generacion == 'automatica'">
					Automatica
				</span>
				<span v-else>
					Manual
				</span>
			</template>

			<template #cell(status)="data">
				<b-badge
				:variant="estado_variant(data.item)"
				:title="titulo_estado(data.item)">
					{{ estado_texto(data.item) }}
				</b-badge>
			</template>

			<template #cell(articles_count)="data">
				<!-- Sugerencias guardadas antes de la v2 pueden no traer el conteo -->
				{{ typeof data.item.articles_count == 'undefined' || data.item.articles_count === null ? '—' : data.item.articles_count }}
			</template>

		</b-table>
	</div>
</template>
<script>
/*
	Listado de sugerencias de la vista propia. Se apoya en el store stock_suggestion
	que ya usaba el modal viejo (mismo endpoint GET stock-suggestion), asi que no
	duplica ninguna carga: solo cambia donde se muestra.
*/
export default {
	components: {
		FormNueva: () => import('@/components/sugerencias-de-stock/FormNueva'),
	},
	computed: {
		sugerencias() {
			return this.$store.state.stock_suggestion.models
		},
		loading() {
			return this.$store.state.stock_suggestion.loading
		},
		fields() {
			return [
				{
					label: 'Fecha',
					key: 'created_at',
				},
				{
					label: 'Objetivo',
					key: 'modo',
				},
				{
					label: 'Origen',
					key: 'origen',
				},
				{
					label: 'Limite origen',
					key: 'limite_origen',
				},
				{
					label: 'Generacion',
					key: 'origen_generacion',
				},
				{
					label: 'Estado',
					key: 'status',
				},
				{
					label: 'Lineas',
					key: 'articles_count',
				},
			]
		},
	},
	created() {
		this.refrescar()
	},
	methods: {
		/**
		 * Recarga el listado desde el servidor. Tambien lo usa el boton de actualizar:
		 * las sugerencias se generan en cola, asi que una "pendiente" puede haber
		 * terminado desde la ultima carga.
		 */
		refrescar() {
			this.$store.dispatch('stock_suggestion/getModels')
		},
		/**
		 * Abre el modal de creacion (FormNueva).
		 */
		nueva_sugerencia() {
			this.$bvModal.show('sugerencia-form-nueva')
		},
		/**
		 * Navega al detalle de la sugerencia clickeada.
		 */
		ver_detalle(sugerencia) {
			this.$router.push({name: 'sugerencias_stock', params: {id: '' + sugerencia.id}})
		},
		/**
		 * Variante de color del badge segun el estado de la corrida.
		 */
		estado_variant(sugerencia) {
			if (sugerencia.status == 'terminado') {
				return 'success'
			}
			if (sugerencia.status == 'error') {
				return 'danger'
			}
			return 'warning'
		},
		/**
		 * Texto humano del estado.
		 */
		estado_texto(sugerencia) {
			if (sugerencia.status == 'terminado') {
				return 'Terminada'
			}
			if (sugerencia.status == 'error') {
				return 'Con error'
			}
			return 'Generando…'
		},
		/**
		 * En una corrida caida, el mensaje de error queda como tooltip de la fila
		 * para no ensanchar la tabla con una columna que casi siempre esta vacia.
		 */
		titulo_estado(sugerencia) {
			if (sugerencia.status == 'error' && sugerencia.error_mensaje) {
				return sugerencia.error_mensaje
			}
			return ''
		},
	}
}
</script>
<style lang="sass">
.sugerencias-listado
	&__tabla
		tbody tr
			cursor: pointer
</style>
