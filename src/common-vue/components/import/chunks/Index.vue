<template>
	<div>

		<articulos-creados
		:articles="articulos_creados"></articulos-creados>

		<chunk-fila
		:chunk_for_filas="chunk_for_filas"></chunk-fila>

		<article-import-observations
		:article_import_observations="article_import_observations"></article-import-observations>

		<b-modal
		hide-footer
		size="lg"
		title="Lotes"
		@shown="abrirLotes"
		id="chunks">
			<b-table
			responsive
			head-variant="dark"
			:fields="fields"
			:items="items">

				<template #cell(creados)="data">
					<b-button
					@click="modelos_creados(chunks[data.index])">
					 	{{ numero_es(chunks[data.index].created_count) }}
					</b-button>
				</template>

				<template #cell(actualizados)="data">
					<b-button
					@click="modelos_actualizados(chunks[data.index])">
					 	{{ numero_es(chunks[data.index].updated_count) }}
					</b-button>
				</template>

				<template #cell(filas)="data">
					<b-button
					@click="show_filas(chunks[data.index])">
					 	Filas
					</b-button>
				</template>

				<template #cell(proceso)="data">
					<b-button
					@click="show_article_import_duration(chunks[data.index])">
					 	Proceso
					</b-button>
				</template>
			</b-table>

			<!--
				Solo tiene sentido si hay mas de una pagina: con pocos lotes no hay nada
				para paginar y el control quedaria como un adorno vacio. Mismo criterio y
				mismo patron que ImportHistory.vue para su propio <b-pagination>.
			-->
			<b-pagination
			v-if="chunks.length && total > per_page"
			class="m-t-15"
			align="center"
			pills
			v-model="current_page"
			:total-rows="total"
			:per-page="per_page"></b-pagination>
		</b-modal>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	props: {
		import_history_show_lotes: Object
	},
	components: {
		ArticulosCreados: () => import('@/common-vue/components/import/ArticulosCreados'),
		ChunkFila: () => import('@/common-vue/components/import/chunks/ChunkFila'),
		ArticleImportObservations: () => import('@/common-vue/components/import/chunks/ArticleImportObservations'),
	},
	data() {
		return {
			chunks: [],
			chunk_for_filas: null,
			article_import_observations: null,
			articulos_creados: [],
			// Pagina actual de lotes (1-indexado, como espera <b-pagination>). Se resetea a 1
			// en cada apertura del modal -- ver abrirLotes() -- mismo criterio que
			// ImportHistory.vue.
			current_page: 1,
			// Total de paginas y de lotes que devuelve el backend en `pagination`
			// (ImportHistoryController::chunks). total alimenta el total-rows de <b-pagination>.
			last_page: 1,
			total: 0,
			// Tamaño de pagina fijo en 20: son lotes (ArticleImportResult), no las
			// observaciones de cada uno -- entran muchos mas por pantalla que en el
			// historial de a 5.
			per_page: 20,
			// Contador de la peticion de get_chunks() mas reciente, mismo mecanismo que
			// ImportHistory.vue: cambiar de pagina y despues cerrar/reabrir el modal rapido
			// puede dejar DOS pedidos en vuelo a la vez, y la red no garantiza que resuelvan
			// en el orden en que salieron. Sin esto, una respuesta VIEJA podria pisar
			// `chunks`/`total`/`last_page` con los de una pagina que el usuario ya no esta
			// pidiendo.
			peticion_actual: 0,
		}
	},
	computed: {
		fields() {
			return [
				{
					label: 'N° Lote',
					key: 'chunk_number',
				},
				{
					label: 'Inicio',
					key: 'created_at',
				},
				{
					label: 'Fin',
					key: 'terminado_at',
				},
				{
					label: 'Duracion',
					key: 'duration',
				},
				{
					key: 'filas_procesadas',
				},
				{
					key: 'creados',
				},
				{
					key: 'actualizados',
				},
				{
					key: 'filas',
				},
				{
					key: 'proceso',
				},
			]
		},
		items() {
			let items = []
			this.chunks.forEach(chunk => {

				let fecha_inicio = moment(chunk.created_at)
				let fecha_fin = moment(chunk.terminado_at)

				let diferencia_segundos = fecha_fin.diff(fecha_inicio, 'seconds')

				items.push({
					created_at: this.date(chunk.created_at, true),
					terminado_at: this.date(chunk.terminado_at, true),
					duration: diferencia_segundos+' segundos',

					chunk_number: chunk.chunk_number,
					filas_procesadas: chunk.filas_procesadas,
				})
			})
			return items
		},
	},
	watch: {
		/*
		 * Dispara la carga de la pagina nueva cuando el usuario clickea en el
		 * <b-pagination> (que solo toca current_page via v-model, nunca @input a la vez:
		 * agregar @input ademas del v-model duplicaria este watch). abrirLotes() NUNCA
		 * pasa por aca cuando current_page ya vale 1 -- ver su comentario -- asi que abrir
		 * el modal en la pagina 1 no dispara un pedido de mas.
		 */
		current_page() {
			this.get_chunks()
		}
	},
	methods: {
		show_filas(chunk) {
			this.chunk_for_filas = chunk.article_import_result_observations
			this.$bvModal.show('chunk-filas')
		},
		show_article_import_duration(chunk) {
			this.article_import_observations = chunk.article_import_observations
			this.$bvModal.show('article-import-observations')
		},
		/**
		 * Punto de entrada unico del modal (@shown de b-modal, bootstrap-vue). Siempre
		 * arranca en la pagina 1, aunque la vez anterior se haya quedado en otra -- es el
		 * comportamiento esperable de un modal que se reabre, no una pestaña que retoma
		 * donde la dejaste. Si current_page ya vale 1 no hay nada que cambiar y el watch de
		 * arriba no dispara solo -- por eso aca se pide la carga a mano en ese caso, para no
		 * perder el fetch inicial. Mismo patron que ImportHistory.vue.
		 */
		abrirLotes() {
			if (this.current_page === 1) {
				this.get_chunks()
			} else {
				this.current_page = 1
			}
		},
		get_chunks() {
			this.$store.commit('auth/setMessage', 'Cargando')
			this.$store.commit('auth/setLoading', true)

			// Token de ESTA llamada puntual (ver el comentario de peticion_actual en data()).
			this.peticion_actual += 1
			let mi_peticion = this.peticion_actual

			this.$api.get('import-history/chunks/'+this.import_history_show_lotes.id+'?page='+this.current_page)
			.then(res => {
				console.log(res.data.models)
				// Ya salio una llamada mas nueva mientras esta esperaba respuesta (cambio de
				// pagina, o se reabrio el modal): esta respuesta quedo vieja, se descarta sin
				// tocar nada del estado.
				if (mi_peticion !== this.peticion_actual) {
					return
				}
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.chunks = res.data.models
				// pagination viene siempre del contrato nuevo (models + pagination), pero se
				// cubre igual por si alguna vez pega contra una API vieja que solo mande
				// {models}.
				let pagination = res.data.pagination || {}
				this.last_page = pagination.last_page || 1
				this.total = pagination.total || 0
				// No se pisa this.current_page con pagination.current_page: ya es el valor
				// que nosotros mandamos en el pedido, y reasignarlo ademas dispararia el
				// watch de current_page y encadenaria un pedido de mas.
			})
			.catch(() => {
				// Misma guarda que en el .then: un error de una llamada vieja no tiene que
				// pisar el resultado (bueno o el propio error) de una llamada mas nueva.
				if (mi_peticion !== this.peticion_actual) {
					return
				}
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				// El .catch ya existia pero apagaba el overlay y se callaba: la tabla quedaba vacia
				// sin ninguna explicacion.
				this.$toast.error('No pudimos cargar los lotes de esta importación. Cerrá y volvé a abrir esta ventana.', {
					duration: 8000
				})
			})
		},

		modelos_creados(model) {
			this.$store.commit('auth/setLoading', true)
			this.$api.get('import-history/created-models/'+model.id)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.articulos_creados = res.data.model.articulos_creados
				this.$bvModal.show('articulos-creados')
			})
			/*
			 * 🔴 Faltaba el .catch: con setLoading(true) y un error sin `response` (red caida), el
			 * overlay quedaba prendido para siempre.
			 *
			 * 🔴 Y abajo habia un segundo `$bvModal.show('articulos-creados')` suelto, fuera de la
			 * promesa: abria el modal ANTES de que llegara la respuesta, con la lista del click
			 * anterior adentro. Se saco: el modal lo abre el .then, cuando ya hay algo que mostrar.
			 */
			.catch(() => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('No pudimos cargar los artículos creados en este lote. Volvé a intentar.', {
					duration: 8000
				})
			})
		},
		modelos_actualizados(model) {
			this.$store.commit('auth/setLoading', true)
			this.$api.get('import-history/updated-models/'+model.id)
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.articulos_creados = res.data.model.articulos_actualizados
				this.$bvModal.show('articulos-creados')
			})
			/* Mismo caso que modelos_creados: sin .catch el overlay se quedaba prendido. */
			.catch(() => {
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('No pudimos cargar los artículos actualizados en este lote. Volvé a intentar.', {
					duration: 8000
				})
			})
		},
	}
}
</script>