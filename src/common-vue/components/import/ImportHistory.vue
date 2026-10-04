<template>
<div>

	<!-- <articulos-creados
	:articles="articulos_creados"></articulos-creados> -->

	<chunks
	:import_history_show_lotes="import_history_show_lotes"></chunks>
	
	<b-modal
	hide-footer
	size="lg"
	title="Historial de importaciones"
	id="import-history"
	@show="abrirHistorial">

		<div 
		v-if="loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<!--
			🔴 Estado de error PROPIO, y va ANTES del estado vacío. Hasta acá el .catch de
			getModels apagaba el loading y no hacía nada más, así que con `models` vacío la
			pantalla caía en el "Aún no hay importaciones" de abajo: la pantalla MENTÍA. El
			usuario que acababa de importar leía que no había importado nada.
		-->
		<div
		v-else-if="error_al_cargar && !models.length"
		class="import-history-error">
			<b-alert
			show
			variant="danger"
			class="m-b-15">
				{{ error_al_cargar }}
			</b-alert>
			<b-button
			variant="primary"
			:disabled="loading"
			@click="getModels">
				<i class="bi bi-arrow-repeat m-r-5"></i>
				Reintentar
			</b-button>
		</div>

		<history-empty-state
		v-else-if="!models.length"
		icon_class="icon-download"
		title="Aún no hay importaciones"
		hint="Cuando importes datos desde el menú, aparecerá aquí su historial."></history-empty-state>

		<b-table
		responsive
		head-variant="dark"
		v-else
		:fields="fields"
		:items="items">

		
			<!-- Estado de la importacion mostrado como badge de color segun status -->
			<template #cell(status)="data">
				<b-badge :variant="status_variant(items[data.index].status)">
					{{ status_label(items[data.index].status) }}
				</b-badge>
			</template>

			<template #cell(created_models)="data">
				{{ numero_es(models[data.index].created_models) }}
				<!-- <b-button
				@click="modelos_creados(models[data.index])">
					{{ models[data.index].created_models }}
				</b-button> -->
			</template>
		
			<template #cell(updated_models)="data">
				{{ numero_es(models[data.index].updated_models) }}
				<!-- <b-button
				@click="modelos_actualizados(models[data.index])">
					{{ models[data.index].updated_models }}
				</b-button> -->
			</template>

			<!--
				Botón para ver los problemas (conflictos) de la importación, solo si tuvo al menos uno.
				El número es conflicts_count: los problemas PARA REVISAR, sin los avisos (ver
				tipos_que_no_cuentan). El title lo dice con las mismas
				palabras que el encabezado del modal, para que el botón y el modal no se contradigan.
			-->
			<template #cell(conflicts)="data">
				<b-button
				v-if="tiene_conflictos(models[data.index])"
				size="sm"
				variant="warning"
				:title="texto_problemas_para_revisar(models[data.index].conflicts_count)"
				@click="ver_conflictos(models[data.index])">
					{{ numero_es(models[data.index].conflicts_count) }}
				</b-button>
				<span v-else class="text-muted">-</span>
			</template>

			<template #cell(link_excel)="data">
				<b-button
				variant="success"
				@click="to_excel(models[data.index])">Excel</b-button>
			</template>

			<template #cell(chunks)="data">
				<b-button
				variant="primary"
				@click="chunks(models[data.index])">Lotes</b-button>
			</template>

			<template #cell(columnas)="data">
				<div
				class="cont-columns">
					<p
					class="m-0"
					v-if="a"
					v-for="(a, b) in parse_json_o_array(models[data.index].columnas, {})">
						{{b}}: {{ a }}
					</p>
				</div>
			</template>

			<template #cell(operaciones)="data">
				<div
				class="cont-columns">
					<p
					class="m-0"
					v-for="operacion in parse_json_o_array(models[data.index].operaciones, [])">
						{{ operacion.name }}: {{ operacion.value }}
					</p>
				</div>
			</template>

			<template #cell(observations)="data">
				<b-form-textarea
				:column="15"
				v-model="models[data.index].observations"></b-form-textarea>
			</template>

			<!-- Boton para ver el detalle del error solo cuando la importacion fallo o tiene mensaje de error -->
			<template #cell(error_message)="data">
				<b-button
				v-if="es_fallida(items[data.index].status) || items[data.index].error_message"
				size="sm"
				variant="outline-danger"
				@click="ver_error(items[data.index])">
					Ver error
				</b-button>
				<span v-else>—</span>
			</template>


			<template #cell(rollback)="data">
				<b-badge
				v-if="models[data.index].rollback_status === 'revertida'"
				variant="success">
					Revertida
					<br>
					{{ date(models[data.index].rolled_back_at, true) }}
				</b-badge>
				<span
				v-else-if="models[data.index].rollback_status === 'encolado'">
					<b-spinner small variant="secondary"></b-spinner>
					Revirtiendo…
				</span>
				<b-button
				v-else-if="models[data.index].rollback_status === 'fallido' && puede_revertir(models[data.index])"
				size="sm"
				variant="outline-danger"
				:title="models[data.index].rollback_error"
				@click="pedir_confirmacion_rollback(models[data.index])">
					Reintentar
				</b-button>
				<b-button
				v-else-if="puede_revertir(models[data.index])"
				variant="danger"
				@click="pedir_confirmacion_rollback(models[data.index])">
					Revertir
				</b-button>
				<span
				v-else
				class="text-muted"
				title="No se puede revertir una importación que todavía está en curso">—</span>
			</template>


		</b-table>

		<!--
			Solo tiene sentido si hay mas de una pagina: con <=5 resultados en total (o
			mientras se esta cargando/hay error sin datos viejos en pantalla) no hay nada para
			paginar y el control quedaria como un adorno vacio. Mismo criterio que ya usa
			reportes/components/detalle-modal/Index.vue para su propio <b-pagination>.
		-->
		<b-pagination
		v-if="!loading && models.length && total > per_page"
		class="m-t-15"
		align="center"
		pills
		v-model="current_page"
		:total-rows="total"
		:per-page="per_page"></b-pagination>
	</b-modal>

	<!-- Modal con el detalle del error de una importacion fallida: motivo humano + log tecnico completo -->
	<b-modal
	hide-footer
	size="lg"
	title="Detalle del error de importación"
	id="import-error-detail">

		<div v-if="error_seleccionado">

			<h6 class="text-danger">Motivo</h6>
			<p class="mb-3">{{ error_seleccionado.error_message || 'Sin motivo registrado.' }}</p>

			<div v-if="error_seleccionado.error_trace">
				<h6 class="d-flex justify-content-between align-items-center">
					<span>Log técnico</span>
					<b-button size="sm" variant="outline-secondary" @click="copiar_trace">Copiar</b-button>
				</h6>
				<pre class="import-error-trace">{{ error_seleccionado.error_trace }}</pre>
			</div>
			<p v-else class="text-muted">
				No hay log técnico (el proceso se interrumpió sin dejar traza).
			</p>

		</div>
	</b-modal>

	<!-- Modal con el detalle de los problemas (conflictos) de una importacion -->
	<b-modal
	hide-footer
	size="lg"
	title="Problemas de la importación"
	id="modal-conflictos-importacion">

		<div
		v-if="cargando_conflictos"
		class="all-center-md">
			<b-spinner variant="warning"></b-spinner>
		</div>

		<div v-else>

			<!--
				Encabezado: fecha de la importación y cuántos problemas tuvo, separados en los que
				hay que revisar y los avisos (ver conteo_conflictos y texto_encabezado_conflictos).

				🔴 Hasta el 4/10/2026 decía "N problemas detectados" con el `total` del endpoint,
				que cuenta TODO (avisos incluidos), mientras el botón de la columna Problemas
				muestra conflicts_count, que no los cuenta: en demo2 el botón decía 3 y el modal
				5. Ahora el primer número es el mismo del botón y los avisos van aparte.
			-->
			<p class="mb-3">
				<strong>Importación del {{ date((import_history_conflictos || {}).created_at, true) }}</strong>
				— {{ texto_encabezado_conflictos }}
			</p>

			<!--
				Resumen por tipo de problema, como chips. Los avisos (tipos_que_no_cuentan, los
				que no suman al número del botón) van en gris y no en amarillo, así el color de
				los chips acompaña al número del encabezado: amarillo lo que se cuenta como
				problema para revisar, gris lo que va aparte como aviso.
			-->
			<div
			v-if="resumen_conflictos.length"
			class="conflictos-resumen m-b-15">
				<span
				v-for="(item, index) in resumen_conflictos"
				:key="'resumen-'+index"
				class="badge conflictos-resumen__chip"
				:class="es_aviso(item.tipo) ? 'badge-secondary' : 'badge-warning'">
					{{ texto_chip_resumen(item) }}
				</span>
			</div>

			<history-empty-state
			v-if="!conflictos.length"
			icon_class="icon-check-circle"
			title="No hay problemas para mostrar"
			hint="Esta importación no tiene filas con conflictos."></history-empty-state>

			<div v-else>

				<b-table
				responsive
				small
				head-variant="dark"
				:items="conflictos_a_mostrar"
				:fields="conflictos_fields">

					<!--
						Traduce el tipo de problema a lenguaje de usuario, sumando cuantos articulos
						competian cuando es ambiguo.

						🔴 'desempate_por_nombre_sin_resolver' va en la misma lista que los otros dos
						que traen article_ids: son los articulos entre los que NO se pudo desempatar,
						o sea a cuantos les entro la misma fila. Sin ese numero el usuario lee "no se
						pudo separar por nombre" y no tiene forma de saber cuanto se le pisoteo.
					-->
					<template #cell(tipo)="data">
						{{ tipo_conflicto_label(data.item.tipo) }}
						<span v-if="data.item.tipo === 'ambiguo' && data.item.article_ids">
							{{ texto_cantidad_articulos(data.item.article_ids) }}
						</span>
						<!-- El sentido depende del campo: ver texto_fila_sobrescrita() -->
						<span v-if="data.item.tipo === 'fila_sobrescrita' && data.item.fila_ganadora">
							{{ texto_fila_sobrescrita(data.item) }}
						</span>
						<span v-if="data.item.tipo === 'identificador_sin_asignar' && data.item.article_ids">
							{{ texto_cantidad_articulos(data.item.article_ids) }}
						</span>
						<span v-if="data.item.tipo === 'desempate_por_nombre_sin_resolver' && data.item.article_ids">
							{{ texto_cantidad_articulos(data.item.article_ids) }}
						</span>
					</template>

					<!-- Traduce el campo tecnico (bar_code, sku, etc.) a su nombre visible -->
					<template #cell(campo)="data">
						{{ campo_conflicto_label(data.item.campo) }}
					</template>

				</b-table>

				<!--
					Aviso cuando se recorta la lista a los primeros 200 renglones para no renderizar
					tablas gigantes. Dice "renglones" y no "filas" ni "problemas": "filas" se lee
					como filas del Excel (y una misma fila puede traer varios renglones, como un
					costo y un precio inválidos), y "problemas" chocaría con el encabezado, porque
					el total incluye los avisos que el encabezado cuenta aparte.
				-->
				<p
				v-if="hay_mas_conflictos"
				class="text-muted small">
					Se muestran los primeros {{ numero_es(conflictos_a_mostrar.length) }} renglones de {{ numero_es(total_conflictos) }}. Corregí estos y volvé a importar para ver el resto.
				</p>

			</div>

			<!--
				🔴 Un pie POR CASO, y no uno solo para todo (misión importacion-mensaje-de-problemas,
				4/10/2026). Hasta acá había un único "Estas filas no se procesaron para no
				sobrescribir artículos existentes…" que salía con cualquier tipo que no fuera
				informativo, y era falso para casi todos: medido en demo2 con la lista de la demo,
				las tres filas del modal SÍ se habían importado (una sin costo, una sin códigos,
				una sin código de barras).

				Cada pie afirma SOLO lo que es verdad siempre para su tipo. Lo único que seguro
				deja una fila afuera es 'ambiguo' (ProcessRow corta antes de crear o actualizar).
				Para los demás, el tipo dice qué dato no se cargó, pero no si la fila creó o
				actualizó algo: puede no haber hecho nada por un camino que no deja conflicto
				("Solo actualizar" sin coincidencia, artículo de otro proveedor, fila repetida por
				nombre). Por eso el pie de los datos habla del dato, no de la fila.

				Cada pie se decide por los tipos presentes en TODA la importación (el `resumen`,
				ver tipos_presentes), no solo en la lista recortada a 200: si el único 'ambiguo'
				quedó en el renglón 350, el usuario igual tiene que leer que esa fila no entró.
				Un tipo que este componente no conoce (una API más nueva) no dispara ningún pie:
				no se afirma nada que no se sepa.

				El motivo del pie de 'ambiguo' es genérico ("no se pudo saber a qué artículo
				corresponden") a propósito: la ambigüedad no siempre es "el código coincide con
				más de un artículo del sistema". Puede ser por nombre, o con UN artículo que creó
				la misma importación en otro lote.
			-->
			<p
			v-if="hay_filas_no_importadas"
			class="text-muted small m-t-15">
				Las filas con "Código repetido" no se importaron: no se pudo saber a qué artículo
				corresponden, y se dejaron afuera para no sobrescribir el que no es. Revisá los
				artículos que comparten ese código y volvé a importar solo esas filas.
			</p>

			<p
			v-if="hay_filas_con_un_dato_sin_usar"
			class="text-muted small m-t-15">
				En las filas con un valor o un código que no se pudo usar, ese dato no se cargó:
				si la fila creó o actualizó un artículo, el artículo quedó sin ese dato o con el
				que ya tenía. Corregilo en el Excel y volvé a importar esas filas para completarlo.
			</p>

			<!--
				Dos pies para las sobrescritas, según el campo por el que se repitió la fila (ver
				sobrescritas_solo_por_codigo): por un código queda la ÚLTIMA fila; por nombre, por
				número o sin campo queda la PRIMERA y la de abajo se descarta. Solo cuando todas
				son por código se puede afirmar cuál quedó.
			-->
			<p
			v-if="hay_filas_sobrescritas && sobrescritas_solo_por_codigo"
			class="text-muted small m-t-15">
				Las filas sobrescritas son productos que aparecían más de una vez en el Excel con
				el mismo código: se cargaron una sola vez, con los datos de la última fila.
			</p>
			<p
			v-else-if="hay_filas_sobrescritas"
			class="text-muted small m-t-15">
				Las filas sobrescritas son productos que aparecían más de una vez en el Excel: se
				cargaron una sola vez. Si las filas repetidas traían datos distintos, revisá cuál
				quedó.
			</p>

			<p
			v-if="hay_columnas_de_precio_ignoradas"
			class="text-muted small m-t-15">
				Las filas marcadas como "Columna de precio no aplicada" sí se importaron: se
				aplicó todo menos esa columna, porque el artículo se maneja por la otra. Para
				cambiarle el criterio hay que hacerlo desde la ficha del artículo.
			</p>

			<!--
				🔴 Pie propio, y no el de "estas filas no se procesaron" (mision
				desempate-por-nombre-codigo-repetido, 9/9/2026). Ese texto le decia al usuario
				que corrigiera los codigos y reimportara SOLO esas filas: para este tipo es
				falso dos veces. La fila se proceso —se aplico a todos los articulos que
				comparten el codigo— y el codigo no hay que corregirlo: el codigo repetido lo
				manda el proveedor y es justamente el motivo de la opcion. Lo unico que puede
				destrabarlo es el NOMBRE.
			-->
			<p
			v-if="hay_desempates_sin_resolver"
			class="text-muted small m-t-15">
				Las filas marcadas como "No se pudo separar por nombre" sí se importaron, pero no
				como pediste: el nombre del Excel no alcanzó para elegir a cuál de los artículos
				que comparten ese código de proveedor le correspondía, así que la fila se aplicó a
				todos ellos y quedaron con los mismos datos. Pasa cuando el proveedor cambió la
				redacción del nombre entre listas, cuando dos artículos tienen el mismo código y
				el mismo nombre, o cuando la fila vino sin nombre. Para separarlos, el nombre del
				Excel tiene que coincidir con el del artículo — o se ajusta el nombre del artículo
				desde su ficha.
			</p>

		</div>
	</b-modal>

	<!-- Confirmacion antes de revertir una importacion (grupo 305, prompt 03) -->
	<confirm
	id="confirm-rollback-import"
	:text="texto_confirmacion_rollback"
	not_show_delete_text
	btn_text="Revertir importación"
	variant="danger"
	emit="rollback_confirmado"
	@rollback_confirmado="ejecutar_rollback"></confirm>
</div>
</template>
<script>
import moment from 'moment'
import { env } from '@/runtime_config'
export default {
	components: {
		// ArticulosCreados: () => import('@/common-vue/components/import/ArticulosCreados'),
		Chunks: () => import('@/common-vue/components/import/chunks/Index'),
		HistoryEmptyState: () => import('@/common-vue/components/horizontal-nav/HistoryEmptyState'),
		Confirm: () => import('@/common-vue/components/Confirm'),
	},
	props: {
		show_history: Boolean,
		model_name: String,
	},
	watch: {
		show_history() {
			this.abrirHistorial()
		},
		/*
		 * Dispara la carga de la pagina nueva cuando el usuario clickea en el
		 * <b-pagination> (que solo toca current_page via v-model, nunca @input a la vez:
		 * si se agregara @input ademas del v-model se duplicaria este watch).
		 * abrirHistorial() NUNCA pasa por aca cuando current_page ya vale 1 -- ver su
		 * comentario -- asi que reabrir el modal en la pagina 1 no dispara un pedido de mas.
		 */
		current_page() {
			this.getModels()
		}
	},
	data() {
		return {
			loading: false,
			// Texto del error de carga del historial. Vacio = no hubo error (ver el template).
			error_al_cargar: '',
			models: [],
			// Pagina actual del historial (1-indexado, como espera <b-pagination>). Se resetea
			// a 1 en cada apertura del modal -- ver abrirHistorial() -- asi que reabrirlo en la
			// pagina en que quedo la vez anterior no es el comportamiento buscado.
			current_page: 1,
			// Total de paginas y de registros que devuelve el backend en `pagination`
			// (ImportHistoryController::index). total alimenta el total-rows de <b-pagination>.
			last_page: 1,
			total: 0,
			// Tamaño de pagina fijo en 5: es lo que pidio Lucas y lo que el backend devuelve
			// siempre, no un parametro configurable por ahora.
			per_page: 5,
			// Contador de la peticion de getModels() mas reciente (hallazgo del chequeo
			// independiente, 28/9/2026): cambiar de pagina y despues cerrar/reabrir el modal
			// rapido puede dejar DOS pedidos en vuelo a la vez, y la red no garantiza que
			// resuelvan en el orden en que salieron. Sin esto, la respuesta VIEJA (de una
			// pagina que el usuario ya no esta pidiendo) puede llegar despues y pisar
			// `models`/`total`/`last_page`, dejando la tabla con filas de una pagina distinta
			// a la que <b-pagination> muestra resaltada. getModels() se guarda a si mismo el
			// numero de esta llamada puntual antes de salir a la red, y al volver compara
			// contra el valor actual: si ya no coincide, es porque salio una llamada mas
			// nueva mientras esta esperaba, y su resultado se descarta en silencio.
			peticion_actual: 0,
			articulos_creados: [],
			import_history_show_lotes: null,
			// Importacion actualmente seleccionada para ver su error en el modal "import-error-detail"
			error_seleccionado: null,
			// Importacion actualmente seleccionada para ver sus problemas (conflictos) en el modal "modal-conflictos-importacion"
			import_history_conflictos: null,
			// Filas con problemas de la importacion seleccionada (conflicts del endpoint)
			conflictos: [],
			// Resumen por tipo/campo de los problemas de la importacion seleccionada
			resumen_conflictos: [],
			// Total de problemas de la importacion seleccionada (total del endpoint)
			total_conflictos: 0,
			// True mientras se cargan los problemas desde la API
			cargando_conflictos: false,
			// Importacion seleccionada para revertir, pendiente de confirmar en el modal "confirm-rollback-import"
			import_history_a_revertir: null,
		}
	},
	computed: {
		items() {
			let items = []
			this.models.forEach(model => {

				let diferencia_minutos = ''
				if (model.terminado_at) {

					let fecha_inicio = moment(model.created_at)
					let fecha_fin = moment(model.terminado_at)

					diferencia_minutos = fecha_fin.diff(fecha_inicio, 'minutes')+' minutos'
				}

				items.push({
					created_at: this.date(model.created_at, true),
					status: model.status,
					created_models: this.numero_es(model.created_models),
					updated_models: this.numero_es(model.updated_models),
					articulos_creados: this.numero_es(model.articulos_creados),
					articulos_actualizados: this.numero_es(model.articulos_actualizados),
					articles_match: this.numero_es(model.articles_match),
					filas_procesadas: this.numero_es(model.filas_procesadas),
					articles_repetidos: this.numero_es(model.articles_repetidos),
					error_message: model.error_message,
					error_trace: model.error_trace,
					operacion: model.operacion_a_realizar,
					actualizar_otro_proveedor: model.no_actualizar_otro_proveedor ? 'No' : 'Si',
					provider_id: model.provider_id ? this.getProvider(model) : null,
					employee_id: model.user_id == model.employee_id ? this.user.name : this.getModelFromId('employee', model.employee_id).name,
					columnas: model.columnas,
					link_excel: null,
					total_chunks: model.total_chunks,
					processed_chunks: model.processed_chunks,
					terminado_at: this.date(model.terminado_at, true),
					operaciones: model.operaciones,
					duration: diferencia_minutos
				})
			})
			return items 
		},
		fields() {
			return [
				{
					key: 'created_at',
					label: 'Fecha',
				},
				{
					key: 'terminado_at',
					label: 'Finalizado',
				},
				{
					key: 'status',
					label: 'Estado',
				},
				{
					key: 'employee_id',
					label: 'Realizado por',
				},
				{
					key: 'filas_procesadas',
					label: 'Filas procesadas',
				},
				{
					key: 'created_models',
					label: 'Creados',
				},
				{
					key: 'articles_match',
					label: 'Macheados',
				},
				{
					key: 'updated_models',
					label: 'Actualizados',
				},
				// {
				// 	key: 'articles_repetidos',
				// 	label: 'Repetidos',
				// },
				{
					key: 'provider_id',
					label: 'Proveedor',
				},
				// {
				// 	key: 'operacion',
				// },
				// {
				// 	key: 'Act. art. de otro proveedor',
				// 	key: 'actualizar_otro_proveedor',
				// },
				{
					key: 'conflicts',
					label: 'Problemas',
				},
				{
					key: 'link_excel',
					label: 'Archivo',
				},
				{
					key: 'total_chunks',
					label: 'Total lotes',
				},
				{
					key: 'processed_chunks',
					label: 'Lotes procesados',
				},
				{
					key: 'duration',
					label: 'Duración',
				},
				{
					key: 'operaciones',
					label: 'Operaciones',
				},
				{
					key: 'chunks',
					label: 'Lotes',
				},
				{
					key: 'columnas',
				},
				{
					key: 'observations',
					label: 'Observaciones',
				},
				{
					key: 'error_message',
					label: 'Errores',
				},
				{
					key: 'rollback',
					label: 'Revertir importación',
				},
			]
		},
		/**
		 * Columnas de la tabla de detalle del modal de problemas.
		 * @returns {Array} definicion de fields para b-table
		 */
		conflictos_fields() {
			return [
				{
					key: 'fila',
					label: 'Fila',
				},
				{
					key: 'tipo',
					label: 'Problema',
				},
				{
					key: 'campo',
					label: 'Campo',
				},
				{
					key: 'valor',
					label: 'Valor',
				},
				{
					key: 'nombre_excel',
					label: 'Producto en el Excel',
				},
			]
		},
		/**
		 * Copia de "conflictos" ordenada por numero de fila ascendente, para que el usuario
		 * pueda ir corrigiendo el Excel en el mismo orden en que aparecen las filas.
		 * @returns {Array} conflictos ordenados, sin mutar el array original
		 */
		conflictos_ordenados() {
			return this.conflictos.slice().sort(function(a, b) {
				return (a.fila || 0) - (b.fila || 0)
			})
		},
		/**
		 * Recorta la lista ordenada a las primeras 200 filas, para no renderizar
		 * tablas gigantes cuando una importacion tiene miles de problemas.
		 * @returns {Array} primeras 200 filas de conflictos_ordenados
		 */
		conflictos_a_mostrar() {
			return this.conflictos_ordenados.slice(0, 200)
		},
		/**
		 * True cuando la importacion tiene mas filas de problemas que las que se trajeron,
		 * para mostrar el aviso de recorte.
		 *
		 * Mision 44: se compara contra el total REAL que devuelve el endpoint (agregado SQL)
		 * y no contra la longitud del array traido, que ya viene cortado por el limit y por
		 * lo tanto nunca podia superar el umbral. Asi el recorte deja de ser silencioso.
		 *
		 * @returns {Boolean}
		 */
		hay_mas_conflictos() {
			return this.total_conflictos > this.conflictos_a_mostrar.length
		},
		/*
		 * Las listas de abajo contestan preguntas distintas sobre un tipo de problema, y no hay
		 * que mezclarlas (misión importacion-mensaje-de-problemas, 4/10/2026):
		 *
		 *   1. "¿Cuenta para el número del botón?" -> tipos_que_no_cuentan.
		 *   2. "¿La fila quedó afuera seguro?"     -> tipos_que_saltean_la_fila.
		 *   3. "¿Se perdió un dato de la fila?"    -> tipos_con_un_dato_sin_usar.
		 *
		 * 🔴 Ninguna contesta "¿la fila se importó?". Que una fila tenga un problema de dato no
		 * dice si después creó o actualizó algo: puede no haber hecho nada por un camino que no
		 * deja conflicto ("Solo actualizar" sin coincidencia, artículo de otro proveedor, fila
		 * repetida por nombre o número que se descarta). Por eso los pies afirman solo lo que es
		 * verdad siempre: que 'ambiguo' deja la fila afuera, y que el dato inválido no se cargó.
		 *
		 * Hasta esta misión había una sola lista (tipos_informativos) y todo lo que no era
		 * informativo disparaba el pie de "estas filas no se procesaron", que era falso para casi
		 * todos los tipos. Antes de sumar o sacar un tipo, decidí cuál pregunta estás contestando.
		 *
		 * 'desempate_por_nombre_sin_resolver' no está en ninguna a propósito: cuenta para el botón
		 * (no es un aviso) y tiene su propio pie, porque lo que hay que corregir es el nombre.
		 */
		/**
		 * Tipos que NO suman al número del botón de la columna Problemas: son avisos (una fila
		 * repetida en el Excel que se cargó una vez, o una columna de precio que no se aplicó).
		 * Espejo de ImportConflict::TIPOS_QUE_NO_CUENTAN de empresa-api, que es lo que
		 * ActualizarBBDD::persistir_conflictos() deja afuera de conflicts_count.
		 *
		 * 🔴 Si cambia acá, tiene que cambiar allá (y al revés): si no, el número del botón y el
		 * "N problemas para revisar" del encabezado del modal dejan de coincidir.
		 *
		 * @returns {Array}
		 */
		tipos_que_no_cuentan() {
			return ['fila_sobrescrita', 'columna_de_precio_ignorada']
		},
		/**
		 * Tipos cuya fila NO se importó: ProcessRow corta antes de crear o actualizar el
		 * artículo. Espejo de ImportConflict::TIPOS_QUE_SALTEAN_LA_FILA de empresa-api.
		 * @returns {Array}
		 */
		tipos_que_saltean_la_fila() {
			return ['ambiguo']
		},
		/**
		 * Tipos en los que un valor o un código del Excel no se pudo usar y NO se cargó: el
		 * campo numérico inválido no se toca, el placeholder se anula, la fila sin código se
		 * busca por nombre o se crea sin código, el código único que coincidía con varios no se
		 * asigna. No dicen si la fila creó o actualizó algo (ver el comentario de arriba).
		 * @returns {Array}
		 */
		tipos_con_un_dato_sin_usar() {
			return ['numero_invalido', 'numero_fuera_de_rango', 'placeholder_descartado', 'sin_identificador', 'identificador_sin_asignar']
		},
		/**
		 * Campos por los que una fila repetida en el Excel se MERGEA y gana la última
		 * (ProcessRow, "la última fila gana" con bar_code/sku/provider_code). Con cualquier otro
		 * campo (name, id, o sin campo) es al revés: queda la PRIMERA fila y la de abajo se
		 * descarta. Lo usan la etiqueta de la celda Problema y el pie de las sobrescritas.
		 * @returns {Array}
		 */
		campos_de_codigo() {
			return ['bar_code', 'sku', 'provider_code']
		},
		/**
		 * Tipos de problema presentes en la importación seleccionada, sin repetir: los del
		 * `resumen` (que es de TODA la importación) más los de la lista traída (que viene
		 * recortada a 200). Con los dos, un pie no depende de si su tipo quedó dentro o fuera
		 * del recorte, y si una API vieja no mandara el resumen, igual alcanza con la lista.
		 * @returns {Array}
		 */
		tipos_presentes() {
			let tipos = []
			let agregar = function(item) {
				if (item && item.tipo && tipos.indexOf(item.tipo) === -1) {
					tipos.push(item.tipo)
				}
			}
			this.resumen_conflictos.forEach(agregar)
			this.conflictos.forEach(agregar)
			return tipos
		},
		/**
		 * True si la lista traída tiene TODOS los problemas de la importación (no la recortó el
		 * limit de 200). Solo con la lista completa se puede cruzar por fila; con la recortada,
		 * el resto viene en el `resumen`, que está agrupado por tipo y campo, no por fila.
		 * @returns {Boolean}
		 */
		lista_de_conflictos_completa() {
			return this.conflictos.length >= (Number(this.total_conflictos) || 0)
		},
		/**
		 * Filas que seguro NO se importaron (las de tipos_que_saltean_la_fila), como número
		 * (la fila puede llegar como string). Las que vienen sin número no entran: si no, dos
		 * nulos se "encontrarían" entre sí en el cruce por fila.
		 * @returns {Array}
		 */
		filas_salteadas() {
			let saltean = this.tipos_que_saltean_la_fila
			let es_fila_valida = this.es_fila_valida
			let filas = []
			this.conflictos.forEach(function(conflicto) {
				if (saltean.indexOf(conflicto.tipo) !== -1 && es_fila_valida(conflicto.fila)) {
					filas.push(Number(conflicto.fila))
				}
			})
			return filas
		},
		/**
		 * Cuántos problemas hay para revisar y cuántos avisos, para el encabezado del modal.
		 * Sale del `resumen` del endpoint, que cuenta TODA la importación (no la lista recortada
		 * a 200): avisos = la suma de los tipos de tipos_que_no_cuentan, para_revisar = el resto.
		 * Así para_revisar es el mismo número que muestra el botón (conflicts_count) y el botón
		 * y el modal no se contradicen.
		 *
		 * El `total` de cada renglón del resumen es un COUNT(*) y MySQL puede mandarlo como
		 * string: se pasa por Number() antes de sumar, si no "3" + "2" da "32".
		 *
		 * Sin resumen (una API rara que no lo manda) no hay de dónde separar los avisos: todo el
		 * total del endpoint va como problemas para revisar.
		 *
		 * @returns {{para_revisar: Number, avisos: Number}}
		 */
		conteo_conflictos() {
			if (!this.resumen_conflictos.length) {
				return {
					para_revisar: Number(this.total_conflictos) || 0,
					avisos: 0,
				}
			}
			let no_cuentan = this.tipos_que_no_cuentan
			let para_revisar = 0
			let avisos = 0
			this.resumen_conflictos.forEach(function(item) {
				let total = Number(item.total) || 0
				if (no_cuentan.indexOf(item.tipo) !== -1) {
					avisos += total
				} else {
					para_revisar += total
				}
			})
			return {
				para_revisar: para_revisar,
				avisos: avisos,
			}
		},
		/**
		 * Lo que va después de la fecha en el encabezado del modal: "3 problemas para revisar y
		 * 2 avisos". La parte de los avisos solo aparece si hay alguno.
		 *
		 * No dice "que no necesitan corrección": una fila repetida por nombre deja la primera y
		 * descarta la de abajo, y si traían datos distintos puede que sí haya que corregir algo.
		 * @returns {String}
		 */
		texto_encabezado_conflictos() {
			let conteo = this.conteo_conflictos
			let texto = this.texto_problemas_para_revisar(conteo.para_revisar)
			if (conteo.avisos > 0) {
				texto += ' y ' + this.numero_es(conteo.avisos)
				texto += conteo.avisos == 1 ? ' aviso' : ' avisos'
			}
			return texto
		},
		/**
		 * True si hay filas que NO se importaron (hoy, solo 'ambiguo').
		 * @returns {Boolean}
		 */
		hay_filas_no_importadas() {
			return this.hay_algun_tipo(this.tipos_que_saltean_la_fila)
		},
		/**
		 * True si hay filas con un valor o un código que no se pudo usar, sin contar las que
		 * quedaron afuera por 'ambiguo'.
		 *
		 * 🔴 Una fila 'ambiguo' puede traer además un problema de dato anterior al match (un
		 * costo 'consultar', un placeholder): ProcessRow registra el numero_invalido y DESPUÉS
		 * corta la fila por el código repetido. Para esa fila ya habla el pie de "no se
		 * importaron", y el de los datos ("si la fila creó o actualizó un artículo…") le sumaría
		 * ruido sobre una fila que quedó afuera. Ver hay_tipo_fuera_de_las_filas_salteadas()
		 * para cómo se cruza por fila y qué pasa con la lista recortada.
		 *
		 * @returns {Boolean}
		 */
		hay_filas_con_un_dato_sin_usar() {
			return this.hay_tipo_fuera_de_las_filas_salteadas(this.tipos_con_un_dato_sin_usar)
		},
		/**
		 * True si hay filas repetidas en el Excel que se cargaron una sola vez.
		 * @returns {Boolean}
		 */
		hay_filas_sobrescritas() {
			return this.hay_algun_tipo(['fila_sobrescrita'])
		},
		/**
		 * True si TODAS las filas sobrescritas (del resumen y de la lista) se repitieron por un
		 * código (campos_de_codigo): en ese caso quedó la última fila y el pie puede decirlo.
		 * Si hay alguna por nombre, por número o sin campo, quedó la PRIMERA y la de abajo se
		 * descartó, así que el pie no puede afirmar cuál quedó.
		 * @returns {Boolean}
		 */
		sobrescritas_solo_por_codigo() {
			let codigos = this.campos_de_codigo
			let es_por_codigo = function(item) {
				return item.tipo !== 'fila_sobrescrita' || codigos.indexOf(item.campo) !== -1
			}
			return this.resumen_conflictos.every(es_por_codigo) && this.conflictos.every(es_por_codigo)
		},
		/**
		 * True si hay filas donde se ignoró una columna de precio (misión 44).
		 * @returns {Boolean}
		 */
		hay_columnas_de_precio_ignoradas() {
			return this.hay_algun_tipo(['columna_de_precio_ignorada'])
		},
		/**
		 * True si hay filas donde el desempate por nombre que pidió el usuario no alcanzó
		 * (misión desempate-por-nombre-codigo-repetido, 9/9/2026), sin contar las que quedaron
		 * afuera por 'ambiguo'.
		 *
		 * 🔴 Con la política de saltear las filas ambiguas, la MISMA fila queda con
		 * 'desempate_por_nombre_sin_resolver' y con 'ambiguo', y no se importó: el pie del
		 * desempate ("sí se importaron, pero no como pediste") sería falso para ella. Mismo
		 * cruce por fila que el pie de los datos.
		 * @returns {Boolean}
		 */
		hay_desempates_sin_resolver() {
			return this.hay_tipo_fuera_de_las_filas_salteadas(['desempate_por_nombre_sin_resolver'])
		},
		/**
		 * Texto del modal de confirmacion antes de revertir, con la fecha y las
		 * cantidades reales de la importacion seleccionada (grupo 305, prompt 03).
		 * Generico si todavia no se eligio ninguna: el computed se evalua antes
		 * de que el usuario apriete "Revertir" por primera vez.
		 * @returns {String}
		 */
		texto_confirmacion_rollback() {
			let model = this.import_history_a_revertir
			if (!model) {
				return 'Vas a revertir esta importación. Esta acción no se puede deshacer.'
			}
			let fecha = this.date(model.created_at, true)
			let creados = model.created_models || 0
			let actualizados = model.updated_models || 0
			return 'Vas a revertir la importación del ' + fecha + '. Se van a eliminar los ' + this.numero_es(creados) +
				' artículos que creó y los ' + this.numero_es(actualizados) + ' que actualizó van a volver a los valores ' +
				'que tenían antes. Esta acción no se puede deshacer.'
		},
	},
	methods: {
		chunks(model) {
			this.import_history_show_lotes = model
			this.$bvModal.show('chunks')
		},
		/**
		 * Normaliza una columna que puede llegar como string JSON crudo (sin cast en el modelo del
		 * backend) o ya parseada en array/objeto ($casts => 'array', como `operaciones` desde la
		 * mision import-excel-compras-chunks del 14/9/2026). Mismo idioma defensivo que ya usan
		 * EnvioModal::json_de() y model_functions.js::order_envio_opcion() para el mismo problema en
		 * otras columnas: la API puede mandar cualquiera de los dos formatos y este componente no
		 * puede asumir cual le toca.
		 *
		 * 🔴 Sin esto, un valor ya parseado (array/objeto) volvia a pasar por JSON.parse(), que lo
		 * coacciona a texto ("[object Object]") y tira SyntaxError DENTRO del render de la celda de
		 * la b-table -- eso rompia el render de TODA la tabla, no solo la celda, y el modal quedaba
		 * vacio sin ningun estado de error (asi se reporto en Doble P, con las dos importaciones que
		 * tenia perfectamente guardadas en la base).
		 *
		 * @param {string|Array|Object|null} valor
		 * @param {Array|Object} valor_por_defecto - que devolver si no hay nada para mostrar
		 * @returns {Array|Object}
		 */
		parse_json_o_array(valor, valor_por_defecto) {
			if (!valor) {
				return valor_por_defecto
			}
			if (typeof valor === 'string') {
				try {
					return JSON.parse(valor)
				} catch (error) {
					return valor_por_defecto
				}
			}
			return valor
		},
		/**
		 * Determina si un estado de importacion se considera fallido.
		 * Incluye el estado legado "error" para registros viejos anteriores a "fallo".
		 * @param {String} status - status crudo de la importacion
		 * @returns {Boolean} true si es un estado fallido
		 */
		es_fallida(status) {
			return status === 'fallo' || status === 'error'
		},
		/**
		 * Devuelve la variante de color del badge segun el estado de la importacion.
		 * @param {String} status - status crudo de la importacion
		 * @returns {String} variante de b-badge (success, primary, secondary, danger, light)
		 */
		status_variant(status) {
			if (status === 'terminado') return 'success'
			if (status === 'en_proceso') return 'primary'
			if (status === 'pendiente' || status === 'en_preparacion') return 'secondary'
			if (status === 'fallo' || status === 'error') return 'danger'
			return 'light'
		},
		/**
		 * Devuelve la etiqueta legible en español para el estado de la importacion.
		 * @param {String} status - status crudo de la importacion
		 * @returns {String} etiqueta legible, o el status crudo si no matchea ninguno conocido
		 */
		status_label(status) {
			if (status === 'terminado') return 'Terminado'
			if (status === 'en_proceso') return 'Procesando'
			if (status === 'pendiente' || status === 'en_preparacion') return 'En preparación'
			if (status === 'fallo' || status === 'error') return 'Fallido'
			return status
		},
		/**
		 * Abre el modal de detalle de error con la importacion seleccionada.
		 * @param {Object} item - item de la tabla (incluye error_message y error_trace)
		 */
		ver_error(item) {
			this.error_seleccionado = item
			this.$bvModal.show('import-error-detail')
		},
		/**
		 * Copia el log tecnico completo del error seleccionado al portapapeles.
		 * @returns {void}
		 */
		copiar_trace() {
			if (this.error_seleccionado && this.error_seleccionado.error_trace) {
				navigator.clipboard.writeText(this.error_seleccionado.error_trace)
				this.$toast.success('Log copiado')
			}
		},
		/**
		 * Determina si una importacion tuvo al menos un problema (conflicto) durante el matching.
		 * @param {Object} import_history - registro de import_histories (tabla o crudo)
		 * @returns {Boolean} true si conflicts_count es mayor a 0
		 */
		tiene_conflictos(import_history) {
			if (!import_history) return false
			return Number(import_history.conflicts_count) > 0
		},
		/**
		 * "1 problema para revisar" / "N problemas para revisar". Lo usan el title del botón de
		 * la columna Problemas y el encabezado del modal, para que los dos lo digan igual.
		 * @param {Number|String} cantidad - puede llegar como string desde la API
		 * @returns {String}
		 */
		texto_problemas_para_revisar(cantidad) {
			let numero = Number(cantidad) || 0
			if (numero == 1) {
				return '1 problema para revisar'
			}
			return this.numero_es(numero) + ' problemas para revisar'
		},
		/**
		 * True si el tipo es un aviso, de los que no suman al número del botón (ver
		 * tipos_que_no_cuentan).
		 * @param {String} tipo
		 * @returns {Boolean}
		 */
		es_aviso(tipo) {
			return this.tipos_que_no_cuentan.indexOf(tipo) !== -1
		},
		/**
		 * True si alguno de los tipos pedidos está entre los presentes en la importación
		 * (ver tipos_presentes).
		 * @param {Array} tipos
		 * @returns {Boolean}
		 */
		hay_algun_tipo(tipos) {
			let presentes = this.tipos_presentes
			return tipos.some(function(tipo) {
				return presentes.indexOf(tipo) !== -1
			})
		},
		/**
		 * True si la fila trae un número que se puede usar para cruzar (no null, no vacía, numérica).
		 * @param {*} fila
		 * @returns {Boolean}
		 */
		es_fila_valida(fila) {
			return fila !== null && typeof fila != 'undefined' && fila !== '' && !isNaN(Number(fila))
		},
		/**
		 * True si hay algún conflicto de los tipos pedidos en una fila que NO quedó afuera por
		 * 'ambiguo' (ver filas_salteadas). Lo usan los pies que hablan de filas que se cargaron
		 * (el de los datos sin usar y el del desempate), para no afirmárselo a una fila salteada.
		 *
		 * - Con la lista COMPLETA se decide por fila. Un conflicto sin número de fila no se puede
		 *   cruzar con nada y cuenta: su tipo es lo único que se sabe de él.
		 * - Con la lista RECORTADA queda por tipo (hay_algun_tipo sobre tipos_presentes): el
		 *   resumen viene agrupado por tipo y campo, no por fila, así que con lo que no se trajo
		 *   no hay forma de saber si el conflicto era de una fila salteada. En ese caso el pie
		 *   puede salir aunque todos esos conflictos sean de filas ambiguas.
		 *
		 * @param {Array} tipos
		 * @returns {Boolean}
		 */
		hay_tipo_fuera_de_las_filas_salteadas(tipos) {
			if (!this.lista_de_conflictos_completa) {
				return this.hay_algun_tipo(tipos)
			}
			let filas_salteadas = this.filas_salteadas
			let es_fila_valida = this.es_fila_valida
			return this.conflictos.some(function(conflicto) {
				if (tipos.indexOf(conflicto.tipo) === -1) {
					return false
				}
				if (!es_fila_valida(conflicto.fila)) {
					return true
				}
				return filas_salteadas.indexOf(Number(conflicto.fila)) === -1
			})
		},
		/**
		 * Detalle de una 'fila_sobrescrita' en la celda Problema. Para los códigos
		 * (campos_de_codigo) la última fila gana: `fila` es la pisada y `fila_ganadora` la que
		 * quedó. Por nombre, por número o sin campo es AL REVÉS: ProcessRow descarta la fila de
		 * abajo, así que `fila` es la que quedó y `fila_ganadora` (la que se estaba procesando)
		 * es la que se tiró. Decirle "sobrescrita por la fila N" en ese caso era mentirle.
		 * @param {Object} item - conflicto de tipo fila_sobrescrita
		 * @returns {String}
		 */
		texto_fila_sobrescrita(item) {
			if (this.campos_de_codigo.indexOf(item.campo) !== -1) {
				return '(sobrescrita por la fila ' + item.fila_ganadora + ')'
			}
			return '(repetida en la fila ' + item.fila_ganadora + ', que se descartó)'
		},
		/**
		 * "(1 artículo)" / "(N artículos)" para los conflictos que traen article_ids.
		 * @param {Array} article_ids
		 * @returns {String}
		 */
		texto_cantidad_articulos(article_ids) {
			let cantidad = article_ids.length
			if (cantidad == 1) {
				return '(1 artículo)'
			}
			return '(' + this.numero_es(cantidad) + ' artículos)'
		},
		/**
		 * Texto de un chip del resumen: "Tipo (Campo): total", o "Tipo: total" si el problema
		 * no es de un campo en particular. Antes el paréntesis iba siempre, y para
		 * 'sin_identificador' (que no tiene campo) el chip mostraba un "()" vacío.
		 * @param {Object} item - renglón del resumen: {tipo, campo, total}
		 * @returns {String}
		 */
		texto_chip_resumen(item) {
			let texto = this.tipo_conflicto_label(item.tipo)
			if (item.campo) {
				texto += ' (' + this.campo_conflicto_label(item.campo) + ')'
			}
			return texto + ': ' + this.numero_es(Number(item.total) || 0)
		},
		/**
		 * Abre el modal de problemas y carga desde la API el detalle de conflictos
		 * de la importacion seleccionada.
		 * @param {Object} import_history - registro de import_histories cuyos problemas se quieren ver
		 * @returns {void}
		 */
		ver_conflictos(import_history) {
			// Importacion seleccionada, para mostrar su fecha en el encabezado del modal
			this.import_history_conflictos = import_history
			this.conflictos = []
			this.resumen_conflictos = []
			this.total_conflictos = 0
			this.cargando_conflictos = true

			this.$bvModal.show('modal-conflictos-importacion')

			/*
			 * Mision 44: se pide el tope que admite el endpoint (200) en vez de dejar el
			 * default de 50. La tabla ya recortaba a 200 y el aviso de recorte comparaba
			 * contra 200, asi que con el default de 50 ese aviso NO SE MOSTRABA NUNCA: el
			 * usuario veia 50 de N sin que nada se lo dijera. Y con el tipo nuevo
			 * 'columna_de_precio_ignorada', que se registra una vez por fila salteada, las
			 * primeras 50 filas pueden ser todas de ese tipo y tapar los conflictos que si
			 * son problemas de verdad.
			 */
			this.$api.get('import-history/' + import_history.id + '/conflicts?limit=200')
			.then(res => {
				// Arrays siempre (aunque la API no los mande), porque las computeds del
				// encabezado y de los pies los recorren sin preguntar; y el total como número,
				// porque un COUNT puede llegar como string.
				this.conflictos = Array.isArray(res.data.conflicts) ? res.data.conflicts : []
				this.resumen_conflictos = Array.isArray(res.data.resumen) ? res.data.resumen : []
				this.total_conflictos = Number(res.data.total) || 0
				this.cargando_conflictos = false
			})
			.catch(err => {
				this.cargando_conflictos = false
				this.$toast.error('No se pudieron cargar los problemas de la importación')
			})
		},
		/**
		 * Traduce el "tipo" tecnico de un conflicto a un texto entendible por el usuario.
		 * @param {String} tipo - tipo crudo devuelto por el backend (ambiguo, placeholder_descartado, sin_identificador)
		 * @returns {String} texto traducido, o el tipo crudo si no matchea ninguno conocido
		 */
		tipo_conflicto_label(tipo) {
			let labels = {
				ambiguo: 'Código repetido: la fila coincidía con más de un artículo',
				placeholder_descartado: "Código inválido: se ignoró un valor como '-' o 'S/N'",
				sin_identificador: 'Fila sin ningún código utilizable',
				// Nuevos (grupo 229, prompt 07): parseo robusto de columnas numericas.
				numero_invalido: 'Valor numérico inválido: no se pudo interpretar',
				numero_fuera_de_rango: 'Valor numérico demasiado grande para la columna',
				// Nuevo (grupo 265, prompt 03): repetido dentro del propio archivo, resuelto.
				fila_sobrescrita: 'Fila sobrescrita',
				// Nuevo (grupo 265, prompt 08): identificador unico que no se pudo asignar por match multiple.
				identificador_sin_asignar: 'No se pudo asignar un código único: coincidían varios artículos',
				// Nuevo (mision 44): el articulo se maneja por la otra columna de precio, asi
				// que la del Excel no se aplico. La fila se proceso bien: no es un error.
				// La etiqueta es corta a proposito: el detalle esta en el pie del modal, y en
				// un telefono de 360px una etiqueta larga se sale de la pantalla (los chips
				// del resumen son nowrap). Medido en la aplicacion, no supuesto.
				columna_de_precio_ignorada: 'Columna de precio no aplicada',
				// Nuevo (mision desempate-por-nombre-codigo-repetido, 9/9/2026): el usuario
				// pidio desempatar por nombre y para esa fila el nombre no alcanzo. La fila SI
				// se aplico (a todos los candidatos); el detalle honesto esta en el pie.
				// 🔴 Sin esta entrada el fallback `labels[tipo] || tipo` le mostraba al usuario
				// el slug crudo 'desempate_por_nombre_sin_resolver' en la tabla y en los chips.
				desempate_por_nombre_sin_resolver: 'No se pudo separar por nombre',
			}
			return labels[tipo] || tipo
		},
		/**
		 * Traduce el nombre tecnico de un campo (bar_code, sku, etc.) a su nombre visible.
		 * @param {String} campo - campo crudo devuelto por el backend
		 * @returns {String} nombre traducido, o el campo crudo si no matchea ninguno conocido
		 */
		campo_conflicto_label(campo) {
			let labels = {
				bar_code: 'Código de barras',
				sku: 'SKU',
				provider_code: 'Código de proveedor',
				name: 'Nombre',
				// Nuevos (grupo 229, prompt 07): campos numericos que puede reportar
				// registrar_conflicto_numerico() en ProcessRow.
				cost: 'Costo',
				price: 'Precio',
				percentage_gain: 'Margen de ganancia',
				stock_min: 'Stock mínimo',
				unidades_individuales: 'Unidades individuales',
				medida: 'Medida',
			}
			return labels[campo] || campo
		},
		/**
		 * El backend manda can_revert en cada fila del historial (ImportHistoryController::index).
		 * Se compara contra false explicitamente y no por valor de verdad: si una API todavia sin
		 * actualizar no manda el campo, llega undefined, y en ese caso conviene mostrar el boton
		 * (comportamiento de siempre) en vez de esconderlo y dejar al usuario sin la opcion.
		 */
		puede_revertir(model) {
			if (!model) return false
			return model.can_revert !== false
		},
		/**
		 * Guarda la importacion elegida y abre el modal de confirmacion. No dispara
		 * ningun request todavia (grupo 305, prompt 03).
		 * @param {Object} model - registro crudo del historial a revertir
		 */
		pedir_confirmacion_rollback(model) {
			this.import_history_a_revertir = model
			this.$bvModal.show('confirm-rollback-import')
		},
		/**
		 * Dispara el rollback tras la confirmacion del modal. Limpia la seleccion
		 * antes del POST para que dos confirmaciones seguidas no lo manden dos veces,
		 * y marca la fila localmente para que el boton desaparezca sin esperar a
		 * reabrir el modal (grupo 305, prompt 03).
		 */
		ejecutar_rollback() {
			if (!this.import_history_a_revertir) return

			let model = this.import_history_a_revertir
			this.import_history_a_revertir = null

			let self = this
			/*
			 * 🔴 Bug de tipeo, arreglado. Las tres lineas de abajo decian `setMessage`: la
			 * segunda tenia que ser `setLoading`. Costaba dos cosas a la vez:
			 *   1. el overlay NUNCA se prendia, asi que apretar "Revertir" no daba ninguna senal
			 *      y se podia apretar de nuevo mientras el POST estaba en vuelo;
			 *   2. `auth.message` quedaba en el booleano `true` (y despues en `false`), que es el
			 *      texto que se dibuja DEBAJO del spinner del loading global. La proxima vez que
			 *      cualquier otra cosa prendia el overlay, el usuario leia "false" ahi abajo.
			 * Las dos salidas limpian el mensaje con '' y no con un booleano.
			 */
			this.$store.commit('auth/setMessage', 'Revirtiendo la importación...')
			this.$store.commit('auth/setLoading', true)
			this.$api.post('import-history/rollback/'+model.id)
			.then(function(res) {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.success('Enviado, te avisaremos cuando termine')
				self.$set(model, 'rollback_status', 'encolado')
				self.$set(model, 'can_revert', false)
			})
			.catch(function(err) {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				let mensaje = 'No se pudo revertir la importación'
				if (err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				self.$toast.error(mensaje)
				self.getModels()
			})
		},
		to_excel(model) {
			let link = env('VUE_APP_API_URL')+'/imported-files/'+model.excel_url.split('/')[1]
			window.open(link)
		},
		// modelos_creados(model) {
		// 	this.$store.commit('auth/setLoading', true)
		// 	this.$api.get('import-history/created-models/'+model.id)
		// 	.then(res => {
		// 		this.$store.commit('auth/setLoading', false)
		// 		this.articulos_creados = res.data.model.articulos_creados
		// 		this.$bvModal.show('articulos-creados')
		// 	})
		// 	this.$bvModal.show('articulos-creados')
		// },
		// modelos_actualizados(model) {
		// 	this.$store.commit('auth/setLoading', true)
		// 	this.$api.get('import-history/updated-models/'+model.id)
		// 	.then(res => {
		// 		this.$store.commit('auth/setLoading', false)
		// 		this.articulos_creados = res.data.model.articulos_actualizados
		// 		this.$bvModal.show('articulos-creados')
		// 	})
		// },
		/**
		 * Nombre del proveedor de una importacion.
		 *
		 * 🔴 Busca primero en el catalogo liviano (`options`) y despues en `models`, y ese orden
		 * importa: desde la mision 43 (12/8/2026) el catalogo de proveedores ya no se descarga al
		 * iniciar sesion, asi que `models` esta vacio salvo que la pantalla que abrio este historial
		 * lo haya pedido. Antes esta columna se veia por el arranque; sin este cambio quedaba en
		 * blanco, sin ningun error, para cualquiera que entrara desde el Listado.
		 *
		 * `options` (id + name, grupo 332) es exactamente lo que hace falta aca: un nombre.
		 *
		 * @param {object} model
		 * @returns {string|null}
		 */
		getProvider(model) {
			let provider = this.$store.state.provider.options.find(item => {
				return item.id == model.provider_id
			})
			if (typeof provider == 'undefined') {
				provider = this.getModelFromId('provider', model.provider_id)
			}
			if (typeof provider != 'undefined' && provider !== null && provider.name) {
				return provider.name
			}
			return null
		},
		/**
		 * Punto de entrada unico para abrir el modal: lo llaman tanto el @show del b-modal
		 * (bootstrap-vue) como el watch de la prop show_history, que son los dos caminos que
		 * hoy dispara el resto de la SPA para mostrar este historial.
		 *
		 * Siempre arranca en la pagina 1, aunque la vez anterior se haya quedado en otra: es
		 * el comportamiento esperable de un modal que se reabre (no una pestaña que retoma
		 * donde la dejaste). Si current_page ya vale 1 no hay nada que cambiar y el watch de
		 * arriba no dispara solo -- por eso acá se pide la carga a mano en ese caso, para no
		 * perder el fetch inicial. Si vale otra cosa, alcanza con pisarlo: el watch de
		 * current_page hace el pedido. Cualquiera de los dos caminos llama a getModels() una
		 * sola vez.
		 */
		abrirHistorial() {
			if (this.current_page === 1) {
				this.getModels()
			} else {
				this.current_page = 1
			}
		},
		getModels() {
			// El catalogo liviano de proveedores, que es lo que resuelve la columna Proveedor de la
			// tabla (ver getProvider). getOptions tiene su propia guarda: si ya se pidio en esta
			// sesion no repite la descarga.
			this.$store.dispatch('provider/getOptions')

			this.loading = true
			this.error_al_cargar = ''

			// Token de ESTA llamada puntual (ver el comentario de peticion_actual en data()).
			this.peticion_actual += 1
			let mi_peticion = this.peticion_actual

			this.$api.get('import-history/'+this.model_name+'?page='+this.current_page)
			.then(res => {
				console.log(res)
				// Ya salio una llamada mas nueva mientras esta esperaba respuesta (cambio de
				// pagina, o se reabrio el modal): esta respuesta quedo vieja, se descarta sin
				// tocar nada del estado -- lo que corresponde mostrar ya lo esta resolviendo
				// la llamada mas nueva.
				if (mi_peticion !== this.peticion_actual) {
					return
				}
				this.loading = false
				this.error_al_cargar = ''
				this.models = res.data.models
				// pagination viene siempre del contrato nuevo (models + pagination), pero se
				// cubre igual por si alguna vez pega contra una API vieja que solo mande
				// {models}: sin esto, last_page/total quedarian en el valor de la pagina
				// anterior y <b-pagination> mostraria una cantidad de paginas que ya no existe.
				let pagination = res.data.pagination || {}
				this.last_page = pagination.last_page || 1
				this.total = pagination.total || 0
				// No se pisa this.current_page con pagination.current_page: ya es el valor que
				// nosotros mandamos en el pedido, y reasignarlo ademas dispararia el watch de
				// current_page y encadenaria un pedido de mas.
			})
			.catch(err => {
				// Misma guarda que en el .then: un error de una llamada vieja no tiene que
				// pisar el resultado (bueno o el propio error) de una llamada mas nueva.
				if (mi_peticion !== this.peticion_actual) {
					return
				}
				this.loading = false
				console.log(err)
				/*
				 * 🔴 Sin esto la pantalla mentía: el .catch apagaba el loading y se callaba, y
				 * como `models` quedaba vacío se dibujaba "Aún no hay importaciones". El usuario
				 * que acababa de importar leía que no había importado nada.
				 *
				 * Los `models` viejos NO se limpian a propósito: si esta es una recarga y ya
				 * había un historial en pantalla, sigue siendo información buena. El estado de
				 * error solo se dibuja cuando además la lista está vacía.
				 */
				this.error_al_cargar = 'No pudimos cargar el historial. Volvé a abrir esta ventana o tocá Reintentar.'

				/*
				 * Si ya había un historial dibujado (esto es una recarga), la tabla se queda: sigue
				 * siendo información buena y borrarla sería peor. Pero el fallo tiene que decirse
				 * igual, porque si no el usuario cree que está mirando lo último.
				 */
				if (this.models.length) {
					this.$toast.error('No pudimos actualizar el historial. Lo que ves puede no estar al día.', {
						duration: 8000
					})
				}
			})
		}
	}
}
</script>
<style lang="sass">
// Estado de error del historial: alerta + boton de reintento, centrados.
// Mismo aire que el estado vacio (HistoryEmptyState) para que no se sienta otra pantalla.
.import-history-error
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	padding: 2rem 1.5rem
	text-align: center

	.alert
		max-width: 420px
		margin-bottom: 15px

.cont-columns
	max-height: 100px
	overflow-y: scroll

// Log tecnico del error de importacion: estilo tipo consola para facilitar la lectura
.import-error-trace
	max-height: 400px
	overflow: auto
	background: #1e1e1e
	color: #d4d4d4
	padding: 12px
	border-radius: 6px
	font-size: 12px
	white-space: pre-wrap
	word-break: break-word

// Resumen de problemas de una importacion, mostrado como chips en el modal de conflictos
.conflictos-resumen
	display: flex
	flex-wrap: wrap
	gap: 8px

	// El selector va doblado (.badge.conflictos-resumen__chip) a proposito: con una sola
	// clase empata en especificidad con .badge de bootstrap, que define white-space: nowrap
	// y se carga despues, asi que ganaba bootstrap y el chip NO envolvia. Medido en la
	// aplicacion a 360px (mision 44): los chips se salian de la pantalla, con el texto
	// cortado y sin scroll que permitiera llegar a el.
	&__chip.badge
		font-size: 12px
		font-weight: 500
		padding: 6px 10px
		white-space: normal
		text-align: left
		max-width: 100%
</style>
