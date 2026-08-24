<template>
	<b-modal
	:id="modal_id"
	size="lg"
	hide-footer
	:title="modal_title"
	@show="on_show"
	@hide="reset">

		<!-- Indicador de pasos -->
		<div class="ai-import-steps m-b-20">
		<span
		v-for="n in 4"
			:key="n"
			class="ai-import-step-dot"
			:class="{ 'ai-import-step-dot--active': step >= n }">
				{{ n }}
			</span>
		</div>

		<!-- ========================================================== -->
		<!-- PASO 1: Subir archivo y analizar con IA                     -->
		<!-- ========================================================== -->
		<div v-if="step === 1">

			<p class="text-muted m-b-15">
				Subí tu planilla Excel y Claude IA detectará automáticamente qué columna corresponde a cada propiedad del sistema.
			</p>

			<b-form-group label="Archivo Excel (.xlsx, .xls)">
				<b-form-file
				v-model="file"
				accept=".xlsx,.xls"
				placeholder="Seleccioná un archivo..."
				browse-text="Explorar"
				@input="onFileChange">
				</b-form-file>
			</b-form-group>

			<!--
				Selector de hoja. Aparece SOLO cuando el libro tiene más de una: con una
				sola hoja no se dibuja absolutamente nada acá y el flujo queda igual que
				siempre, sin un click de más.
			-->
			<b-form-group
			v-if="hay_varias_hojas && !file_processing"
			class="ai-import-hojas m-t-10 m-b-10"
			label="El archivo tiene varias hojas. ¿Cuál querés importar?">
				<b-form-select
				v-model="hoja_seleccionada"
				:options="opciones_de_hoja"
				size="sm">
					<template #first>
						<b-form-select-option
						:value="null"
						disabled>
							Elegí una hoja...
						</b-form-select-option>
					</template>
				</b-form-select>
				<small
				v-if="falta_elegir_hoja"
				class="text-muted d-block m-t-3">
					No se analiza ni se importa nada hasta que elijas una hoja.
				</small>
			</b-form-group>

			<!-- Resumen del rango detectado y detección de cabecera al elegir el archivo -->
			<div v-if="finish_row && !file_processing" class="ai-import-file-info m-t-10 m-b-10">

				<!-- Resumen de filas -->
				<p class="text-muted small m-b-5">
					Última fila con contenido detectada: <strong>{{ finish_row }}</strong>.
					<span v-if="excel_rows_to_import_count > 0">
						Se importarán <strong>{{ numero_es(excel_rows_to_import_count) }}</strong> filas
						(desde la fila <strong>{{ start_row }}</strong> hasta la <strong>{{ finish_row }}</strong>).
					</span>
				</p>

				<!-- Toggle de cabecera: permite corregir la detección automática -->
				<div class="ai-import-header-detection">
					<b-form-checkbox
					v-model="has_header_row"
					size="sm"
					@change="header_row_manually_overridden = true">
						La primera fila es una cabecera de columnas
						<span v-if="!header_row_manually_overridden" class="text-muted ai-import-header-auto-label">
							(detectado automáticamente)
						</span>
					</b-form-checkbox>
					<!-- Advertencia cuando no hay cabecera: el mapeo de Claude puede ser menos preciso -->
					<small v-if="!has_header_row" class="text-warning d-block m-t-3">
						Sin cabecera: Claude recibirá solo los datos para inferir el mapeo. La detección puede ser menos precisa.
					</small>
					<!--
						Fila de encabezado detectada, visible y corregible. Antes esto era un
						<small> que sólo aparecía cuando la cabecera no estaba en la fila 1 y
						no se podía tocar: si la detección erraba, el usuario se enteraba
						cuando ya había importado. Ahora se muestra siempre y se corrige acá,
						antes de gastar un peso en el análisis.
					-->
					<div
					v-if="has_header_row"
					class="ai-import-encabezado"
					:class="{ 'ai-import-encabezado--dudoso': encabezado_confianza === 'baja' }">
						<label
						:for="'ai-import-encabezado-fila-' + model"
						class="ai-import-encabezado-label m-b-0">
							Encabezado detectado en la fila
						</label>
						<b-form-input
						:id="'ai-import-encabezado-fila-' + model"
						v-model="encabezado_fila"
						type="number"
						size="sm"
						min="1"
						class="ai-import-encabezado-input"
						@change="corregir_fila_de_encabezado">
						</b-form-input>
						<span class="ai-import-encabezado-datos text-muted">
							Los datos empiezan en la fila {{ start_row }}.
						</span>
					</div>

					<!-- Detección poco confiable: se lo decimos en vez de dejarlo pasar. -->
					<small
					v-if="has_header_row && encabezado_confianza === 'baja'"
					class="text-warning d-block m-t-3">
						No pudimos identificar el encabezado con seguridad. Revisá que la fila sea la correcta.
					</small>
					<small
					v-else-if="has_header_row && encabezado_motivo === 'encabezado_corrido'"
					class="text-muted d-block m-t-3">
						Es la fila con más celdas llenas, todas de texto corto y ninguna repetida.
					</small>
				</div>

			</div>
			<p
			v-if="file_processing"
			class="text-muted small m-t-10 m-b-0">
				Leyendo filas del Excel...
			</p>
			<b-alert
			v-if="excel_rows_read_error"
			show
			variant="warning"
			class="m-t-10 m-b-0">
				{{ excel_rows_read_error }}
			</b-alert>

			<!-- Mensaje de error del análisis -->
			<b-alert
			v-if="error_message"
			show
			variant="danger"
			class="m-t-10">
				{{ error_message }}
			</b-alert>

			<!--
				falta_elegir_hoja es literalmente el "no se importa nada hasta que se elige":
				con varias hojas el botón no se puede tocar hasta que haya una elegida.
			-->
			<b-button
			variant="primary"
			block
			:disabled="!file || loading || file_processing || falta_elegir_hoja"
			@click="analyze">
				<b-spinner
				v-if="loading"
				small
				class="m-r-5">
				</b-spinner>
				{{ loading ? 'Analizando con IA...' : 'Analizar con IA' }}
			</b-button>

			<!--
				Estado de la corrida DENTRO del modal. Antes esto vivia en el loading
				global (auth/setLoading + auth/setMessage), que tapaba la aplicacion
				entera: con un archivo de 20.000 filas el usuario se quedaba varios
				minutos sin sistema. Ahora el progreso se muestra aca y la app queda libre.
			-->
			<div
			v-if="loading && analysis_paso"
			class="ai-import-progreso m-t-15">

				<p class="text-muted small m-b-5">
					{{ analysis_paso }}
					<span v-if="analysis_progreso"> ({{ analysis_progreso }}%)</span>
				</p>

				<b-progress
				v-if="analysis_progreso"
				:value="analysis_progreso"
				max="100"
				height="6px"
				class="m-b-10">
				</b-progress>

				<!--
					El ofrecimiento explicito de irse. Aparece a los 20 segundos, que es
					cuando el analisis dejo de ser "un momentito" y el usuario empieza a
					preguntarse si se colgo.
				-->
				<div v-if="analysis_es_archivo_grande">
					<p class="text-muted small m-b-10">
						Los archivos grandes pueden tardar unos minutos. Podés cerrar esta ventana
						y seguir trabajando: te avisamos cuando el análisis esté listo.
					</p>
					<b-button
					variant="outline-secondary"
					size="sm"
					block
					@click="seguir_en_segundo_plano">
						Seguir en segundo plano
					</b-button>
				</div>

			</div>

		</div>

		<!-- ========================================================== -->
		<!-- PASO 2: Confirmar proveedor y mapeo de columnas             -->
		<!-- ========================================================== -->
		<div v-if="step === 2">

			<!--
				De qué hoja y con qué fila de encabezado salió el mapeo que el usuario está
				por confirmar. Es un renglón fijo a propósito: sin esto, una hoja mal elegida
				o un encabezado mal detectado sólo se descubren cuando la importación ya pasó.
			-->
			<p
			v-if="resumen_de_hoja_y_encabezado"
			class="ai-import-resumen-hoja text-muted small m-b-15">
				{{ resumen_de_hoja_y_encabezado }}
			</p>

			<!--
				Un mismo nombre de encabezado cubriendo dos columnas (típico de una cabecera
				fusionada: «PRECIOS» sobre E y F). El sistema repartió las propiedades en
				orden porque no tiene forma de saber cuál es cuál, y si se equivocó quedan
				costo y precio invertidos en todo el catálogo — que es peor que el error que
				esto vino a arreglar, porque invertido no se ve nunca.

				Va ANTES de la alerta de columnas sin nombre a propósito: de los dos avisos
				amarillos del paso 2, éste es el que tiene la consecuencia cara.

				El texto sale armado del backend, en `mensaje`. No se rearma acá: el backend
				es el único que sabe a qué columna fue a parar cada propiedad, y este modal
				lo comparten artículos, clientes y proveedores.
			-->
			<b-alert
			v-if="columnas_ambiguas.length > 0"
			show
			variant="warning"
			class="m-b-15">
				<p class="font-weight-bold m-b-5 m-t-0">
					<i class="icon-alert-triangle m-r-5"></i>
					<span v-if="columnas_ambiguas.length === 1">
						Un nombre de encabezado cubre más de una columna
					</span>
					<span v-else>
						Hay nombres de encabezado que cubren más de una columna
					</span>
				</p>
				<p
				v-for="(aviso, aviso_index) in columnas_ambiguas"
				:key="'columna-ambigua-' + aviso_index"
				class="small m-b-5 m-t-0">
					{{ aviso.mensaje }}
				</p>
				<p class="small m-b-0 m-t-0">
					Las columnas afectadas están marcadas en el mapeo de acá abajo.
				</p>
			</b-alert>

			<!--
				Columnas cuyo nombre no se pudo recuperar del encabezado ni siquiera después
				de propagar las celdas fusionadas. Se muestran con la LETRA de Excel, que es
				lo que el usuario ve en su planilla; el backend las manda como índices.
			-->
			<b-alert
			v-if="letras_de_columnas_sin_nombre.length > 0"
			show
			variant="warning"
			class="m-b-15">
				<i class="icon-alert-triangle m-r-5"></i>
				<span v-if="letras_de_columnas_sin_nombre.length === 1">
					La columna <strong>{{ letras_de_columnas_sin_nombre[0] }}</strong> no tiene nombre en el encabezado.
				</span>
				<span v-else>
					Las columnas <strong>{{ letras_de_columnas_sin_nombre.join(', ') }}</strong> no tienen nombre en el encabezado.
				</span>
				Revisá el mapeo antes de importar.
			</b-alert>

		<!-- Sección de proveedor inferido (solo para artículos) -->
		<div
		v-if="model === 'article'"
		class="m-b-20">

			<p class="font-weight-bold m-b-5">Proveedor detectado</p>

			<!-- Alerta si la confianza del proveedor es baja -->
			<b-alert
			v-if="provider_confidence === 'bajo'"
			show
			variant="warning"
			class="m-b-10">
				<i class="icon-alert-triangle m-r-5"></i>
				Confianza baja — verificá el proveedor antes de continuar.
			</b-alert>

			<b-form-group
			:description="provider_confidence_label">
				<b-form-select
				v-model="selected_provider_id"
				:options="provider_options">
				</b-form-select>
			</b-form-group>

			<b-alert
			v-if="has_provider_column"
			show
			variant="info"
			class="m-t-10 m-b-0">
				<i class="icon-info m-r-5"></i>
				El proveedor de cada artículo se tomará de la columna del Excel.
				Dejá <strong>Sin proveedor</strong> en el selector de arriba para que funcione correctamente.
				Si elegís un proveedor global, pisará el valor de la columna para todos los artículos.
			</b-alert>

		</div>

		<hr
		v-if="model === 'article'">

			<!-- Tabla de mapeo de columnas -->
			<p class="font-weight-bold m-b-10">Mapeo de columnas</p>

			<p class="text-muted small m-b-15">
				Revisá que cada columna del Excel esté asignada a la propiedad correcta.
				<span class="text-warning">Las filas en amarillo tienen baja confianza.</span>
				<span class="ai-import-mapping-legend-interpretation"> Las filas en celeste son interpretaciones de la IA que conviene validar.</span>
				<span class="ai-import-mapping-legend-ignored"> Las filas en violeta se ignoran en la importación.</span>
			</p>

			<!-- Notas de asistencia globales de Claude (consejos generales sobre el archivo) -->
			<div
			v-if="assistant_notes.length > 0"
			class="assistant-notes-container m-b-15">
				<div
				v-for="(note, idx) in assistant_notes"
				:key="'an-' + idx"
				class="assistant-note">
					<span class="assistant-note-icon">💡</span>
					<span class="assistant-note-text">{{ note }}</span>
				</div>
			</div>

			<b-alert
			v-if="column_mapping_interpretation_alerts.length > 0"
			show
			variant="info"
			class="m-b-15">
				<p class="font-weight-bold m-b-5 m-t-0">
					<i class="icon-info m-r-5"></i>
					Interpretaciones de la IA
				</p>
				<p
				v-for="(alert_text, alert_index) in column_mapping_interpretation_alerts"
				:key="'interpretation-alert-' + alert_index"
				class="small m-b-5 m-t-0">
					{{ alert_text }}
				</p>
			</b-alert>

			<div class="ai-import-mapping-table">

				<!-- Cabecera -->
				<div class="ai-import-mapping-row ai-import-mapping-row--header">
					<span>Columna en Excel</span>
					<span>Propiedad del sistema</span>
					<span class="text-center">Confianza</span>
				</div>

				<!-- Fila por cada columna detectada -->
				<div
				v-for="(item, index) in column_mapping"
				:key="index"
				class="ai-import-mapping-block"
				:class="mapping_row_highlight_class(item)">

					<div class="ai-import-mapping-row">

						<!-- Letra y nombre de la columna en el Excel -->
						<span
						class="ai-import-mapping-excel-col"
						:title="excel_column_full_label(item, index)">
							<span class="ai-import-mapping-excel-letter">
								{{ excel_column_letter_label(item, index) }}
							</span>
							<span class="ai-import-mapping-excel-header">
								{{ item.excel_column }}
							</span>

							<!--
								Marca de columna ambigua: este encabezado cubre más de una columna
								y la propiedad se repartió por orden. Se marca acá, y no con un
								color de fila más, porque la leyenda de arriba ya tiene tres
								colores y un cuarto no se lee: a la tercera alerta sin motivo, el
								usuario deja de leerlas todas. El icono se explica solo al pasar
								el mouse y no compite con el resaltado de confianza baja.
							-->
							<i
							v-if="columna_es_ambigua(item, index)"
							class="icon-alert-triangle ai-import-mapping-ambiguous-flag"
							title="Este nombre de encabezado cubre más de una columna. Revisá que la propiedad asignada sea la correcta."></i>
						</span>

						<!-- Select de propiedad del sistema -->
						<b-form-select
						v-model="item.system_property"
						:options="system_property_options"
						size="sm">
						</b-form-select>

						<!-- Nivel de confianza del mapeo sugerido por IA -->
						<span class="ai-import-mapping-confidence text-center">
							<span
							class="ai-import-mapping-confidence-value"
							:class="column_confidence_text_class(item.confidence)"
							:title="column_confidence_title(item.confidence)">
								{{ format_column_confidence(item.confidence) }}
							</span>
							<small
							v-if="column_confidence_is_low(item.confidence)"
							class="ai-import-mapping-confidence-hint text-warning">
								Revisar
							</small>
							<small
							v-else-if="column_has_interpretation_note(item)"
							class="ai-import-mapping-confidence-hint text-info">
								Validar
							</small>
						</span>

					</div>

					<p
					v-if="column_has_interpretation_note(item)"
					class="ai-import-mapping-interpretation-note small m-b-0">
						<i class="icon-info m-r-5"></i>
						{{ item.interpretation_note }}
					</p>

				</div>

			</div>

			<!-- Preview de artículos: tabla reactiva con los primeros 5 registros del Excel -->
			<div
			v-if="preview_columns.length > 0 && preview_rows.length > 0"
			class="m-t-20">
				<p class="font-weight-bold m-b-8 small">
					Vista previa - primeros {{ preview_rows.length }} artículos del Excel
				</p>

				<div class="ai-import-preview-table-wrapper">
					<table class="ai-import-preview-table">
						<thead>
							<tr>
								<th
								v-for="(col, idx) in preview_columns"
								:key="'ph-' + idx">
									{{ col.label }}
								</th>
							</tr>
						</thead>
						<tbody>
							<tr
							v-for="(row, rowIdx) in preview_rows"
							:key="'pr-' + rowIdx">
								<td
								v-for="(col, colIdx) in preview_columns"
								:key="'pc-' + rowIdx + '-' + colIdx">
									{{ row[col.excel_column_index] || '-' }}
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<small class="text-muted d-block m-t-5">
					Las columnas marcadas como "Ignorar columna" no aparecen en esta preview.
				</small>

			</div>

			<div class="m-t-20 j-end">
				<b-button
				variant="outline-secondary"
				class="m-r-10"
				@click="step = 1">
					Volver
				</b-button>
				<b-button
				variant="primary"
				:disabled="loading_recomendacion"
				@click="confirmar_paso_2">
					<b-spinner
					v-if="loading_recomendacion"
					small
					class="m-r-5">
					</b-spinner>
					{{ loading_recomendacion ? 'Generando recomendación...' : 'Confirmar y configurar importación' }}
				</b-button>
			</div>

			<!--
				Mismo tratamiento que el paso 1: la recomendacion tambien recorre el
				archivo entero tres veces y vuelve a llamar a Claude, asi que tambien
				puede tardar minutos y tampoco tiene por que retener al usuario.
			-->
			<div
			v-if="loading_recomendacion && analysis_paso"
			class="ai-import-progreso m-t-15">

				<p class="text-muted small m-b-5">
					{{ analysis_paso }}
					<span v-if="analysis_progreso"> ({{ analysis_progreso }}%)</span>
				</p>

				<b-progress
				v-if="analysis_progreso"
				:value="analysis_progreso"
				max="100"
				height="6px"
				class="m-b-10">
				</b-progress>

				<div v-if="analysis_es_archivo_grande">
					<p class="text-muted small m-b-10">
						Podés cerrar esta ventana y seguir trabajando: te avisamos cuando la
						recomendación esté lista.
					</p>
					<b-button
					variant="outline-secondary"
					size="sm"
					block
					@click="seguir_en_segundo_plano">
						Seguir en segundo plano
					</b-button>
				</div>

			</div>

		</div>

		<!-- ========================================================== -->
		<!-- PASO 3: Recomendación de configuración basada en preanálisis -->
		<!-- ========================================================== -->
		<div v-if="step === 3">

			<!-- ====================================================================== -->
			<!-- Bloque explicativo: cadena de identificación efectiva (prompt 06, grupo 229) -->
			<!-- Muestra con qué columna se va a identificar cada fila, en el mismo orden -->
			<!-- de prioridad que usa el matching real del importador.                    -->
			<!-- ====================================================================== -->
			<div v-if="cadena_identificacion" class="ai-import-identification-chain m-b-20">

				<!-- Grupo 284, prompt 04: no se pudo calcular la cadena (sin columnas identificadoras
				mapeadas, o error de lectura del archivo). Antes esto simplemente no dibujaba nada y
				el bloque desaparecía sin ningún aviso. -->
				<b-alert
				v-if="cadena_identificacion.disponible === false"
				show
				variant="warning"
				class="m-b-0">
					No se pudo determinar cómo se van a identificar los artículos. Revisá el mapeo de
					columnas del paso anterior.
					<template v-if="cadena_identificacion.motivo === 'sin_columnas_identificadoras'">
						Ninguna columna identificadora quedó mapeada.
					</template>
				</b-alert>

				<div v-else>

					<p class="font-weight-bold m-b-8">
						Como se van a identificar los articulos
					</p>

					<p class="text-muted small m-b-8">
						De las {{ numero_es(cadena_identificacion.total_filas) }} filas del archivo, se van a identificar así:
					</p>

					<ol class="ai-import-identification-chain-list">
						<li
						v-for="paso in pasos_cadena_identificacion"
						:key="'chain-' + paso.campo"
						class="ai-import-identification-chain-item">

							<span class="ai-import-identification-chain-title">
								{{ paso.label }} — {{ numero_es(paso.filas) }} filas
							</span>

							<small class="d-block text-muted m-t-3">
								{{ paso.descripcion }}
							</small>

							<!-- Configuración vigente, solo junto al escalón de código de proveedor -->
							<small
							v-if="paso.campo === 'provider_code'"
							class="d-block text-muted m-t-3">
								Configuración actual: {{ texto_configuracion_provider_code }}
							</small>

							<!-- Aviso de nombres repetidos, solo junto al escalón de nombre -->
							<small
							v-if="paso.campo === 'name' && aviso_nombres_duplicados"
							class="d-block text-warning m-t-3">
								{{ aviso_nombres_duplicados }}
							</small>

						</li>
					</ol>

					<!-- Aviso de filas sin ningún identificador utilizable -->
					<b-alert
					v-if="filas_sin_identificador > 0"
					show
					variant="warning"
					class="m-t-10 m-b-0">
						{{ numero_es(filas_sin_identificador) }} filas no tienen ningún código utilizable y se van a crear
						como artículos nuevos sin posibilidad de actualizarse en futuras importaciones.
					</b-alert>

				</div>

			</div>

			<!-- Chips de resumen del archivo -->
			<div v-if="duplicate_stats" class="ai-import-summary-chips m-b-15">

				<!-- Total de filas -->
				<span class="ai-import-summary-chip">
					📄 {{ numero_es(duplicate_stats.total_filas_datos) }} filas totales
				</span>

				<!-- Códigos de proveedor repetidos (solo si hay) -->
				<span
				v-if="duplicate_stats.provider_codes_duplicados_intra_archivo > 0"
				class="ai-import-summary-chip ai-import-summary-chip--warning">
					⚠️ {{ numero_es(duplicate_stats.provider_codes_duplicados_intra_archivo) }} cód. proveedor repetido{{ duplicate_stats.provider_codes_duplicados_intra_archivo > 1 ? 's' : '' }}
				</span>

				<!-- Códigos de barras repetidos (solo si hay) -->
				<span
				v-if="duplicate_stats.bar_codes_duplicados_intra_archivo > 0"
				class="ai-import-summary-chip ai-import-summary-chip--warning">
					⚠️ {{ numero_es(duplicate_stats.bar_codes_duplicados_intra_archivo) }} cód. barras repetido{{ duplicate_stats.bar_codes_duplicados_intra_archivo > 1 ? 's' : '' }}
				</span>

				<!-- Colisiones en BD (mismo proveedor) -->
				<span
				v-if="duplicate_stats.provider_codes_existentes_mismo_proveedor > 0"
				class="ai-import-summary-chip ai-import-summary-chip--info">
					🔁 {{ numero_es(duplicate_stats.provider_codes_existentes_mismo_proveedor) }} ya en BD (mismo proveedor)
				</span>

				<!-- Colisiones en BD (otros proveedores) -->
				<span
				v-if="duplicate_stats.provider_codes_existentes_otros_proveedores > 0"
				class="ai-import-summary-chip ai-import-summary-chip--info">
					🔁 {{ numero_es(duplicate_stats.provider_codes_existentes_otros_proveedores) }} ya en BD (otro proveedor)
				</span>

			</div>

			<!-- Tabla de códigos de proveedor repetidos -->
			<div v-if="provider_codes_detail.length > 0" class="m-b-15">

				<p class="font-weight-bold m-b-8 small">Códigos de proveedor repetidos</p>

				<div class="ai-import-duplicates-table">
					<div class="ai-import-duplicates-table__header">
						<span>Código</span>
						<span class="text-center">Repeticiones</span>
						<span>Filas en el Excel</span>
					</div>
					<div
					v-for="(item, idx) in provider_codes_detail"
					:key="'pc-' + idx"
					class="ai-import-duplicates-table__row">
						<span>{{ item.codigo }}</span>
						<span class="text-center">
							<span class="ai-import-duplicates-badge">{{ item.veces }}</span>
						</span>
						<span class="text-muted">{{ item.filas.join(', ') }}</span>
					</div>
				</div>

				<!-- Aviso de truncado cuando hay más duplicados que los mostrados -->
				<small
				v-if="duplicate_stats && duplicate_stats.provider_codes_duplicados_intra_archivo > provider_codes_detail.length"
				class="text-muted d-block m-t-5">
					y {{ numero_es(duplicate_stats.provider_codes_duplicados_intra_archivo - provider_codes_detail.length) }} más...
				</small>

			</div>

			<!-- Tabla de códigos de barras repetidos -->
			<div v-if="bar_codes_detail.length > 0" class="m-b-15">

				<p class="font-weight-bold m-b-8 small">Códigos de barras repetidos</p>

				<div class="ai-import-duplicates-table">
					<div class="ai-import-duplicates-table__header">
						<span>Código</span>
						<span class="text-center">Repeticiones</span>
						<span>Filas en el Excel</span>
					</div>
					<div
					v-for="(item, idx) in bar_codes_detail"
					:key="'bc-' + idx"
					class="ai-import-duplicates-table__row">
						<span>{{ item.codigo }}</span>
						<span class="text-center">
							<span class="ai-import-duplicates-badge">{{ item.veces }}</span>
						</span>
						<span class="text-muted">{{ item.filas.join(', ') }}</span>
					</div>
				</div>

				<!-- Aviso de truncado cuando hay más duplicados que los mostrados -->
				<small
				v-if="duplicate_stats && duplicate_stats.bar_codes_duplicados_intra_archivo > bar_codes_detail.length"
				class="text-muted d-block m-t-5">
					y {{ numero_es(duplicate_stats.bar_codes_duplicados_intra_archivo - bar_codes_detail.length) }} más...
				</small>

			</div>

			<!-- Tabla de códigos inválidos (placeholders) detectados: prompt 06, grupo 229 -->
			<div v-if="placeholders.length > 0" class="m-b-15">

				<p class="font-weight-bold m-b-8 small">Codigos invalidos detectados</p>

				<b-alert show variant="info" class="m-b-10">
					<p class="small m-b-0 m-t-0">
						Estos valores no son codigos reales, son marcadores que usan algunos
						proveedores para indicar que el producto no tiene codigo. Se van a ignorar:
						las filas que los tengan van a pasar al siguiente criterio de identificacion.
						Antes se tomaban como codigos validos y hacian que muchas filas distintas
						se fusionaran en un mismo articulo.
					</p>
				</b-alert>

				<div class="ai-import-duplicates-table">
					<div class="ai-import-duplicates-table__header">
						<span>Código</span>
						<span class="text-center">Repeticiones</span>
						<span>Filas en el Excel</span>
					</div>
					<div
					v-for="(item, idx) in placeholders"
					:key="'ph-' + idx"
					class="ai-import-duplicates-table__row">
						<span>{{ item.valor }}</span>
						<span class="text-center">
							<span class="ai-import-duplicates-badge">{{ item.repeticiones }}</span>
						</span>
						<span class="text-muted">{{ item.filas.join(', ') }}</span>
					</div>
				</div>

			</div>

			<!-- ====================================================================== -->
			<!-- Bloque de alerta de numeros con punto ambiguos (prompt 03, grupo 239)   -->
			<!-- Muestra, columna por columna, como se van a interpretar los numeros con -->
			<!-- punto detectados en el archivo (separador de miles vs decimal), con     -->
			<!-- ejemplos reales tomados del Excel del usuario.                          -->
			<!-- ====================================================================== -->
			<div v-if="columnas_con_ambiguedad_numerica.length > 0" class="ai-import-numeric-formats m-b-15">

				<div
				v-for="columna in columnas_con_ambiguedad_numerica"
				:key="'numfmt-' + columna.campo"
				class="ai-import-numeric-formats__column m-b-15">

					<p class="font-weight-bold m-b-5 small">
						Numeros con punto en la columna {{ columna.nombre_columna_excel }}
					</p>

					<p class="text-muted small m-b-8">
						{{ columna.celdas_con_punto }} valores tienen punto. Asi los vamos a interpretar:
					</p>

					<div class="ai-import-preview-table-wrapper">
						<table class="ai-import-preview-table">
							<thead>
								<tr>
									<th>Fila</th>
									<th>En el Excel</th>
									<th>Se interpreta como</th>
									<th>Queda como</th>
								</tr>
							</thead>
							<tbody>
								<tr
								v-for="(ejemplo, idx) in columna.ejemplos"
								:key="'numfmt-ej-' + columna.campo + '-' + idx">
									<td>{{ ejemplo.fila }}</td>
									<td>{{ ejemplo.original }}</td>
									<td>{{ ejemplo.interpretacion === 'miles' ? 'separador de miles' : 'decimal' }}</td>
									<td>{{ ejemplo.resultado }}</td>
								</tr>
							</tbody>
						</table>
					</div>

					<small class="text-muted d-block m-t-5">
						Regla: si el punto separa grupos de exactamente 3 digitos, es separador de miles.
						En cualquier otro caso es decimal.
					</small>

					<!-- Aviso destacado cuando la columna mezcla ambas interpretaciones -->
					<b-alert
					v-if="columna.nivel_de_riesgo === 'alto'"
					show
					variant="warning"
					class="ai-import-numeric-formats__risk-alert m-t-8 m-b-0">
						<i class="icon-alert-triangle m-r-5"></i>
						Este archivo mezcla las dos interpretaciones en la misma columna. Revisa los ejemplos antes de continuar.
					</b-alert>

				</div>

				<!-- ====================================================================== -->
				<!-- Selector de interpretacion_punto (prompt 05, grupo 239)                 -->
				<!-- Solo se ofrece si hay alguna columna de riesgo "alto" o "medio": si todo -->
				<!-- el archivo es riesgo "bajo" la heuristica automatica ya acierta.         -->
				<!-- ====================================================================== -->
				<div
				v-if="mostrar_selector_interpretacion_punto"
				class="ai-import-numeric-interpretacion m-t-15">

					<p class="font-weight-bold m-b-8 small">
						Como interpretar el punto en los numeros
					</p>

					<b-form-group>
						<b-form-radio
						v-model="interpretacion_punto"
						value="auto"
						class="m-b-5">
							Automatico (recomendado)
							<small class="d-block text-muted m-t-3">
								Si el punto separa grupos de exactamente 3 digitos es separador de miles; si no, es decimal.
							</small>
						</b-form-radio>
						<b-form-radio
						v-model="interpretacion_punto"
						value="siempre_miles"
						class="m-b-5">
							El punto siempre separa miles
							<small class="d-block text-muted m-t-3">
								Elegilo si tu proveedor escribe 2.500 para dos mil quinientos y nunca usa el punto como decimal.
							</small>
						</b-form-radio>
						<b-form-radio
						v-model="interpretacion_punto"
						value="siempre_decimal">
							El punto siempre es decimal
							<small class="d-block text-muted m-t-3">
								Elegilo si tu proveedor escribe 2.500 para dos con medio.
							</small>
						</b-form-radio>
					</b-form-group>

					<!-- Vista previa reactiva: recalcula los mismos ejemplos de arriba segun la opcion elegida, sin pedir nada al backend -->
					<div
					v-for="columna_preview in preview_interpretacion_punto"
					:key="'numfmt-preview-' + columna_preview.campo"
					class="ai-import-numeric-interpretacion__preview m-t-10">

						<p class="text-muted small m-b-5">
							Vista previa — {{ columna_preview.nombre_columna_excel }}
						</p>

						<div class="ai-import-preview-table-wrapper">
							<table class="ai-import-preview-table">
								<thead>
									<tr>
										<th>Fila</th>
										<th>En el Excel</th>
										<th>Queda como</th>
									</tr>
								</thead>
								<tbody>
									<tr
									v-for="(ejemplo, idx) in columna_preview.ejemplos"
									:key="'numfmt-preview-ej-' + columna_preview.campo + '-' + idx">
										<td>{{ ejemplo.fila }}</td>
										<td>{{ ejemplo.original }}</td>
										<td>
											{{ ejemplo.resultado }}
											<small v-if="ejemplo.sin_cambios" class="text-muted d-block">
												(no se ve afectado por esta opción)
											</small>
										</td>
									</tr>
								</tbody>
							</table>
						</div>

					</div>

				</div>

			</div>

			<!-- Explicación del comportamiento con bar_codes repetidos -->
			<b-alert
			v-if="bar_codes_detail.length > 0 || (duplicate_stats && duplicate_stats.bar_codes_duplicados_intra_archivo > 0)"
			show
			variant="warning"
			class="m-b-15">
				<p class="font-weight-bold m-b-5 m-t-0 small">
					<i class="icon-alert-triangle m-r-5"></i>
					¿Qué va a pasar con los códigos de barras repetidos?
				</p>
				<p class="small m-b-0 m-t-0">
					Cuando el mismo código de barras aparece en más de una fila, o coincide con
					más de un artículo ya cargado, esas filas no se van a procesar: se van a
					reportar como problema al terminar la importación, con el número de fila,
					para que puedas corregir el Excel.
				</p>
				<p class="small m-b-0 m-t-5 text-muted">
					Antes se procesaba un único artículo y la última aparición sobreescribía a
					las anteriores, lo que podía mezclar datos de productos distintos.
				</p>
			</b-alert>

			<!-- Card de recomendación de Claude IA -->
			<div v-if="recomendacion_configuracion" class="ai-import-recomendacion-card m-b-20">

				<p class="font-weight-bold m-b-8">
					<i class="icon-cpu m-r-5"></i>Recomendación de Claude IA
				</p>

				<!-- Texto explicativo de la recomendación -->
				<p class="text-muted small m-b-10">{{ recomendacion_configuracion.explicacion }}</p>

			</div>

		<!-- Decisión nueva: politica_intra_archivo — repetidos del código de proveedor DENTRO del propio Excel (prompt 06, grupo 265) -->
		<b-form-group
		v-if="duplicate_stats && duplicate_stats.provider_codes_duplicados_intra_archivo > 0"
		label-class="ai-import-decision-title">
			<template #label>
				Este archivo tiene {{ numero_es(duplicate_stats.provider_codes_duplicados_intra_archivo) }}
				código{{ duplicate_stats.provider_codes_duplicados_intra_archivo > 1 ? 's' : '' }}
				de proveedor repetido{{ duplicate_stats.provider_codes_duplicados_intra_archivo > 1 ? 's' : '' }}.
				<small class="d-block text-muted font-weight-normal m-t-3">
					{{ resumen_intra_archivo_provider_code }}
				</small>
				<span class="d-block m-t-5">¿Qué representan esas filas repetidas?</span>
			</template>
			<b-form-radio v-model="politica_intra_archivo" value="ultima_gana" class="m-b-5">
				Es el mismo producto, cargado más de una vez
				<small class="d-block text-muted m-t-3">
					Se va a conservar la información de la <strong>última</strong> aparición de cada código. Al terminar te
					mostramos exactamente qué filas quedaron sobrescritas y por cuál.
				</small>
			</b-form-radio>
			<b-form-radio v-model="politica_intra_archivo" value="productos_distintos" class="m-b-5">
				Son productos distintos que comparten el código de proveedor
				<small class="d-block text-muted m-t-3">
					Se procesa cada fila por separado y se crea un artículo por cada una, aunque compartan el código.
				</small>
			</b-form-radio>
		</b-form-group>

		<!-- Decisión 2: política de colisión — visible cuando hay filas que se van a identificar
		por código de proveedor (grupo 284, prompt 04: antes dependía de "clave_identidad", que ya
		no existe como pregunta; la jerarquía es fija y este es el único escalón donde la decisión
		tiene efecto real). -->
		<b-form-group
		v-if="filas_identificadas_por_provider_code > 0"
		label="Si el código de proveedor coincide con artículos que ya existen en el sistema, ¿qué hacer?"
		label-class="ai-import-decision-title">
			<b-form-radio v-model="politica_colision" value="actualizar_todos" class="m-b-5">
				Actualizar todos los artículos que tengan ese código
				<small class="d-block text-muted m-t-3">
					<template v-if="duplicate_stats && duplicate_stats.provider_codes_existentes_mismo_proveedor === 0">
						Como es la primera importación, se creará un artículo por cada fila. En futuras importaciones, si el mismo código ya existe en el sistema, se actualizarán todos los artículos que lo tengan.
					</template>
					<template v-else>
						Cada fila del Excel actualizará todos los artículos del sistema que tengan ese mismo código de proveedor, sin importar cuántos sean.
					</template>
				</small>
			</b-form-radio>
			<b-form-radio v-model="politica_colision" value="saltear_y_reportar" class="m-b-5">
				Saltear esas filas y avisarme
				<small class="d-block text-muted m-t-3">
					Si un código coincide con más de un artículo, esa fila no se crea ni se actualiza: queda
					reportada al final para que la resuelvas a mano. No se toca nada de lo que el sistema no
					está seguro.
				</small>
			</b-form-radio>
			<b-form-radio v-model="politica_colision" value="crear_nuevo" class="m-b-5">
				No identificar por código de proveedor
				<small class="d-block text-muted m-t-3">
					Las filas que solo tienen código de proveedor van a crear artículos nuevos aunque el código
					ya exista. Usala solo si el código de proveedor de tu catálogo no es confiable.
				</small>
			</b-form-radio>
		</b-form-group>

		<!-- Decisión 3: política para códigos de proveedor existentes en otros proveedores -->
		<b-form-group
		v-if="duplicate_stats && duplicate_stats.provider_codes_existentes_otros_proveedores > 0"
		label="El código de proveedor ya existe en otros proveedores. ¿Qué hacer con esos artículos?"
		label-class="ai-import-decision-title">
			<b-form-radio v-model="politica_otro_proveedor" value="ignorar" class="m-b-5">
				Ignorar esos artículos y crear nuevos para este proveedor
				<small class="d-block text-muted m-t-3">
					El mismo código de proveedor puede pertenecer a distintos proveedores. Los artículos del otro proveedor no serán modificados. Se crearán artículos nuevos para el proveedor seleccionado en este paso, aunque compartan el código de proveedor con los existentes.
				</small>
			</b-form-radio>
			<b-form-radio v-model="politica_otro_proveedor" value="actualizar" class="m-b-5">
				Actualizar los artículos del otro proveedor con los datos de este Excel
				<small class="d-block text-muted m-t-3">
					Usá esta opción si los artículos fueron importados antes con el proveedor equivocado. Los artículos que tengan ese código de proveedor, sin importar a qué proveedor están asignados actualmente, serán actualizados con los datos de este Excel.
				</small>
			</b-form-radio>
		</b-form-group>

			<div class="j-end">
				<b-button
				variant="outline-secondary"
				class="m-r-10"
				@click="step = 2">
					Volver
				</b-button>
				<b-button
				variant="primary"
				:disabled="(filas_identificadas_por_provider_code > 0 && !politica_colision)
					|| (duplicate_stats && duplicate_stats.provider_codes_existentes_otros_proveedores > 0 && !politica_otro_proveedor)"
				@click="step = 4">
					Continuar
				</b-button>
			</div>

		</div>

		<!-- ========================================================== -->
		<!-- PASO 4: Opciones de importación                             -->
		<!-- ========================================================== -->
		<div v-if="step === 4">

			<p class="font-weight-bold m-b-15">Opciones de importación</p>

			<!-- Rango de filas (igual que el modal de importación clásico) -->
			<b-form-group
			label="Fila a partir de la cual empezar a importar">
				<b-form-input
				type="number"
				v-model="start_row"
				placeholder="Fila a partir de la cual empezar a importar">
				</b-form-input>
			</b-form-group>

			<b-form-group
			description="Dejar en blanco para importar hasta la última fila"
			label="Última fila hasta la cual importar">
				<b-form-input
				type="number"
				v-model="finish_row"
				placeholder="Última fila hasta la cual importar">
				</b-form-input>
			</b-form-group>

		<p
		v-if="excel_rows_to_import_count > 0"
		class="text-muted small m-b-15">
			Rango efectivo: filas {{ start_row }} a {{ finish_row }}
			<span v-if="model === 'article'">
				({{ numero_es(excel_rows_to_import_count) }} filas, aprox. {{ numero_es(estimated_chunks_count) }} chunks de 50 filas).
			</span>
			<span v-else>
				({{ numero_es(excel_rows_to_import_count) }} filas).
			</span>
		</p>

		<hr>

		<!-- Operación a realizar -->
		<b-form-group label="Operaciones a realizar">
			<b-form-radio
			class="radio-option m-b-5"
			:value="0"
			size="lg"
			v-model="create_and_edit">
				Solo editar {{ model_label_plural }} existentes
			</b-form-radio>
			<b-form-radio
			class="radio-option"
			:value="1"
			size="lg"
			v-model="create_and_edit">
				Cargar nuevos {{ model_label_plural }} y editar existentes
			</b-form-radio>
		</b-form-group>

			<!--
				Misión costo-bruto-por-condicion-fiscal (20/8/2026): mismo control que el import
				clásico. Solo para artículos: clientes y proveedores no tienen costo.

				Se pregunta y no se infiere con la IA a propósito. El análisis no puede distinguir
				un costo bruto de uno neto mirando la planilla (los dos son un número suelto), así
				que adivinarlo sería equivocarse en silencio en el 21% del costo de cada artículo.
			-->
			<b-form-group v-if="model === 'article'">
				<b-form-checkbox
				id="ai-import-precios_incluyen_iva"
				data-testid="ai-import-precios_incluyen_iva"
				v-model="precios_incluyen_iva"
				:value="1"
				:unchecked-value="0">
					Los costos de esta planilla son BRUTOS (ya tienen el IVA adentro)
				</b-form-checkbox>
				<small class="text-muted d-block m-t-5">
					El costo del artículo se guarda siempre NETO, sin IVA.
					<span v-if="costos_de_la_planilla_son_brutos">
						Como está activada, el costo de cada fila del Excel se toma como BRUTO: ya tiene el IVA adentro y el sistema se lo saca con la alícuota de ese artículo para guardar el neto. Un artículo Exento, No Gravado o al 0% no tiene IVA para sacarle: su costo se importa tal cual.
					</span>
					<span v-else>
						Como está desactivada, el costo de cada fila del Excel se toma como NETO y se importa tal cual, sin tocarlo. Es como venía funcionando la importación hasta ahora.
					</span>
				</small>
			</b-form-group>

			<!-- Error al importar -->
			<b-alert
			v-if="error_message"
			show
			variant="danger"
			class="m-t-10 m-b-15">
				{{ error_message }}
			</b-alert>

			<div class="j-end">
				<b-button
				variant="outline-secondary"
				class="m-r-10"
				@click="step = 3">
					Volver
				</b-button>
				<b-button
				variant="success"
				:disabled="loading || create_and_edit === null || !can_start_import"
				@click="importar">
					<b-spinner
					v-if="loading"
					small
					class="m-r-5">
					</b-spinner>
					{{ loading ? 'Iniciando importación...' : 'Importar' }}
				</b-button>
			</div>

		</div>

	</b-modal>
</template>

<script>
import * as XLSX from 'xlsx/xlsx.mjs'

export default {

	props: {
		/*
		 * Modelo de importación: 'article', 'client' o 'provider'.
		 * Controla las propiedades del sistema disponibles, las secciones
		 * condicionales y el id del modal.
		 */
		model: {
			type: String,
			default: 'article',
		},
	},

	/* Estado reactivo del modal. */
	data() {
		return {
			/* Paso actual del flujo (1, 2 o 3). */
			step: 1,

			/* Archivo Excel seleccionado por el usuario en el paso 1. */
			file: null,

			/* Lectura local del Excel para detectar última fila (como importación clásica). */
			file_processing: false,

			/* Primera fila de datos a importar; por defecto 2 (fila 1 = encabezados). */
			start_row: 2,

			/* Última fila con contenido detectada en el archivo. */
			finish_row: '',

			/* Copia de respaldo del finish_row detectado automáticamente. */
			finish_row_original: '',

			/* Error al leer filas localmente (no bloquea analizar; se reintenta al hacer clic). */
			excel_rows_read_error: '',

			/* Estado de carga para bloquear botones durante peticiones. */
			loading: false,

			/* Mensaje de error descriptivo para mostrar en la UI. */
			error_message: '',

			/* Ruta relativa del archivo guardado, devuelta por /analyze. */
			excel_path: null,

			/* Mapeo de columnas devuelto por Claude, modificable por el usuario. */
			column_mapping: [],

			/* ID del proveedor inferido por Claude (puede ser null). */
			selected_provider_id: null,

			/* Nivel de confianza del proveedor inferido: "alto", "medio" o "bajo". */
			provider_confidence: 'bajo',

			/* Opción de operación: 0=solo actualizar, 1=crear y actualizar. */
			create_and_edit: null,

			/*
			 * Misión costo-bruto-por-condicion-fiscal (20/8/2026): declaración de si los costos de
			 * ESTA planilla vienen brutos (con IVA adentro) o netos. Equivale al flag
			 * "precios_incluyen_iva" de la compra a proveedor. El check equivalente vivía además en
			 * el import clásico de artículos, que se sacó al pasar todas las importaciones a IA.
			 *
			 * Hace falta acá porque este flujo NO
			 * pasa por ArticleController@import: postea a /ai-excel-import/import, que arma su
			 * propio array para InitExcelImport. Toda clave que no se mande explícitamente acá
			 * llega al backend con el default, y el default es "neto".
			 *
			 * Arranca en 0 (= costos netos), que es como venía importando este flujo hasta hoy.
			 */
			precios_incluyen_iva: 0,

			/* Opciones avanzadas de importación, con los mismos defaults que el modal existente. */
			actualizar_articulos_de_otro_proveedor: 1,
			permitir_provider_code_repetido: 0,
			permitir_provider_code_repetido_en_multi_providers: 0,
			actualizar_por_provider_code: 0,
			actualizar_proveedor: 0,

			/* True si la fila 1 del Excel fue detectada como cabecera de columnas. */
			has_header_row: true,

			/* True si el usuario corrigió manualmente la detección automática de cabecera. */
			header_row_manually_overridden: false,

			/*
			 * Defecto 1 (hoja elegida): hojas del libro tal como las lee SheetJS acá en el
			 * navegador, con la forma { indice, nombre, filas }. Con UNA sola hoja no se
			 * dibuja nada nuevo y el flujo queda idéntico al de siempre; con dos o más
			 * aparece el selector y no se analiza nada hasta que el usuario elija.
			 */
			hojas: [],

			/*
			 * Índice 0-based de la hoja elegida. Con una sola hoja se autoselecciona en 0;
			 * con varias arranca en null a propósito, que es lo que mantiene deshabilitado
			 * el botón "Analizar con IA".
			 */
			hoja_seleccionada: null,

			/*
			 * Índice de la hoja cuya lectura ya está reflejada en finish_row / start_row.
			 * Existe para que el watcher de hoja_seleccionada no rehaga el trabajo que
			 * detect_last_excel_row_from_buffer() acaba de hacer (caso de una sola hoja),
			 * y así ese caso quede byte por byte como antes de esta misión.
			 */
			hoja_leida: null,

			/*
			 * Libro ya parseado por SheetJS, guardado para poder recalcular finish_row y
			 * volver a detectar el encabezado cuando el usuario cambia de hoja, sin tener
			 * que releer el archivo entero. Va congelado con Object.freeze porque Vue 2 no
			 * observa objetos no extensibles: hacerlo reactivo sería recorrer cada celda
			 * del Excel para nada.
			 */
			workbook_cache: null,

			/*
			 * Defecto 3 (encabezado corrido): fila 1-based donde está el encabezado, según
			 * la regla mecánica de detect_header_row(). null cuando la planilla no tiene
			 * encabezado.
			 */
			encabezado_fila: null,

			/* Motivo de la detección: 'primera_fila_con_contenido' | 'encabezado_corrido' | 'sin_candidata_clara'. */
			encabezado_motivo: null,

			/* Confianza de la detección: 'alta' | 'baja'. Con 'baja' el campo se muestra resaltado. */
			encabezado_confianza: 'alta',

			/*
			 * True cuando el usuario corrigió a mano la fila de encabezado. A partir de ahí
			 * la detección automática deja de pisarlo.
			 */
			encabezado_manualmente_corregido: false,

			/*
			 * Defecto 2 (celdas fusionadas): índices 0-based de las columnas que quedaron sin
			 * nombre en el encabezado, tal como los devuelve el backend. Se muestran como
			 * letras de Excel (A, B, C…), que es lo que el usuario ve en su planilla.
			 */
			columnas_sin_nombre: [],

			/*
			 * Defecto 2 (celdas fusionadas), la otra mitad: encabezados que cubren MÁS DE UNA
			 * columna. No es lo mismo que columnas_sin_nombre —acá la columna sí tiene nombre,
			 * lo que no se sabe es cuál de las dos es cuál—, así que se avisa aparte.
			 *
			 * Forma de cada elemento, tal cual la manda el backend (artículos, clientes y
			 * proveedores devuelven lo mismo):
			 *   { nombre, columnas: [0-based], letras: ['E','F'],
			 *     asignaciones: [{ system_property, excel_column_index, excel_column_letter }],
			 *     mensaje }
			 *
			 * `mensaje` viene armado del backend y se dibuja tal cual.
			 */
			columnas_ambiguas: [],

			/* Hoja que efectivamente usó el backend: { indice, nombre }. Se muestra en el paso 2. */
			hoja_elegida_del_backend: null,

			/* Encabezado que efectivamente usó el backend: { fila, origen, motivo, confianza, columnas }. */
			encabezado_del_backend: null,

			/* Estadísticas de duplicados devueltas por el análisis IA (preanálisis del Excel). */
			duplicate_stats: null,

			/*
			 * Prompt 03 (grupo 239 - alerta-formatos-numericos-import): estadisticas de
			 * numeros con punto ambiguos por columna, devueltas por /analyze y recalculadas
			 * por /get-recomendacion tras corregir el mapeo en el paso 2.
			 * Forma: { columnas: { <campo>: {...} }, hay_ambiguedad }. Null si el analisis
			 * fallo o no vino del backend.
			 */
			formatos_numericos: null,

			/*
			 * Prompt 05 (grupo 239 - alerta-formatos-numericos-import): como interpretar el
			 * punto en los numeros con formato ambiguo, elegido explicitamente por el usuario
			 * en el paso 3. Viaja en el POST de importacion junto al resto de la configuracion.
			 * 'auto' (default) preserva el comportamiento heuristico existente del backend.
			 */
			interpretacion_punto: 'auto',

			/* Índice 0-based de la columna provider_code, guardado tras el análisis para refresh-provider-stats. */
			provider_code_column_index: null,

			/* Recomendación de configuración generada por Claude: { politica_colision, politica_intra_archivo, explicacion }. */
			recomendacion_configuracion: null,

			/* True mientras se espera la recomendación de Claude al confirmar el paso 2. */
			loading_recomendacion: false,

			/*
			 * Política a aplicar cuando un código de proveedor coincide con varios artículos ya
			 * existentes en el sistema: 'actualizar_todos' | 'saltear_y_reportar' | 'crear_nuevo'
			 * (grupo 284, prompt 04: reemplaza a 'actualizar_uno', que hacía exactamente lo mismo
			 * que 'crear_nuevo' y nunca eligió "el más antiguo" pese a su nombre).
			 */
			politica_colision: null,

			/*
			 * Política para artículos de otros proveedores con el mismo provider_code:
			 * 'ignorar' → no tocar esos artículos, crear nuevos para este proveedor
			 * 'actualizar' → pisar los artículos del otro proveedor con los datos del Excel
			 */
			politica_otro_proveedor: null,

			/*
			 * Prompt 06 (grupo 265 - import-excel-jerarquia-ultima-fila-gana-y-reporte-sobrescritura):
			 * qué representan los códigos de proveedor repetidos DENTRO del propio Excel (no contra
			 * la base, eso lo cubren politica_colision/politica_otro_proveedor). 'ultima_gana' |
			 * 'productos_distintos'. Viaja siempre en el payload de importar(), con este mismo default.
			 */
			politica_intra_archivo: 'ultima_gana',

			/* Filas de muestra del Excel (máx. 5) para la preview del paso 2. */
			preview_rows: [],

			/* Notas globales de asistencia generadas por Claude durante el análisis. */
			assistant_notes: [],

			/*
			 * Prompt 06 (grupo 229 - matching-importacion-excel): valores placeholder
			 * detectados por columna identificadora (ej. "-", "S/N"), devueltos por el
			 * análisis del backend. Cada ítem: { campo, valor, repeticiones, filas }.
			 */
			placeholders: [],

			/*
			 * Cadena de identificación efectiva calculada por el backend con el mismo
			 * criterio que usa el importador real: { columnas_mapeadas: [...], escalones: [...] }.
			 */
			cadena_identificacion: null,

			/*
			 * Nombres repetidos detectados en el Excel: { cantidad_distintos, filas_afectadas }.
			 * Se usa para advertir sobre filas que podrían no procesarse en el escalón "name".
			 */
			nombres_duplicados: null,

			/*
			 * Grupo 299 (correctivo de cancelación de polling, segundo intento):
			 * token de la corrida de análisis/recomendación en curso. Se incrementa y
			 * se captura en una variable local ANTES de lanzar cada POST (analyze /
			 * get-recomendacion) — no dentro del helper de espera — porque la subida del
			 * archivo es la ventana más larga de todo el flujo (hasta 2 minutos) y la
			 * cancelación tiene que poder invalidarla también. Cualquier callback que no
			 * vea su token capturado === analysis_polling_token vigente aborta en
			 * silencio: es una corrida vieja, cancelada.
			 */
			analysis_polling_token: 0,

			/* Id del setTimeout del próximo ciclo de polling, para poder cancelarlo. */
			analysis_polling_timer_id: null,

			/*
			 * Id del setTimeout del aviso de "archivo grande" (20 s). Tiene que morir en
			 * todos los caminos de salida (éxito, error o cancelación): si sobrevive,
			 * ensucia auth/setMessage después de que el flujo que corresponda ya lo dejó
			 * en su valor final.
			 */
			analysis_warning_timer_id: null,

			/*
			 * uuid de la corrida de análisis vigente. Es lo que hace que la corrida
			 * exista fuera de este componente: con él se la vuelve a encontrar después
			 * de cerrar el modal, y viaja a /get-recomendacion para que el paso 3
			 * también se pueda reconstruir.
			 */
			analysis_uuid: null,

			/* Ídem para la corrida de recomendación (paso 2 → 3). */
			recomendacion_uuid: null,

			/* Paso y progreso que reporta el backend, para mostrarlos dentro del modal. */
			analysis_paso: '',
			analysis_progreso: 0,

			/*
			 * True cuando la corrida pasó los 20 segundos. Dispara el aviso de que el
			 * archivo es grande y de que se puede cerrar el modal mientras tanto.
			 */
			analysis_es_archivo_grande: false,
		}
	},

	computed: {

		/*
		 * ID único del modal según el modelo; mantiene compatibilidad con artículos
		 * y permite múltiples instancias del modal en la misma app sin colisión de ids.
		 */
		modal_id() {
			if (this.model === 'article') return 'ai-excel-import-modal'
			return 'ai-' + this.model + '-excel-import-modal'
		},

		/*
		 * Constantes de la detección de encabezado. Tienen que valer EXACTAMENTE lo mismo
		 * que las de ExcelHeaderDetector del backend (VENTANA y LARGO_MAXIMO_DE_CELDA);
		 * ver el comentario cruzado de detect_header_row().
		 */
		VENTANA_DE_ENCABEZADO() {
			return 20
		},

		LARGO_MAXIMO_DE_CELDA() {
			return 40
		},

		/*
		 * Piso del umbral de corte, espejo de
		 * ExcelHeaderDetector::MINIMO_DE_CELDAS_PARA_CORTAR.
		 */
		MINIMO_DE_CELDAS_PARA_CORTAR() {
			return 3
		},

		/*
		 * Fecha escrita en texto, formato ISO (AAAA-MM-DD). Es el MISMO preg_match que
		 * usa ExcelHeaderDetector::es_numerica_o_fecha() del backend, y es también el
		 * formato con el que valor_de_celda() deja las fechas reales del Excel, igual que
		 * hace el backend con $valor->format('Y-m-d').
		 *
		 * Antes acá había un prefijo interno ('__fecha__:') que sólo marcaba los Date que
		 * entregara SheetJS, y una fecha escrita como texto —que es la forma en que llega
		 * la enorme mayoría— no la reconocía nadie. El backend sí, y de ahí salía el
		 * defecto B6: la SPA elegía como encabezado la primera fila de DATOS.
		 */
		EXPRESION_FECHA_ISO() {
			return /^\d{4}-\d{2}-\d{2}$/
		},

		/*
		 * Réplica exacta de is_numeric() de PHP 7.4 sobre un string, que es lo que decide
		 * del lado del backend. La gramática de PHP es, textual:
		 *
		 *     espacios? [+-]? ( digitos ('.' digitos?)? | '.' digitos ) ( [eE] [+-]? digitos )?
		 *
		 * Y NO es lo mismo que Number(valor): Number() acepta los literales de JavaScript
		 * ('0x1A', '0b101', '0o17') que PHP rechaza desde la 7.0, y rechaza por infinito
		 * los exponentes desbordados ('1e400') que para PHP son numéricos igual. Las dos
		 * diferencias hacen que una misma celda corte la búsqueda del encabezado de un
		 * lado y no del otro.
		 */
		EXPRESION_NUMERICA_PHP() {
			return /^[ \t\n\r\v\f]*[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/
		},

		/*
		 * Opciones del selector de hoja: nombre y cantidad de filas de cada una, que es lo
		 * que le permite al usuario reconocer cuál es su lista de precios.
		 */
		opciones_de_hoja() {
			let opciones = []

			for (let i = 0; i < this.hojas.length; i++) {
				let hoja = this.hojas[i]

				opciones.push({
					value: hoja.indice,
					text:  hoja.nombre + ' (' + this.numero_es(hoja.filas) + ' filas)',
				})
			}

			return opciones
		},

		/*
		 * True cuando el libro tiene más de una hoja: es la única condición que dibuja
		 * algo nuevo en pantalla. Con una sola hoja el modal queda idéntico al de antes.
		 */
		hay_varias_hojas() {
			return this.hojas.length > 1
		},

		/*
		 * True mientras el libro tenga varias hojas y el usuario no haya elegido ninguna.
		 * Es lo que mantiene deshabilitado el botón "Analizar con IA": no se analiza —ni
		 * se importa— nada hasta que se elige.
		 */
		falta_elegir_hoja() {
			return this.hay_varias_hojas && this.hoja_seleccionada === null
		},

		/*
		 * Letras de Excel (A, B, C…) de las columnas que quedaron sin nombre en el
		 * encabezado. El backend manda índices 0-based, pero el usuario ve letras.
		 */
		letras_de_columnas_sin_nombre() {
			let letras = []

			for (let i = 0; i < this.columnas_sin_nombre.length; i++) {
				letras.push(this.number_to_excel_column(Number(this.columnas_sin_nombre[i]) + 1))
			}

			return letras
		},

		/*
		 * Letras de Excel de las columnas que se llevaron una propiedad dentro de un
		 * encabezado ambiguo. Es lo que usa la tabla de mapeo para marcarlas.
		 *
		 * Se junta por LETRA y no por índice porque la tabla también resuelve la letra
		 * (excel_column_letter_label) y así las dos puntas comparan lo mismo, tenga o no
		 * el item su excel_column_index.
		 */
		letras_de_columnas_ambiguas() {
			let letras = []

			for (let i = 0; i < this.columnas_ambiguas.length; i++) {
				let asignaciones = this.columnas_ambiguas[i].asignaciones

				if (!Array.isArray(asignaciones)) {
					continue
				}

				for (let j = 0; j < asignaciones.length; j++) {
					let letra = asignaciones[j].excel_column_letter

					if (letra && letras.indexOf(letra) === -1) {
						letras.push(letra)
					}
				}
			}

			return letras
		},

		/*
		 * Renglón fijo del paso 2: de qué hoja y con qué fila de encabezado se armó el
		 * mapeo que el usuario está por confirmar. Vacío si el backend no lo informó.
		 */
		resumen_de_hoja_y_encabezado() {
			if (!this.hoja_elegida_del_backend && !this.encabezado_del_backend) {
				return ''
			}

			let partes = []

			if (this.hoja_elegida_del_backend && this.hoja_elegida_del_backend.nombre) {
				partes.push('Hoja: «' + this.hoja_elegida_del_backend.nombre + '»')
			}

			if (this.encabezado_del_backend && this.encabezado_del_backend.fila) {
				partes.push('encabezado en la fila ' + this.encabezado_del_backend.fila)
			}

			return partes.join(' — ')
		},

		/*
		 * Estado del control "Los costos de esta planilla son BRUTOS", normalizado a booleano.
		 * Solo se usa para elegir cuál de los dos textos de ayuda mostrar.
		 */
		costos_de_la_planilla_son_brutos() {
			return Number(this.precios_incluyen_iva) === 1
		},

		/*
		 * Etiqueta en plural del modelo para los textos de la UI.
		 */
		model_label_plural() {
			const labels = {
				article:  'artículos',
				client:   'clientes',
				provider: 'proveedores',
			}
			return labels[this.model] || this.model
		},

		/*
		 * Título dinámico del modal según el paso actual y el modelo de importación.
		 */
		modal_title() {
			const model_labels = {
				article:  'Artículos',
				client:   'Clientes',
				provider: 'Proveedores',
			}
			const model_label = model_labels[this.model] || this.model

			const titles = {
				1: 'Importar ' + model_label + ' con IA — Subir archivo',
				2: 'Importar ' + model_label + ' con IA — Confirmar mapeo',
				3: 'Importar ' + model_label + ' con IA — Recomendación',
				4: 'Importar ' + model_label + ' con IA — Opciones de importación',
			}
			return titles[this.step] || ('Importar ' + model_label + ' con IA')
		},

		/*
		 * Proveedores disponibles del usuario, cargados desde el store.
		 * Se transforman en opciones para b-form-select.
		 */
		providers() {
			// Catalogo completo (options), no el store paginado (models) que ya no se descarga
			// entero al iniciar sesion (grupo 332/342, 4/8/2026). Se pide en created().
			return this.$store.state.provider.options
		},

		/*
		 * Depósitos del usuario, usados para generar dinámicamente las opciones
		 * de stock por depósito en el dropdown de mapeo.
		 */
		addresses() {
			return this.$store.state.address.models
		},

		/*
		 * Listas de precio del usuario, usadas para generar dinámicamente las
		 * opciones de precio por lista en el dropdown de mapeo.
		 */
		price_types() {
			return this.$store.state.price_type.models
		},

		provider_options() {
			/* Opción vacía como primera opción del select. */
			let options = [{ value: null, text: 'Sin proveedor' }]

			/* Deduplicar por id antes de mapear, por si el store acumuló cargas múltiples. */
			const seen_ids = new Set()
			this.providers.forEach(provider => {
				if (!seen_ids.has(provider.id)) {
					seen_ids.add(provider.id)
					options.push({ value: provider.id, text: provider.name })
				}
			})

			return options
		},

		/*
		 * Descripción textual del nivel de confianza del proveedor inferido.
		 * Se muestra como descripción del b-form-group en el paso 2.
		 */
		provider_confidence_label() {
			const labels = {
				alto: 'Alta confianza — el proveedor fue inferido con seguridad',
				medio: 'Confianza media — verificá que el proveedor sea correcto',
				bajo: 'Confianza baja — no se pudo determinar con seguridad',
			}
			return labels[this.provider_confidence] || ''
		},

		/*
		 * True si en el paso 2 se eligió un proveedor para todo el archivo (no "Sin proveedor").
		 */
		has_selected_provider() {
			if (this.selected_provider_id === null || this.selected_provider_id === '') {
				return false
			}

			return Number(this.selected_provider_id) > 0
		},

		/*
		 * True si alguna columna del mapeo fue asignada a 'proveedor'.
		 * En ese caso el proveedor de cada artículo se toma de la columna del Excel,
		 * no del selector global.
		 */
		has_provider_column() {
			return this.column_mapping.some(item => item.system_property === 'proveedor')
		},

		/*
		 * Cantidad de filas que se importarán según start_row y finish_row.
		 */
		excel_rows_to_import_count() {
			let finish = Number(this.finish_row)
			let start = Number(this.start_row)

			if (!finish || !start || finish < start) {
				return 0
			}

			return finish - start + 1
		},

		/*
		 * Estimación de chunks según ARTICLE_EXCEL_CHUNK_SIZE del backend (referencia UX).
		 */
		estimated_chunks_count() {
			let rows = this.excel_rows_to_import_count
			if (rows <= 0) {
				return 0
			}

			let chunk_size = 50
			return Math.ceil(rows / chunk_size)
		},

		/*
		 * Permite importar solo si hay rango de filas válido y el archivo ya fue leído.
		 */
		can_start_import() {
			if (this.file_processing) {
				return false
			}

			let finish = Number(this.finish_row)
			let start = Number(this.start_row)

			return finish > 0 && start > 0 && finish >= start
		},

		/*
		 * Textos únicos de interpretation_note para el alert resumen del paso 2.
		 */
		column_mapping_interpretation_alerts() {
			let alerts = []
			let seen = {}

			this.column_mapping.forEach(item => {
				if (!this.column_has_interpretation_note(item)) {
					return
				}

				let note = (item.interpretation_note || '').trim()
				if (note === '' || seen[note]) {
					return
				}

				seen[note] = true
				alerts.push(note)
			})

			return alerts
		},

		/*
		 * Detalle enriquecido de códigos de proveedor repetidos (del preanálisis).
		 * Cada elemento: { codigo, veces, filas }.
		 * Vacío si no hay datos o si la columna no estaba mapeada.
		 */
		provider_codes_detail() {
			if (
				!this.duplicate_stats
				|| !Array.isArray(this.duplicate_stats.detalle_provider_codes_duplicados)
			) {
				return []
			}

			return this.duplicate_stats.detalle_provider_codes_duplicados
		},

		/*
		 * Detalle enriquecido de códigos de barras repetidos (del preanálisis).
		 * Cada elemento: { codigo, veces, filas }.
		 * Vacío si no hay datos o si la columna no estaba mapeada.
		 */
		bar_codes_detail() {
			if (
				!this.duplicate_stats
				|| !Array.isArray(this.duplicate_stats.detalle_bar_codes_duplicados)
			) {
				return []
			}

			return this.duplicate_stats.detalle_bar_codes_duplicados
		},

		/*
		 * Prompt 03 (grupo 239 - alerta-formatos-numericos-import): columnas con números
		 * con punto ambiguos, listas para renderizar en el paso 3, ordenadas por nivel de
		 * riesgo (primero "alto", después "medio", después "bajo"). Es lo que itera el
		 * template: nunca se recorre el objeto `formatos_numericos.columnas` directo en un
		 * v-for, porque no tiene un orden garantizado.
		 * Devuelve [] si no hay análisis de formatos numéricos (null).
		 */
		columnas_con_ambiguedad_numerica() {
			if (!this.formatos_numericos || !this.formatos_numericos.columnas) {
				return []
			}

			/* Orden de prioridad visual de los niveles de riesgo. */
			let orden_riesgo = { alto: 0, medio: 1, bajo: 2 }

			/* Volcamos el objeto de columnas a un array para poder ordenarlo. */
			let columnas = []
			let mapa_columnas = this.formatos_numericos.columnas
			Object.keys(mapa_columnas).forEach(function(campo) {
				columnas.push(mapa_columnas[campo])
			})

			columnas.sort(function(a, b) {
				let orden_a = orden_riesgo[a.nivel_de_riesgo] !== undefined ? orden_riesgo[a.nivel_de_riesgo] : 3
				let orden_b = orden_riesgo[b.nivel_de_riesgo] !== undefined ? orden_riesgo[b.nivel_de_riesgo] : 3
				return orden_a - orden_b
			})

			return columnas
		},

		/*
		 * Prompt 05 (grupo 239 - alerta-formatos-numericos-import): true si el selector de
		 * interpretacion_punto debe mostrarse en el paso 3. Solo tiene sentido ofrecerlo cuando
		 * hay alguna columna de riesgo "alto" o "medio": si todo el archivo es riesgo "bajo",
		 * la heuristica automatica ya acierta y mostrar el selector es invitar a que el usuario
		 * rompa algo que ya funciona.
		 */
		mostrar_selector_interpretacion_punto() {
			return this.columnas_con_ambiguedad_numerica.some(function(columna) {
				return columna.nivel_de_riesgo === 'alto' || columna.nivel_de_riesgo === 'medio'
			})
		},

		/*
		 * Prompt 05 (grupo 239 - alerta-formatos-numericos-import): vista previa reactiva de los
		 * mismos ejemplos que ya muestra la tabla de arriba, recalculados en el cliente segun la
		 * opcion elegida en interpretacion_punto. No pide nada al backend: el usuario ve el efecto
		 * de cada opcion al instante. Cada ejemplo con coma y punto juntos (ej. "1.234,56") no se
		 * ve afectado por ninguna opcion; se marca con `sin_cambios` para aclararlo en el template.
		 */
		preview_interpretacion_punto() {
			let self = this

			/* Array de columnas con sus ejemplos recalculados, en el mismo orden que la tabla de arriba. */
			let columnas_preview = []

			this.columnas_con_ambiguedad_numerica.forEach(function(columna) {
				let ejemplos_recalculados = []

				columna.ejemplos.forEach(function(ejemplo) {
					ejemplos_recalculados.push({
						fila:        ejemplo.fila,
						original:    ejemplo.original,
						resultado:   self.recalcular_resultado_interpretacion_punto(ejemplo.original),
						sin_cambios: self.valor_tiene_coma_y_punto(ejemplo.original),
					})
				})

				columnas_preview.push({
					campo:                 columna.campo,
					nombre_columna_excel:  columna.nombre_columna_excel,
					ejemplos:              ejemplos_recalculados,
				})
			})

			return columnas_preview
		},

		/*
		 * Prompt 06 (grupo 229 - matching-importacion-excel): pasos de la cadena de
		 * identificación efectiva, listos para renderizar en el paso 3.
		 * Solo incluye los escalones cuya columna está mapeada en este Excel
		 * (columnas_mapeadas), en el mismo orden de prioridad que usa el matching real:
		 * id -> bar_code -> sku -> provider_code -> name. Nunca incluye "sin_identificador",
		 * que se muestra aparte como advertencia (ver filas_sin_identificador).
		 */
		pasos_cadena_identificacion() {
			if (!this.cadena_identificacion) {
				return []
			}

			/* Etiqueta legible por campo de la cadena. */
			let etiquetas = {
				id:            'Número de artículo',
				bar_code:      'Código de barras',
				sku:           'SKU',
				provider_code: 'Código de proveedor',
				name:          'Nombre exacto',
			}

			/* Descripción fija de cada escalón (no depende de los datos del archivo). */
			let descripciones = {
				id:            'El artículo ya existe en el sistema con este número. Es la clave más confiable.',
				bar_code:      'Es la columna más confiable. Se usa primero siempre que la fila la tenga.',
				sku:           'Se usa cuando la fila no tiene código de barras.',
				provider_code: 'Se usa cuando la fila no tiene código de barras ni SKU.',
				name:          'Último recurso, cuando la fila no tiene ningún código. Si el nombre coincide con más de un artículo, la fila no se procesa.',
			}

			let columnas_mapeadas = this.cadena_identificacion.columnas_mapeadas || []
			let escalones         = this.cadena_identificacion.escalones || []

			let pasos = []

			escalones.forEach(function(escalon) {
				/* "sin_identificador" no es un paso de la cadena: se muestra aparte como advertencia. */
				if (escalon.campo === 'sin_identificador') {
					return
				}

				/* Solo mostramos escalones cuya columna está efectivamente mapeada en el Excel. */
				if (columnas_mapeadas.indexOf(escalon.campo) === -1) {
					return
				}

				pasos.push({
					campo:       escalon.campo,
					label:       etiquetas[escalon.campo] || escalon.campo,
					filas:       escalon.filas,
					descripcion: descripciones[escalon.campo] || '',
				})
			})

			return pasos
		},

		/*
		 * Cantidad de filas del Excel que no tienen ningún identificador utilizable
		 * (ni número, ni código de barras, ni SKU, ni código de proveedor, ni nombre).
		 * Esas filas se crean siempre como artículos nuevos, sin posibilidad de
		 * actualizarse en futuras importaciones.
		 */
		filas_sin_identificador() {
			if (!this.cadena_identificacion || !Array.isArray(this.cadena_identificacion.escalones)) {
				return 0
			}

			let encontrado = 0
			this.cadena_identificacion.escalones.forEach(function(escalon) {
				if (escalon.campo === 'sin_identificador') {
					encontrado = escalon.filas
				}
			})

			return encontrado
		},

		/*
		 * Grupo 284, prompt 04: cantidad de filas del Excel que se van a identificar por
		 * código de proveedor (escalón 'provider_code' de la cadena de identificación). Es el
		 * único escalón donde politica_colision tiene efecto real, así que controla si el
		 * bloque de esa decisión se muestra en el paso 3 — reemplaza al viejo
		 * "clave_identidad === 'provider_code'", que ya no existe.
		 */
		filas_identificadas_por_provider_code() {
			if (!this.cadena_identificacion || !Array.isArray(this.cadena_identificacion.escalones)) {
				return 0
			}

			let encontrado = 0
			this.cadena_identificacion.escalones.forEach(function(escalon) {
				if (escalon.campo === 'provider_code') {
					encontrado = escalon.filas
				}
			})

			return encontrado
		},

		/*
		 * Texto legible de la configuración vigente para el escalón de código de proveedor,
		 * derivado de las mismas decisiones (politica_colision / politica_otro_proveedor) que
		 * derive_flags_from_choice() traduce a los flags reales que recibe el backend.
		 * Se recalcula reactivamente: si el usuario cambia su elección en el paso 3,
		 * este texto cambia con ella (a diferencia de un valor fijo calculado en el análisis inicial).
		 */
		texto_configuracion_provider_code() {
			let flags = this.derive_flags_from_choice()

			if (!flags.actualizar_por_provider_code) {
				return 'No se va a identificar por código de proveedor. Estas filas se van a crear como artículos nuevos.'
			}

			let texto = ''

			if (!flags.permitir_provider_code_repetido) {
				texto = 'Si un código de proveedor coincide con más de un artículo, la fila se va a saltear y quedar reportada como problema.'
			} else {
				texto = 'Se van a actualizar todos los artículos que compartan el código de proveedor.'
				if (flags.permitir_provider_code_repetido_en_multi_providers) {
					texto += ' Incluyendo artículos de otros proveedores.'
				}
			}

			if (flags.actualizar_articulos_de_otro_proveedor) {
				texto += ' Se pueden actualizar artículos asignados a otro proveedor.'
			}

			return texto
		},

		/*
		 * Prompt 06 (grupo 265): resumen en lenguaje natural, con los códigos y filas REALES
		 * del archivo, de los códigos de proveedor repetidos dentro del propio Excel. Hasta 3
		 * ejemplos y, si hay más, "y N más…" — mismo patrón que la tabla de duplicados de más
		 * arriba en este paso. Vacío si no hay datos.
		 */
		resumen_intra_archivo_provider_code() {
			let detalle = this.provider_codes_detail

			if (detalle.length === 0) {
				return ''
			}

			let ejemplos = detalle.slice(0, 3).map(function(item) {
				let plural = item.filas.length > 1
				return item.codigo + ' aparece en ' + (plural ? 'las filas ' : 'la fila ') + item.filas.join(', ')
			})

			let texto = ejemplos.join(' · ')

			if (detalle.length > 3) {
				texto += ' · y ' + (detalle.length - 3) + ' más…'
			}

			return texto
		},

		/*
		 * Aviso de nombres repetidos en el Excel, para mostrar junto al escalón "name".
		 * Vacío si no hay nombres repetidos (o si no se calculó aún).
		 */
		aviso_nombres_duplicados() {
			if (!this.nombres_duplicados || !this.nombres_duplicados.cantidad_distintos) {
				return ''
			}

			return 'El archivo tiene ' + this.numero_es(this.nombres_duplicados.cantidad_distintos) + ' nombres repetidos en '
				+ this.numero_es(this.nombres_duplicados.filas_afectadas) + ' filas. Si alguna de esas filas llega al escalón '
				+ 'de nombre, no se va a procesar y se va a reportar como problema.'
		},

		/*
		 * Opciones para el select de propiedades del sistema en la tabla de mapeo.
		 * Varía según el modelo (article, client, provider).
		 * El valor null corresponde a "Ignorar columna".
		 */
		system_property_options() {
			/* Opción vacía común a todos los modelos. */
			const ignore_option = { value: null, text: 'Ignorar columna' }

			if (this.model === 'client') {
				return [
					ignore_option,
					{ value: 'nombre',                   text: 'Nombre' },
					{ value: 'telefono',                 text: 'Teléfono' },
					{ value: 'email',                    text: 'Email' },
					{ value: 'direccion',                text: 'Dirección' },
					{ value: 'localidad',                text: 'Localidad' },
					{ value: 'provincia',                text: 'Provincia' },
					{ value: 'cuit',                     text: 'CUIT' },
					{ value: 'cuil',                     text: 'CUIL' },
					{ value: 'dni',                      text: 'DNI' },
					{ value: 'razon_social',             text: 'Razón social' },
					{ value: 'numero',                   text: 'Número de cliente' },
					{ value: 'vendedor',                 text: 'Vendedor' },
					{ value: 'sucursal',                 text: 'Sucursal' },
					{ value: 'condicion_frente_al_iva',  text: 'Condición frente al IVA' },
					{ value: 'tipo_de_precio',           text: 'Tipo de precio' },
					{ value: 'saldo_actual',             text: 'Saldo actual' },
					{ value: 'descripcion',              text: 'Descripción' },
				]
			}

			if (this.model === 'provider') {
				return [
					ignore_option,
					{ value: 'nombre',                   text: 'Nombre' },
					{ value: 'telefono',                 text: 'Teléfono' },
					{ value: 'email',                    text: 'Email' },
					{ value: 'direccion',                text: 'Dirección' },
					{ value: 'localidad',                text: 'Localidad' },
					{ value: 'cuit',                     text: 'CUIT' },
					{ value: 'razon_social',             text: 'Razón social' },
					{ value: 'numero',                   text: 'Número de proveedor' },
					{ value: 'condicion_frente_al_iva',  text: 'Condición frente al IVA' },
					{ value: 'observaciones',            text: 'Observaciones' },
					/*
					 * 🔴 Saldo actual de la cuenta corriente del proveedor. Existía sólo en el
					 * import clásico de proveedores; al sacarlo, quien migra proveedores con su
					 * saldo se quedaba sin forma de traerlo.
					 *
					 * La clave es 'saldo_actual' y NO es arbitraria: build_columns() la manda tal
					 * cual dentro de `columns`, y del otro lado ProviderImport::saveModel() cierra
					 * llamando a LocalImportHelper::setSaldoInicial(), que lee
					 * getColumnValueByAliases($row, ['saldo_actual', 'saldo actual'], $columns).
					 * Es la misma clave con la que ya viaja el saldo de los clientes.
					 *
					 * ⚠️ El analizador de proveedores del backend (AiProviderAnalyzer,
					 * SYSTEM_PROPERTIES) todavía no la conoce, así que la IA no la va a sugerir
					 * sola: el usuario la elige a mano en la tabla de mapeo. Es exactamente lo que
					 * pedía el import clásico, donde la columna también se mapeaba a mano.
					 */
					{ value: 'saldo_actual',             text: 'Saldo actual' },
				]
			}

			/* Opciones para artículos (model === 'article' o default). */
			let options = [
				ignore_option,
				{ value: 'numero',                text: 'Número (ID del sistema)' },
				{ value: 'nombre',                text: 'Nombre' },
				{ value: 'codigo_de_barras',      text: 'Código de barras' },
				{ value: 'sku',                   text: 'SKU' },
				{ value: 'codigo_de_proveedor',   text: 'Código de proveedor' },
				{ value: 'costo',                 text: 'Costo' },
				{ value: 'precio',                text: 'Precio' },
				{ value: 'iva',                   text: 'IVA' },
				{ value: 'margen_de_ganancia',    text: 'Margen de ganancia' },
				{ value: 'categoria',             text: 'Categoría' },
				{ value: 'sub_categoria',         text: 'Sub categoría' },
				{ value: 'marca',                 text: 'Marca' },
				{ value: 'descripcion',           text: 'Descripción' },
				{ value: 'stock_actual',          text: 'Stock actual' },
				{ value: 'descuentos',            text: 'Descuentos' },
				{ value: 'recargos',              text: 'Recargos' },
				{ value: 'proveedor',             text: 'Proveedor' },
				/* Precio */
				{ value: 'costo_en_dolares',    text: 'Costo en dólares (Si/No)' },
				{ value: 'aplicar_iva',         text: 'Aplicar IVA (Si/No)' },
				/* Stock y medidas */
				{ value: 'medida',              text: 'Medida / Contenido (número)' },
				{ value: 'contenido',           text: 'Contenido (texto)' },
				{ value: 'unidad_medida',       text: 'Unidad de medida' },
				{ value: 'u_individuales',      text: 'Unidades individuales' },
				/* Descuentos y recargos */
				{ value: 'descuentos_montos',   text: 'Descuentos (montos $)' },
				{ value: 'recargos_montos',     text: 'Recargos (montos $)' },
				/* Estado y visibilidad */
				{ value: 'in_offer',            text: 'En oferta (Si/No)' },
				{ value: 'online',              text: 'Activo / Visible (Si/No)' },
				{ value: 'precio_pausado',      text: 'Precio pausado (Si/No)' },
				{ value: 'disponible_tienda_nube', text: 'Disponible en Tienda Nube (Si/No)' },
			]

			/*
			 * Grupo dinámico de depósitos: una opción de stock/min/max por cada depósito del usuario.
			 * El separador __group__ es una opción deshabilitada que actúa como encabezado visual.
			 */
			if (this.addresses.length > 0) {
				options.push({ value: '__group__', text: '— Stock por depósito —', disabled: true })
				this.addresses.forEach(address => {
					const id = address.id
					const name = address.street
					options.push({ value: `address_${id}_amount`, text: `Stock: ${name}` })
					options.push({ value: `address_${id}_min`,    text: `Stock mínimo: ${name}` })
					options.push({ value: `address_${id}_max`,    text: `Stock máximo: ${name}` })
				})
			}

			/*
			 * Grupo dinámico de listas de precio: solo disponible si el usuario tiene listas
			 * cargadas y la extensión de margen por lista activa.
			 */
			if (this.price_types.length > 0 && this.hasExtencion('articulo_margen_de_ganancia_segun_lista_de_precios')) {
				options.push({ value: '__group__', text: '— Listas de precio —', disabled: true })
				this.price_types.forEach(pt => {
					const id = pt.id
					const name = pt.name
					options.push({ value: `price_type_${id}_final_price`, text: `$ Final: ${name}` })
					options.push({ value: `price_type_${id}_percentage`,  text: `%: ${name}` })
					options.push({ value: `price_type_${id}_setear`,      text: `Setear precio final: ${name}` })
				})
			}

			return options
		},

		/*
		 * Columnas visibles en la preview del paso 2.
		 * Excluye las columnas marcadas como "Ignorar columna" (system_property === null).
		 * Cada elemento: { label: string, excel_column_index: number }
		 */
		preview_columns() {
			if (!this.column_mapping || this.column_mapping.length === 0) return []

			return this.column_mapping
				.filter(item => item.system_property !== null && item.system_property !== '')
				.map(item => ({
					label: this.get_property_label(item.system_property),
					excel_column_index: item.excel_column_index,
				}))
		},

	},

	watch: {

		/*
		 * Orden de apertura dejada por el aviso de "terminó el análisis". Cubre el
		 * caso en que el usuario nunca se fue del módulo y este componente ya estaba
		 * montado cuando llegó el aviso; el caso contrario (viene de otra pantalla)
		 * lo cubre created().
		 */
		'$store.state.excel_analysis.abrir_en'() {
			this.consumir_orden_de_apertura()
		},

		/*
		 * Al elegir archivo (v-model de b-form-file), detectamos última fila como en import clásico.
		 */
		file(new_file) {
			if (new_file) {
				this.onFileChange(new_file)
			} else {
				this.finish_row = ''
				this.finish_row_original = ''
			}
		},

		/*
		 * 🔴 T5 — la interacción más fácil de olvidar y la que más caro sale.
		 *
		 * El backend arma el CSV de la importación 1:1 con las filas de la hoja elegida y
		 * después navega por número de línea. Si la SPA calculó finish_row mirando la hoja 0
		 * y manda hoja=1, se importan filas que no existen o se corta de más, EN SILENCIO
		 * (ajustar_finish_row_segun_excel_real() del backend protege por arriba, pero no
		 * cubre un finish_row que quedó demasiado chico).
		 *
		 * Por eso al cambiar de hoja hay que recalcular finish_row, finish_row_original y
		 * volver a correr la detección de encabezado SOBRE LA HOJA NUEVA.
		 *
		 * @param {Number|null} nuevo_indice - Índice 0-based de la hoja elegida
		 */
		hoja_seleccionada(nuevo_indice) {
			/* Todavía no eligió, o la hoja que ya está leída: no hay nada que rehacer. */
			if (nuevo_indice === null || nuevo_indice === undefined || nuevo_indice === this.hoja_leida) {
				return
			}

			/*
			 * Sin el libro en memoria no se puede recalcular nada. Pasa al rehidratar el
			 * modal después de un F5: ahí la hoja y el rango vienen del backend, que es la
			 * fuente correcta, y pisarlos con un cálculo imposible sería peor.
			 */
			if (!this.workbook_cache) {
				return
			}

			/*
			 * La hoja nueva es otro archivo a todos los efectos: la detección automática
			 * vuelve a valer, porque las correcciones que el usuario hizo eran sobre la
			 * hoja anterior.
			 */
			this.header_row_manually_overridden   = false
			this.encabezado_manualmente_corregido = false
			this.excel_rows_read_error            = ''

			try {
				let ultima_fila_con_contenido = this.leer_hoja_y_detectar(Number(nuevo_indice))

				this.finish_row          = ultima_fila_con_contenido
				this.finish_row_original = ultima_fila_con_contenido
			} catch (err) {
				console.error('Error al leer la hoja elegida del Excel:', err)
				this.finish_row            = ''
				this.finish_row_original   = ''
				this.excel_rows_read_error = 'No se pudo leer esa hoja para detectar filas. Probá con otra hoja.'
			}
		},

		/*
		 * Cuando se desactiva permitir_provider_code_repetido, limpiamos
		 * la opción dependiente para mantener consistencia.
		 */
		permitir_provider_code_repetido() {
			if (!this.permitir_provider_code_repetido) {
				this.permitir_provider_code_repetido_en_multi_providers = 0
			}
		},

		/*
		 * Cuando se desactiva actualizar_articulos_de_otro_proveedor,
		 * limpiamos actualizar_proveedor para evitar estado inconsistente.
		 */
		actualizar_articulos_de_otro_proveedor() {
			if (!this.actualizar_articulos_de_otro_proveedor) {
				this.actualizar_proveedor = 0
			}
		},

		/*
		 * Sin proveedor del archivo, las opciones de "otro proveedor" no aplican y se desactivan.
		 */
		selected_provider_id(new_val) {
			if (!this.has_selected_provider) {
				this.actualizar_articulos_de_otro_proveedor = 0
				this.actualizar_proveedor = 0
			}
			/* Recalcular stats de existentes en BD con el proveedor real seleccionado en paso 2. */
			if (this.excel_path && this.provider_code_column_index !== null) {
				this.refresh_provider_stats()
			}
		},

		/*
		 * Al cambiar el toggle de cabecera manualmente, ajustar start_row de forma relativa.
		 * Si la detección es automática, detect_header_row ya asignó start_row correctamente.
		 *
		 * @param {Boolean} val - Nuevo valor de has_header_row
		 */
		has_header_row(val) {
			/* Solo ajustar start_row si el usuario cambió el toggle manualmente. */
			if (this.header_row_manually_overridden) {
				this.start_row = val
					? Number(this.start_row) + 1
					: Math.max(1, Number(this.start_row) - 1)
			}
		},

		/*
		 * Prompt 05 (grupo 239 - alerta-formatos-numericos-import): si el usuario cambia el
		 * mapeo de columnas en el paso 2 (o el análisis inicial lo carga), reseteamos
		 * interpretacion_punto a 'auto'. La elección anterior se hizo mirando otras columnas,
		 * así que arrastrarla en silencio a un mapeo distinto es peor que perderla.
		 */
		column_mapping: {
			deep: true,
			handler() {
				this.interpretacion_punto = 'auto'
			},
		},
	},

	methods: {

		/*
		 * Procesa el archivo elegido (File o evento nativo del input), igual que import/Index.vue.
		 */
		onFileChange(file_or_event) {
			let selected_file = this.resolve_selected_excel_file(file_or_event)

			if (!selected_file) {
				this.finish_row = ''
				this.finish_row_original = ''
				this.excel_rows_read_error = ''
				return
			}

			this.process_excel_file(selected_file)
		},

		/*
		 * Obtiene el File desde el evento de b-form-file, v-model o input nativo.
		 */
		resolve_selected_excel_file(file_or_event) {
			if (file_or_event && file_or_event.target && file_or_event.target.files && file_or_event.target.files.length > 0) {
				return file_or_event.target.files[0]
			}

			if (file_or_event && file_or_event.name) {
				return file_or_event
			}

			if (this.file && this.file.name) {
				return this.file
			}

			return null
		},

		/*
		 * Lee el Excel en el navegador y calcula finish_row (retorna promesa).
		 * Resetea header_row_manually_overridden para que la detección automática
		 * vuelva a correr con el nuevo archivo.
		 */
		process_excel_file(file) {
			let self = this

			self.file_processing = true
			self.finish_row = ''
			self.finish_row_original = ''
			self.excel_rows_read_error = ''

			/* Al cambiar el archivo, se vuelve a detectar la cabecera automáticamente. */
			self.header_row_manually_overridden   = false
			self.encabezado_manualmente_corregido = false

			/*
			 * 🔴 B7: TODO lo que describe al archivo anterior se limpia ACÁ, antes de leer,
			 * y no dentro de armar_hojas_del_libro() — que corre después de XLSX.read() y
			 * por lo tanto no corre nunca si XLSX.read() tira.
			 *
			 * El caso medido: el usuario sube el libro A (3 hojas), elige "Notas", y después
			 * sube un libro B que SheetJS no puede parsear (xlsx con contraseña, archivo
			 * cortado). Sin esta limpieza el selector seguía mostrando las hojas del libro A,
			 * falta_elegir_hoja quedaba en false, el botón "Analizar con IA" habilitado, y se
			 * mandaba hoja=1 / hoja_nombre='Notas' JUNTO CON EL ARCHIVO B.
			 *
			 * Con la limpieza, si el parseo falla queda hojas=[] => hay_varias_hojas false =>
			 * no viaja ninguna clave de hoja, y encabezado_fila en null => tampoco viaja
			 * header_row. El backend cae en sus defaults y detecta él, que es el principio de
			 * toda la misión: antes que mandar un dato de un archivo que ya no está, no
			 * mandar nada.
			 *
			 * Si el parseo sale bien, armar_hojas_del_libro() y detect_header_row() vuelven a
			 * escribir estos siete valores unas líneas más abajo: no cambia nada del camino
			 * feliz.
			 */
			self.workbook_cache       = null
			self.hojas                = []
			self.hoja_seleccionada    = null
			self.hoja_leida           = null
			self.encabezado_fila      = null
			self.encabezado_motivo    = null
			self.encabezado_confianza = 'alta'

			return new Promise(function(resolve, reject) {
				let reader = new FileReader()

				reader.onload = function(e) {
					try {
						let ultima_fila_con_contenido = self.detect_last_excel_row_from_buffer(e.target.result)

						self.finish_row = ultima_fila_con_contenido
						self.finish_row_original = ultima_fila_con_contenido
						self.file_processing = false
						resolve(ultima_fila_con_contenido)
					} catch (err) {
						console.error('Error al leer filas del Excel:', err)
						self.file_processing = false
						self.excel_rows_read_error = 'No se pudo leer el archivo para detectar filas. Podés analizar igual; el servidor ajustará el rango.'
						reject(err)
					}
				}

				reader.onerror = function() {
					self.file_processing = false
					self.excel_rows_read_error = 'Error al leer el archivo en el navegador.'
					reject(new Error('FileReader error'))
				}

				reader.readAsArrayBuffer(file)
			})
		},

		/*
		 * Calcula la última fila con contenido desde el buffer del Excel (xlsx/xls).
		 * También detecta automáticamente si la fila 1 es cabecera y ajusta start_row,
		 * siempre que el usuario no haya corregido la detección manualmente.
		 */
		detect_last_excel_row_from_buffer(array_buffer) {
			let data = new Uint8Array(array_buffer)
			let workbook = XLSX.read(data, { type: 'array' })

			/*
			 * Defecto 1: hasta acá se leía SheetNames[0] y las demás hojas del libro
			 * ni existían. Ahora se arma la lista entera; con una sola hoja el
			 * comportamiento no cambia en nada (se autoselecciona la 0 y no se dibuja
			 * ningún control nuevo), y con varias el usuario tiene que elegir.
			 */
			this.armar_hojas_del_libro(workbook)

			if (this.hojas.length === 0) {
				throw new Error('Hoja vacía')
			}

			/*
			 * La primera lectura siempre es sobre la hoja 0: es la que ya se mostraba
			 * antes de esta misión, y con varias hojas el botón de analizar queda
			 * deshabilitado igual hasta que el usuario elija (y ahí el watcher
			 * recalcula todo sobre la hoja nueva).
			 */
			return this.leer_hoja_y_detectar(0)
		},

		/*
		 * Arma this.hojas ({ indice, nombre, filas }) a partir del libro parseado y deja
		 * el libro guardado para poder recalcular al cambiar de hoja.
		 *
		 * Con UNA sola hoja, hoja_seleccionada queda en 0: no se dibuja ningún control
		 * nuevo y el request al backend sale sin las claves de hoja, exactamente igual
		 * que antes. Con dos o más queda en null, que es lo que deshabilita el botón
		 * "Analizar con IA" — el requisito de "no se importa nada hasta que se elige".
		 *
		 * @param {Object} workbook - Libro devuelto por XLSX.read
		 */
		armar_hojas_del_libro(workbook) {
			let hojas = []

			for (let i = 0; i < workbook.SheetNames.length; i++) {
				let nombre = workbook.SheetNames[i]
				let worksheet = workbook.Sheets[nombre]
				let filas = 0

				if (worksheet && worksheet['!ref']) {
					filas = XLSX.utils.decode_range(worksheet['!ref']).e.r + 1
				}

				hojas.push({
					indice: i,
					nombre: nombre,
					filas:  filas,
				})
			}

			/*
			 * Object.freeze: Vue 2 no observa objetos no extensibles, así que el libro
			 * queda accesible sin que la reactividad recorra celda por celda.
			 */
			this.workbook_cache    = Object.freeze(workbook)
			this.hojas             = hojas
			this.hoja_leida        = null
			this.hoja_seleccionada = hojas.length === 1 ? 0 : null
		},

		/*
		 * Lee la hoja del índice indicado: devuelve su última fila con contenido y corre
		 * la detección de encabezado sobre ESA hoja.
		 *
		 * @param {Number} indice - Índice 0-based de la hoja dentro del libro
		 * @returns {Number} Última fila (1-based) con contenido
		 */
		leer_hoja_y_detectar(indice) {
			let worksheet = this.worksheet_de(indice)

			if (!worksheet) {
				throw new Error('Hoja vacía')
			}

			this.hoja_leida = indice

			/* Método principal: mismo criterio que import/Index.vue cuando hay !ref. */
			if (worksheet['!ref']) {
				let range = XLSX.utils.decode_range(worksheet['!ref'])
				let ultima_fila_con_contenido = 1

				for (let fila = range.s.r; fila <= range.e.r; fila++) {
					for (let col = range.s.c; col <= range.e.c; col++) {
						let cell_ref = XLSX.utils.encode_cell({ c: col, r: fila })
						let cell = worksheet[cell_ref]

						if (cell && cell.v !== null && cell.v !== '') {
							ultima_fila_con_contenido = fila + 1
							break
						}
					}
				}

				/* Detectar la fila de encabezado antes de retornar. */
				this.detect_header_row(worksheet)

				return ultima_fila_con_contenido
			}

			/* Fallback si el Excel no trae !ref: recorremos filas parseadas. */
			let rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
			let ultima = 1

			for (let i = rows.length - 1; i >= 0; i--) {
				let row = rows[i]
				let has_content = false

				if (Array.isArray(row)) {
					for (let j = 0; j < row.length; j++) {
						if (row[j] !== null && row[j] !== '' && String(row[j]).trim() !== '') {
							has_content = true
							break
						}
					}
				}

				if (has_content) {
					ultima = i + 1
					break
				}
			}

			/* Detectar la fila de encabezado antes de retornar. */
			this.detect_header_row(worksheet)

			return ultima
		},

		/*
		 * Worksheet de SheetJS correspondiente a un índice de this.hojas, o null si el
		 * libro ya no está en memoria (por ejemplo tras un F5, cuando el modal se
		 * rehidrata desde el backend y el archivo local no existe más).
		 *
		 * @param {Number} indice - Índice 0-based
		 * @returns {Object|null}
		 */
		worksheet_de(indice) {
			if (!this.workbook_cache || !this.hojas.length) {
				return null
			}

			let hoja = this.hojas[indice]

			if (!hoja) {
				return null
			}

			return this.workbook_cache.Sheets[hoja.nombre] || null
		},

		/*
		 * Determina automáticamente la fila de encabezado y start_row.
		 *
		 * 🔴 ESTA REGLA ESTÁ DECIDIDA DOS VECES, EN DOS LENGUAJES. Si cambiás esta regla,
		 * cambiá también la de
		 * `empresa-api/app/Http/Controllers/Helpers/import/excel/ExcelHeaderDetector.php`
		 * — es el mismo invariante decidido en dos lenguajes. Si divergen, el mapeo de
		 * columnas se arma con una fila y la importación arranca en otra, y no lo denuncia
		 * nadie: faltan artículos, o se importan el título y la razón social como si fueran
		 * datos. Es exactamente la clase de error "el mismo invariante decidido con dos
		 * criterios distintos en front y back" de contexto/APRENDER_NO_PARCHEAR.md.
		 *
		 * La regla, textual:
		 * 1. Se miran las primeras 20 filas FÍSICAS de la hoja, con las fusiones ya propagadas,
		 *    anotando qué celdas se llenaron propagando.
		 * 2. Se frena (sin incluirla) en la primera fila con al menos UMBRAL celdas no vacías
		 *    de las que trae el archivo y alguna numérica o fecha: esa fila ya son datos, y el
		 *    encabezado no puede estar debajo de los datos. UMBRAL es la mitad del ancho de la
		 *    fila más ancha de la ventana (contando sólo celdas del archivo), con un piso de 3.
		 * 3. De las filas anteriores al corte es candidata la que cumple las cuatro:
		 *    >= 2 celdas no vacías DEL ARCHIVO; ninguna no vacía numérica ni fecha; toda no
		 *    vacía de hasta 40 caracteres; y todas distintas entre sí en minúsculas,
		 *    comparando SÓLO las celdas del archivo y no las propagadas.
		 * 4. Gana la candidata con más celdas no vacías. Empate => la de más arriba.
		 * 5. Sin candidata se cae a la regla vieja (primera fila con algún contenido), con
		 *    motivo 'sin_candidata_clara' y confianza 'baja'.
		 *
		 * El "numérica o fecha" de los puntos 2 y 3 no es el de JavaScript: está en
		 * valor_es_numerico_o_fecha(), que replica is_numeric() de PHP 7.4 y el preg_match
		 * de fecha ISO del backend. Ahí es donde las dos implementaciones se habían
		 * separado (defecto B6), y ahí es donde hay que mirar primero si vuelven a
		 * separarse.
		 *
		 * @param {Object} worksheet - Hoja de trabajo de XLSX
		 */
		detect_header_row(worksheet) {
			/* Respetar corrección manual del usuario, tanto del toggle como de la fila. */
			if (this.header_row_manually_overridden || this.encabezado_manualmente_corregido) {
				return
			}

			if (!worksheet || !worksheet['!ref']) {
				/* Sin referencia de rango: fallback a sheet_to_json para no romper el flujo. */
				let rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
				let start_row_sin_ref = rows.length > 0 ? 2 : 1

				/* start_row ANTES de has_header_row: ver el comentario del watcher (T16). */
				this.start_row                = start_row_sin_ref
				this.encabezado_fila          = rows.length > 0 ? 1 : null
				this.encabezado_motivo        = 'primera_fila_con_contenido'
				this.encabezado_confianza     = 'baja'
				this.has_header_row           = true
				return
			}

			let ventana = this.leer_ventana_de_encabezado(worksheet)
			let deteccion = this.detectar_fila_de_encabezado(ventana)

			/*
			 * 🔴 T16: start_row se calcula y se asigna ANTES de has_header_row. El watcher
			 * de has_header_row ajusta start_row en ±1 cuando el cambio es manual; si se
			 * invierte el orden, start_row queda corrido en uno y el síntoma es invisible
			 * hasta que faltan artículos al final de la importación.
			 */
			let calculated_start_row = deteccion.es_encabezado
				? deteccion.fila + 1
				: deteccion.fila

			this.start_row            = Math.max(1, calculated_start_row)
			this.encabezado_fila      = deteccion.es_encabezado ? deteccion.fila : null
			this.encabezado_motivo    = deteccion.motivo
			this.encabezado_confianza = deteccion.confianza
			this.has_header_row       = deteccion.es_encabezado
		},

		/*
		 * Lee las primeras 20 filas físicas de la hoja y les propaga las fusiones.
		 *
		 * SheetJS expone los rangos fusionados en worksheet['!merges'] (OpenSpout no, por eso
		 * del lado del backend hay que ir a buscarlos al XML de la hoja). El valor de la celda
		 * ancla — la esquina superior izquierda del rango — se copia a todas las celdas
		 * cubiertas cuyo valor leído esté vacío. Vale para fusiones horizontales (E1:F1) y
		 * verticales (A1:A3), y sólo dentro de esta ventana: las fusiones de las filas de
		 * datos no se tocan, por decisión explícita del plan.
		 *
		 * @param {Object} worksheet - Hoja de trabajo de XLSX
		 * @returns {Array} Filas de la ventana: [{ fila: 1, valores: ['A', 'B', ...] }, ...]
		 */
		leer_ventana_de_encabezado(worksheet) {
			let range = XLSX.utils.decode_range(worksheet['!ref'])
			let ultima_columna = range.e.c
			let ultima_fila_ventana = Math.min(range.e.r, this.VENTANA_DE_ENCABEZADO - 1)
			let ventana = []

			/*
			 * Arranca en la fila física 0 (fila 1 del Excel) y no en range.s.r, para que el
			 * número de fila sea siempre el real del Excel, igual que hace el backend al leer
			 * preservando las filas vacías.
			 */
			for (let r = 0; r <= ultima_fila_ventana; r++) {
				let valores = []

				for (let c = 0; c <= ultima_columna; c++) {
					let cell = worksheet[XLSX.utils.encode_cell({ c: c, r: r })]
					valores.push(this.valor_de_celda(cell))
				}

				/*
				 * `propagadas` anota QUÉ celdas se llenaron copiando una fusión, no sólo
				 * cuántas. Sin esa marca no hay forma de que fila_es_candidata_a_encabezado()
				 * distinga un duplicado que trae el archivo de uno que generamos nosotros al
				 * propagar. Es la clave `propagadas` de ExcelHeaderDetector.
				 */
				ventana.push({ fila: r + 1, valores: valores, propagadas: Object.create(null) })
			}

			this.propagar_fusiones_en_ventana(worksheet, ventana)

			return ventana
		},

		/*
		 * Copia el valor de la celda ancla de cada rango fusionado sobre las celdas vacías
		 * que ese rango cubre, dentro de la ventana.
		 *
		 * @param {Object} worksheet - Hoja de trabajo de XLSX
		 * @param {Array}  ventana   - Filas devueltas por leer_ventana_de_encabezado
		 */
		propagar_fusiones_en_ventana(worksheet, ventana) {
			let merges = worksheet['!merges']

			if (!Array.isArray(merges) || merges.length === 0) {
				return
			}

			for (let i = 0; i < merges.length; i++) {
				let merge = merges[i]

				if (!merge || !merge.s || !merge.e) {
					continue
				}

				/* El rango arranca fuera de la ventana: no aporta nada al encabezado. */
				if (merge.s.r > ventana.length - 1) {
					continue
				}

				let ancla = ventana[merge.s.r]

				if (!ancla) {
					continue
				}

				let valor_ancla = ancla.valores[merge.s.c]

				/* Ancla vacía, o fuera de las columnas leídas: no hay nada que propagar. */
				if (valor_ancla === '' || valor_ancla === undefined) {
					continue
				}

				for (let r = merge.s.r; r <= merge.e.r && r <= ventana.length - 1; r++) {
					for (let c = merge.s.c; c <= merge.e.c; c++) {
						/* La celda ancla no se propaga a sí misma. */
						if (r === merge.s.r && c === merge.s.c) {
							continue
						}

						/*
						 * La celda cubierta suele no existir (ni en el XML del backend ni en
						 * el rango !ref de SheetJS), así que hay que estirar la fila hasta
						 * ella. Sin esto, una cabecera fusionada E1:F1 deja la columna F sin
						 * nombre. Es el mismo `while (count(...) <= $col)` del backend.
						 */
						while (ventana[r].valores.length <= c) {
							ventana[r].valores.push('')
						}

						if (ventana[r].valores[c] !== '') {
							continue
						}

						ventana[r].valores[c] = valor_ancla
						ventana[r].propagadas[c] = true
					}
				}
			}
		},

		/*
		 * Aplica la regla de detección sobre la ventana ya leída y con fusiones propagadas.
		 * Ver el comentario cruzado de detect_header_row(): esto es el gemelo en JavaScript
		 * de ExcelHeaderDetector::detectar() del backend.
		 *
		 * @param {Array} ventana - Filas devueltas por leer_ventana_de_encabezado
		 * @returns {Object} { fila, es_encabezado, motivo, confianza }
		 */
		detectar_fila_de_encabezado(ventana) {
			let umbral_de_corte       = this.umbral_de_corte(ventana)
			let primera_con_contenido = 0
			let mejor_fila            = 0
			let mejor_cantidad        = 0

			for (let i = 0; i < ventana.length; i++) {
				let fila       = ventana[i].fila
				let no_vacias  = this.celdas_no_vacias(ventana[i], false)
				let originales = this.celdas_no_vacias(ventana[i], true)

				if (no_vacias.length === 0) {
					continue
				}

				if (primera_con_contenido === 0) {
					primera_con_contenido = fila
				}

				/*
				 * Corte: esta fila ya son datos, y el encabezado no puede estar debajo.
				 *
				 * 🔴 EL UMBRAL ES RELATIVO AL ANCHO DE LA TABLA, NO ">= 2 CELDAS". Con ">= 2"
				 * cortaba cualquier renglón de membrete de una lista de proveedor:
				 * "Distribuidora Bianchi S.A. | 30712345679" son dos celdas y una es numérica
				 * (el CUIT), y "Vigencia desde: | 2026-08-01" lo mismo con la fecha. Los dos
				 * mataban la búsqueda en la fila 2 y el encabezado real de la fila 4 no se
				 * miraba nunca. Una fila de datos de verdad llena media tabla; un membrete,
				 * dos o tres celdas sueltas.
				 */
				if (originales.length >= umbral_de_corte && this.alguna_es_numerica_o_fecha(originales)) {
					break
				}

				if (this.fila_es_candidata_a_encabezado(no_vacias, originales) && no_vacias.length > mejor_cantidad) {
					/* Estrictamente mayor: ante un empate gana la de más arriba. */
					mejor_fila     = fila
					mejor_cantidad = no_vacias.length
				}
			}

			if (mejor_fila > 0) {
				return {
					fila:          mejor_fila,
					es_encabezado: true,
					motivo:        mejor_fila === primera_con_contenido ? 'primera_fila_con_contenido' : 'encabezado_corrido',
					confianza:     'alta',
				}
			}

			/*
			 * Sin candidata clara: se cae a la regla vieja — la primera fila con algún
			 * contenido, y es encabezado sólo si ninguna de sus celdas no vacías es
			 * numérica, que es exactamente lo que decidía este método antes de la misión.
			 * La confianza baja hace que el campo de la fila se muestre resaltado.
			 */
			let fila_vieja = primera_con_contenido > 0 ? primera_con_contenido : 1
			let es_encabezado = true

			if (primera_con_contenido > 0) {
				let valores = ventana[primera_con_contenido - 1].valores

				for (let j = 0; j < valores.length; j++) {
					if (valores[j] !== '' && this.valor_es_numerico_o_fecha(valores[j])) {
						es_encabezado = false
						break
					}
				}
			}

			return {
				fila:          fila_vieja,
				es_encabezado: es_encabezado,
				motivo:        'sin_candidata_clara',
				confianza:     'baja',
			}
		},

		/*
		 * Celdas llenas de una fila de la ventana. Espejo de
		 * ExcelHeaderDetector::celdas_no_vacias().
		 *
		 * @param {Object}  fila                - Fila de la ventana { fila, valores, propagadas }
		 * @param {Boolean} excluir_propagadas  - True para contar sólo las que trae el archivo
		 * @returns {Array}
		 */
		celdas_no_vacias(fila, excluir_propagadas) {
			let no_vacias = []

			for (let c = 0; c < fila.valores.length; c++) {
				if (excluir_propagadas && fila.propagadas[c] === true) {
					continue
				}

				if (fila.valores[c] === '') {
					continue
				}

				no_vacias.push(fila.valores[c])
			}

			return no_vacias
		},

		/*
		 * @param {Array} valores
		 * @returns {Boolean} True si alguno es numérico o fecha
		 */
		alguna_es_numerica_o_fecha(valores) {
			for (let i = 0; i < valores.length; i++) {
				if (this.valor_es_numerico_o_fecha(valores[i])) {
					return true
				}
			}

			return false
		},

		/*
		 * Cantidad de celdas llenas de la fila más ancha de la ventana, contando SÓLO las
		 * que trae el archivo, y de ahí el umbral que dispara el corte por fila de datos:
		 * la mitad del ancho, con un piso de MINIMO_DE_CELDAS_PARA_CORTAR.
		 *
		 * Las propagadas se excluyen a propósito: un título fusionado sobre A1:T1 propaga
		 * 20 celdas y, si contaran, el umbral se iría a 10 en una tabla de 5 columnas y
		 * ninguna fila de datos alcanzaría para cortar. El ancho que interesa es el de la
		 * tabla, no el del membrete. Espejo de ExcelHeaderDetector::umbral_de_corte().
		 *
		 * @param {Array} ventana
		 * @returns {Number}
		 */
		umbral_de_corte(ventana) {
			let ancho = 0

			for (let i = 0; i < ventana.length; i++) {
				let cantidad = this.celdas_no_vacias(ventana[i], true).length

				if (cantidad > ancho) {
					ancho = cantidad
				}
			}

			let mitad = Math.ceil(ancho / 2)

			return mitad > this.MINIMO_DE_CELDAS_PARA_CORTAR ? mitad : this.MINIMO_DE_CELDAS_PARA_CORTAR
		},

		/*
		 * Las condiciones de candidata del punto 3 de la regla. Espejo de
		 * ExcelHeaderDetector::es_candidata().
		 *
		 * @param {Array} no_vacias  - Celdas llenas, propagadas incluidas
		 * @param {Array} originales - Celdas llenas que trae el archivo, sin las propagadas
		 * @returns {Boolean}
		 */
		fila_es_candidata_a_encabezado(no_vacias, originales) {
			if (originales.length < 2) {
				return false
			}

			for (let i = 0; i < no_vacias.length; i++) {
				/* Ninguna celda no vacía puede ser numérica ni fecha. */
				if (this.valor_es_numerico_o_fecha(no_vacias[i])) {
					return false
				}

				/* Toda celda no vacía tiene que medir 40 caracteres o menos. */
				if (this.largo_estilo_mb(no_vacias[i]) > this.LARGO_MAXIMO_DE_CELDA) {
					return false
				}
			}

			/*
			 * 🔴 "TODAS DISTINTAS" SE EVALÚA SOBRE LAS CELDAS ORIGINALES, NO SOBRE LAS
			 * PROPAGADAS. Parece una excepción caprichosa y es lo que hace que los dos
			 * arreglos convivan: una cabecera fusionada "PRECIOS" sobre E1:F1 se propaga a
			 * las dos columnas —que es justamente el arreglo de las fusionadas— y deja el
			 * encabezado con un duplicado que lo sacaba de candidato. Ese duplicado lo
			 * generamos nosotros al propagar: no viene del archivo, así que no puede ser
			 * evidencia de nada.
			 *
			 * La otra mitad de la regla es el `originales.length < 2` de arriba, y tampoco
			 * se puede sacar: un título fusionado sobre A1:F1 propaga seis celdas iguales y,
			 * sin ese piso, quedaría como candidato con seis celdas llenas y le ganaría por
			 * cantidad al encabezado de verdad.
			 *
			 * Object.create(null) y no {}: con un objeto común, una celda que se llamara
			 * '__proto__' no se guardaría como clave propia y dos celdas iguales pasarían el
			 * control que del lado de PHP (array_unique) sí las frena.
			 */
			let vistos = Object.create(null)

			for (let i = 0; i < originales.length; i++) {
				let clave = originales[i].toLowerCase()

				if (vistos[clave] === true) {
					return false
				}

				vistos[clave] = true
			}

			return true
		},

		/*
		 * Valor de una celda como string, dejado EXACTAMENTE como lo deja el backend en su
		 * ventana (ExcelHeaderDetector::leer_ventana_con_detalle): mismo trim, mismo
		 * formato de fecha y mismo casteo de booleano. Las celdas vacías, nulas o
		 * inexistentes dan cadena vacía.
		 *
		 * @param {Object} cell - Celda de SheetJS
		 * @returns {String}
		 */
		valor_de_celda(cell) {
			if (!cell || cell.v === null || cell.v === undefined) {
				return ''
			}

			/*
			 * Fecha real del Excel. El backend la guarda como $valor->format('Y-m-d'), así
			 * que acá se arma el mismo 'Y-m-d' — y con los componentes LOCALES del Date, no
			 * con toISOString(), que convierte a UTC y en un huso positivo devolvería el día
			 * anterior. La reconoce después EXPRESION_FECHA_ISO, igual que del otro lado.
			 */
			if (cell.v instanceof Date) {
				return this.fecha_como_ymd(cell.v)
			}

			/*
			 * Booleano. OpenSpout se lo entrega al backend como bool y ahí se castea a
			 * string, o sea '1' y ''. String(true) daría 'true', que no es numérico: la
			 * fila seguiría siendo candidata a encabezado acá y no del otro lado.
			 */
			if (typeof cell.v === 'boolean') {
				return cell.v ? '1' : ''
			}

			return this.trim_estilo_php(String(cell.v))
		},

		/*
		 * Fecha como 'AAAA-MM-DD' tomando los componentes locales, que son los que Excel
		 * quiso decir. Espejo de \DateTime::format('Y-m-d') del backend.
		 *
		 * @param {Date} fecha
		 * @returns {String}
		 */
		fecha_como_ymd(fecha) {
			let mes = fecha.getMonth() + 1
			let dia = fecha.getDate()

			return fecha.getFullYear()
				+ '-' + (mes < 10 ? '0' + mes : String(mes))
				+ '-' + (dia < 10 ? '0' + dia : String(dia))
		},

		/*
		 * trim() de PHP, que es el que el backend aplica a cada valor de la ventana.
		 *
		 * NO es lo mismo que String.prototype.trim(): el de JavaScript saca además
		 * cualquier espacio Unicode, y el primero de todos es el espacio duro
		 * (NBSP, U+00A0), que aparece a montones en los Excel exportados por sistemas
		 * viejos. Con el trim de JS, un ' 123' quedaba '123' y la SPA lo veía
		 * numérico mientras el backend lo veía texto: la misma celda cortaba la búsqueda
		 * del encabezado de un lado y no del otro. PHP saca sólo " \t\n\r\0\x0B".
		 *
		 * @param {String} texto
		 * @returns {String}
		 */
		trim_estilo_php(texto) {
			return texto.replace(/^[ \t\n\r\0\x0B]+/, '').replace(/[ \t\n\r\0\x0B]+$/, '')
		},

		/*
		 * Largo en CARACTERES, como mb_strlen() del backend, y no en unidades UTF-16 como
		 * String.length. Un par sustituto (un emoji, un ideograma raro) cuenta 2 en
		 * String.length y 1 en mb_strlen: en una celda pegada al límite de 40 eso alcanza
		 * para que la fila sea candidata a encabezado de un lado y no del otro.
		 *
		 * @param {String} texto
		 * @returns {Number}
		 */
		largo_estilo_mb(texto) {
			return texto.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '_').length
		},

		/*
		 * True si el valor es numérico o una fecha, con EL MISMO criterio que
		 * ExcelHeaderDetector::es_numerica_o_fecha() del backend. De esto depende dónde
		 * corta la búsqueda del encabezado, y como la SPA manda header_row y el backend le
		 * da prioridad absoluta, la regla que decide en la práctica es ésta: si diverge,
		 * decide la equivocada.
		 *
		 * Los tres criterios, en orden:
		 * 1. trim de PHP (no el de JS: ver trim_estilo_php).
		 * 2. is_numeric() de PHP replicado con EXPRESION_NUMERICA_PHP. No se usa Number():
		 *    Number() acepta '0x1A', '0b101' y '0o17', que PHP rechaza desde la 7.0, y
		 *    rechaza '1e400' por infinito, que para PHP es numérico. Ésos son los tres
		 *    bordes que divergían (el comentario que estaba acá decía justo lo contrario:
		 *    que el hexadecimal coincidía "porque PHP tampoco lo acepta" — es al revés,
		 *    PHP decía que no y JS decía que sí, y POR ESO divergían).
		 * 3. Fecha ISO en texto ('2026-08-22') con el mismo preg_match del backend, que es
		 *    también la forma en que valor_de_celda() entrega las fechas reales.
		 *
		 * Un código de barras guardado como texto ('7790101') sigue contando como numérico
		 * en los dos lados, que es lo que mantiene el encabezado en la fila 1 de siempre.
		 *
		 * @param {String} valor - Valor de una celda tal como lo dejó valor_de_celda()
		 * @returns {Boolean}
		 */
		valor_es_numerico_o_fecha(valor) {
			let texto = this.trim_estilo_php(String(valor))

			if (texto === '') {
				return false
			}

			if (this.EXPRESION_FECHA_ISO.test(texto)) {
				return true
			}

			return this.EXPRESION_NUMERICA_PHP.test(texto)
		},

		/*
		 * El usuario corrigió a mano la fila de encabezado en el paso 1. A partir de acá
		 * la detección automática no la pisa más.
		 *
		 * 🔴 T16: se calcula start_row en una variable y se asigna sin tocar has_header_row.
		 * El bloque sólo se muestra con has_header_row en true, así que el watcher que
		 * ajusta start_row en ±1 no tiene por qué dispararse acá.
		 */
		corregir_fila_de_encabezado() {
			let fila = Number(this.encabezado_fila)

			if (!fila || fila < 1) {
				return
			}

			this.encabezado_manualmente_corregido = true

			let calculated_start_row = fila + 1

			this.start_row = Math.max(1, calculated_start_row)
		},

		/*
		 * True si la fila del Excel tiene al menos una celda con contenido (tras trim).
		 *
		 * @param {Array} row - Fila parseada con sheet_to_json
		 * @returns {Boolean}
		 */
		excel_row_has_content(row) {
			if (!Array.isArray(row)) {
				return false
			}

			for (let j = 0; j < row.length; j++) {
				let cell_value = row[j]

				if (cell_value !== null && cell_value !== '' && String(cell_value).trim() !== '') {
					return true
				}
			}

			return false
		},

		/*
		 * Llama al endpoint /ai-excel-import/analyze con el archivo Excel seleccionado.
		 * Al recibir respuesta de Claude, avanza al paso 2 con el mapeo sugerido.
		 */
		analyze() {
			let self = this

			if (!self.file) {
				self.$toast.error('Seleccioná un archivo Excel')
				return
			}

			if (self.file_processing) {
				self.$toast.error('Esperá a que termine de leerse el archivo')
				return
			}

			self.error_message = ''
			self.loading = true

			/*
			 * Si no se detectaron filas al elegir el archivo, reintentamos antes de llamar a la API.
			 */
			let detect_promise = Promise.resolve()

			if (!self.finish_row) {
				let file_to_read = self.resolve_selected_excel_file(self.file)
				if (file_to_read) {
					detect_promise = self.process_excel_file(file_to_read)
				}
			}

			detect_promise
			.then(function() {
				self.run_analyze_request()
			})
			.catch(function() {
				/* Aunque falle la lectura local, permitimos analizar (el backend ajusta finish_row). */
				self.run_analyze_request()
			})
		},

		/*
		 * Grupo 299 (correctivo de cancelación de polling, segundo intento): helper
		 * único de espera para las dos corridas asincrónicas del modal (análisis y
		 * recomendación). Hace polling a GET ai-excel-import/analysis/<uuid> hasta
		 * que el backend reporte 'listo' o 'error'.
		 *
		 * Recibe el token de corrida CAPTURADO POR EL CALLER (antes del POST que
		 * encoló esta corrida) y lo reusa tal cual en todas sus comprobaciones: NO
		 * lo incrementa ni acuña uno propio. Ese es exactamente el bug que tumbó el
		 * intento anterior (grupo 297): un helper que se acuña su propio token
		 * rompe la cadena de invalidación del caller y una corrida cancelada
		 * "resucita" como una corrida nueva y válida.
		 *
		 * Grupo 303 (1/8/2026): este helper NUNCA escribe analysis_polling_token,
		 * solo lo lee. Sus cuatro salidas (éxito, error del backend, 5 fallos de
		 * red seguidos y corte a los 15 minutos) cierran únicamente con
		 * limpiar_timer_de_aviso() y nada más — ni un solo ++token dentro de este
		 * método. Escribirlo acá invalida la corrida contra el propio callback del
		 * caller que va a consumir el resultado (ver comentario junto al resolve()
		 * de más abajo). El único lugar autorizado a incrementar el token es
		 * cancelar_analisis_en_curso().
		 *
		 * @param {string} analysis_uuid  uuid devuelto por analyze() / get-recomendacion()
		 * @param {number} token_corrida  token que el caller capturó antes de su POST
		 * @return {Promise} resuelve con el "resultado" del backend, rechaza con un mensaje legible
		 */
		esperar_analisis_terminado(analysis_uuid, token_corrida) {
			let self = this

			return new Promise(function(resolve, reject) {

				let inicio = Date.now()
				let fallos_consecutivos = 0

				/*
				 * Marca que el usuario está mirando esta corrida acá. Mientras dure, el
				 * aviso de "terminó el análisis" no se le muestra: el resultado va a
				 * aparecer solo en esta misma pantalla. Es el único punto por el que
				 * pasan todos los seguimientos, así que es el único lugar donde hay que
				 * marcarlo.
				 */
				self.$store.commit('excel_analysis/set_siguiendo_uuid', analysis_uuid)

				/*
				 * Aviso de "archivo grande" a los 20 segundos: si para entonces el
				 * análisis todavía no terminó, se le ofrece al usuario irse a hacer
				 * otra cosa. Antes este aviso iba a auth/setMessage —el mensaje del
				 * loading global— y decía "podés dejar esta ventana abierta", que era
				 * la única opción que tenía: la ventana lo tenía preso. Ahora es un
				 * texto del propio modal y dice lo contrario, porque ahora puede irse.
				 *
				 * Sigue teniendo que morir en TODOS los caminos de salida, para no
				 * quedar colgado bajo un modal que ya mostró su resultado.
				 */
				self.analysis_warning_timer_id = setTimeout(function() {
					if (token_corrida !== self.analysis_polling_token) return
					self.analysis_es_archivo_grande = true
				}, 20000)

				function limpiar_timer_de_aviso() {
					if (self.analysis_warning_timer_id) {
						clearTimeout(self.analysis_warning_timer_id)
						self.analysis_warning_timer_id = null
					}
				}

				function consultar() {

					/* Punto de chequeo: la función que ejecuta la consulta. */
					if (token_corrida !== self.analysis_polling_token) return

					self.$api.get('ai-excel-import/analysis/' + analysis_uuid, { timeout: 30000 })
					.then(function(res) {

						/* Punto de chequeo: el .then de cada GET de polling. */
						if (token_corrida !== self.analysis_polling_token) return

						fallos_consecutivos = 0

						/*
						 * El paso y el progreso van a estado local del modal, no al
						 * mensaje del loading global: el loading global tapa la app
						 * entera, y la app entera es exactamente lo que el usuario tiene
						 * que poder seguir usando mientras esto corre.
						 */
						self.analysis_paso     = res.data.paso || ''
						self.analysis_progreso = res.data.progreso || 0

						/* Mantiene vivo el estado de la corrida para el resto de la app. */
						self.$store.commit('excel_analysis/set_corrida', {
							uuid:     analysis_uuid,
							tipo:     res.data.tipo,
							estado:   res.data.estado,
							progreso: res.data.progreso,
							paso:     res.data.paso,
							contexto: res.data.contexto,
						})

						/*
						 * Grupo 303 (corrige el correctivo del grupo 299): acá NO va un
						 * incremento del token (self.analysis_polling_token). El token es
						 * del caller: lo capturó antes de su POST y lo vuelve a chequear
						 * en su .then(resultado),
						 * que corre después de este resolve(). Si lo invalidamos acá,
						 * dejamos huérfano al propio callback que iba a consumir el
						 * resultado — exactamente el bug que dejaba el modal colgado para
						 * siempre en "Analizando el archivo con IA... (40%)" (1/8/2026).
						 * Lo único que corresponde cerrar en todos los caminos de salida es
						 * el timer de aviso de los 20 s (limpiar_timer_de_aviso(), arriba),
						 * para que no ensucie auth/setMessage — ese era el motivo real por
						 * el que alguien había puesto el ++ acá. El único lugar autorizado a
						 * invalidar el token es cancelar_analisis_en_curso().
						 */
						if (res.data.estado === 'listo') {
							limpiar_timer_de_aviso()
							resolve(res.data.resultado)
							return
						}

						/* Ídem arriba: el token es del caller, no se invalida en este helper. */
						if (res.data.estado === 'error') {
							limpiar_timer_de_aviso()
							reject(res.data.error || 'Ocurrió un error al analizar el archivo.')
							return
						}

						agendar_proxima_consulta()
					})
					.catch(function() {

						/* Punto de chequeo: el .catch de cada GET de polling. */
						if (token_corrida !== self.analysis_polling_token) return

						/*
						 * Un error de red en UNA consulta no aborta la espera: un corte de
						 * wifi de tres segundos no puede tirar abajo un análisis de diez
						 * minutos que el servidor está haciendo bien. Recién después de 5
						 * fallos SEGUIDOS se rechaza.
						 */
						fallos_consecutivos++

						if (fallos_consecutivos >= 5) {
							limpiar_timer_de_aviso()
							reject('No se pudo consultar el estado del análisis. Probá de nuevo.')
							return
						}

						agendar_proxima_consulta()
					})
				}

				function agendar_proxima_consulta() {

					/* Punto de chequeo: el agendador del siguiente ciclo. */
					if (token_corrida !== self.analysis_polling_token) return

					let transcurrido = Date.now() - inicio

					if (transcurrido >= 900000) {
						limpiar_timer_de_aviso()
						reject('El análisis está tardando más de lo normal. Probá de nuevo o avisanos.')
						return
					}

					/* Cada 2s el primer medio minuto; cada 5s después (menos ruido contra la API). */
					let intervalo = transcurrido < 30000 ? 2000 : 5000

					self.analysis_polling_timer_id = setTimeout(function() {

						/* Punto de chequeo: la función que ejecuta la consulta (al disparar el timer). */
						if (token_corrida !== self.analysis_polling_token) return

						consultar()

					}, intervalo)
				}

				consultar()
			})
		},

		/*
		 * POST a /ai-excel-import/analyze con el archivo ya seleccionado.
		 */
		run_analyze_request() {
			let self = this

			let form_data = new FormData()
			form_data.append('excel_file', self.file)
			/* Informamos al backend qué modelo analizar para elegir el analizador correcto. */
			form_data.append('model', self.model)

			/*
			 * Rango de filas y detección de cabecera, que se calcularon leyendo el
			 * Excel acá en el navegador. Antes no viajaban: no hacía falta, porque el
			 * modal que los había calculado era el mismo que después los usaba para
			 * importar. Ahora el paso 2 se puede abrir desde otra pestaña o después de
			 * un F5, cuando el archivo local ya no existe y estos tres valores no se
			 * pueden volver a calcular. El backend los guarda y los devuelve.
			 */
			form_data.append('start_row', self.start_row)
			form_data.append('finish_row', self.finish_row)
			form_data.append('has_header_row', self.has_header_row ? 1 : 0)

			/*
			 * Fila de encabezado, que viaja SIEMPRE — también en los libros de una sola
			 * hoja, porque el defecto del encabezado corrido no tiene nada que ver con la
			 * cantidad de hojas. Con el encabezado en la fila 1 vale 1, que es justo lo que
			 * el backend detectaría por su cuenta.
			 *
			 * Única excepción: cuando la planilla no tiene encabezado (has_header_row en
			 * false) no hay fila que mandar, y la clave se omite para que el backend use su
			 * default en vez de recibir basura.
			 */
			if (self.encabezado_fila) {
				form_data.append('header_row', Number(self.encabezado_fila))
			}

			/*
			 * Hoja elegida: SÓLO si el libro tiene más de una. Así el request de un libro
			 * normal —que es la enorme mayoría— queda byte por byte igual al de antes de
			 * esta misión, y el backend cae en su default de hoja 0.
			 *
			 * Viajan el índice y el nombre porque el índice de SheetJS (acá) y el de
			 * OpenSpout (el backend) podrían no coincidir ante un libro con chartsheets;
			 * el backend resuelve por nombre primero y usa el índice como respaldo.
			 *
			 * 🔴 B7: y sólo si hay una hoja elegida DE VERDAD. Sin esta segunda condición,
			 * un libro de varias hojas con hoja_seleccionada en null (el usuario todavía no
			 * eligió, o el parseo del archivo falló y la selección se limpió) mandaba
			 * Number(null) => hoja=0 sin nombre, o sea un índice inventado. Si no sabemos
			 * qué hoja es, no se manda nada y el backend usa su default.
			 */
			let hoja_elegida = self.hay_varias_hojas && self.hoja_seleccionada !== null && self.hoja_seleccionada !== undefined
				? self.hojas[Number(self.hoja_seleccionada)]
				: null

			if (hoja_elegida) {
				form_data.append('hoja', Number(self.hoja_seleccionada))
				form_data.append('hoja_nombre', hoja_elegida.nombre)
			}

			/* Solo sube el archivo y lo encola: si tarda más de 2 minutos, es la subida, no el análisis. */
			let config = {
				headers: { 'content-type': 'multipart/form-data' },
				timeout: 120000,
			}

			/*
			 * Capturamos el token ANTES del POST y no dentro del helper de polling
			 * porque la subida del archivo es la ventana más larga de todo el flujo
			 * (hasta 2 minutos con archivos grandes): si el usuario cierra el modal
			 * mientras el POST está en vuelo, la cancelación tiene que poder
			 * invalidar TAMBIÉN esta corrida, y solo puede hacerlo si el token ya
			 * existía cuando el POST arrancó.
			 */
			let token_corrida = ++self.analysis_polling_token

			/*
			 * Ya no se prende el loading global (auth/setLoading). Ese overlay tapaba
			 * la aplicación entera durante todo el análisis, que es de lo que se
			 * trataba el problema: un archivo de 20.000 filas dejaba al usuario sin
			 * sistema por varios minutos. El estado de la corrida se muestra ahora
			 * dentro del modal, y el modal se puede cerrar.
			 */
			self.analysis_paso     = 'Subiendo el archivo…'
			self.analysis_progreso = 0

			self.$api.post('ai-excel-import/analyze', form_data, config)
			.then(function(res) {

				/* Punto de chequeo: el .then del POST inicial, antes de llamar al helper. */
				if (token_corrida !== self.analysis_polling_token) return

				/*
				 * Guardamos el uuid apenas lo tenemos. Es lo que convierte a esta
				 * corrida en algo que existe fuera de este componente: con él se la
				 * puede volver a encontrar después de cerrar el modal, y es lo que
				 * viaja a /get-recomendacion para poder reconstruir el paso 3.
				 */
				self.analysis_uuid = res.data.analysis_uuid

				self.$store.commit('excel_analysis/set_corrida', {
					uuid:   res.data.analysis_uuid,
					tipo:   'analisis',
					estado: res.data.estado || 'pendiente',
					/*
					 * El módulo va desde el vamos, aunque el backend todavía no haya
					 * devuelto contexto: es lo que evita que el modal de artículos
					 * retome una corrida de clientes, y hay tres instancias de este
					 * componente vivas al mismo tiempo.
					 */
					contexto: { model: self.model },
				})

				return self.esperar_analisis_terminado(res.data.analysis_uuid, token_corrida)
				.then(function(resultado) {

					if (token_corrida !== self.analysis_polling_token) return

					self.terminar_seguimiento()
					self.aplicar_resultado_analisis(resultado)
					self.step = 2
				})
				.catch(function(mensaje) {

					/* Punto de chequeo: no escribir error_message sobre una corrida ya soltada. */
					if (token_corrida !== self.analysis_polling_token) return

					self.terminar_seguimiento()
					self.error_message = mensaje
				})
			})
			.catch(function(err) {

				/* Punto de chequeo: el .catch del POST inicial, antes de tocar loading/error_message. */
				if (token_corrida !== self.analysis_polling_token) return

				self.terminar_seguimiento()

				let message = 'Error al analizar el archivo.'

				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}

				self.error_message = message
			})
		},

		/*
		 * Vuelca en el modal el resultado de una corrida de análisis, venga de la
		 * espera en vivo (el usuario se quedó mirando) o de una rehidratación (el
		 * usuario se fue y volvió). Los dos caminos tienen que dejar el paso 2
		 * exactamente igual, así que hay un solo lugar donde se arma.
		 *
		 * @param {Object} resultado  "resultado" tal como lo devuelve la API
		 * @return {void}
		 */
		/*
		 * Índice 0-based de hoja para los endpoints que reciben JSON (get-recomendacion,
		 * refresh-provider-stats e import). A diferencia del multipart de /analyze, acá la
		 * clave viaja siempre: el default del backend es 0 y mandar 0 explícitamente es
		 * inocuo, mientras que omitirla en un flujo rehidratado dejaría al backend leyendo
		 * la hoja 0 de un libro donde el usuario eligió la 2.
		 *
		 * @returns {Number}
		 */
		hoja_para_el_backend() {
			return Number(this.hoja_seleccionada || 0)
		},

		/*
		 * Fila 1-based del encabezado para los endpoints JSON, o null cuando la planilla
		 * no tiene encabezado (ahí el backend usa su detección automática, como siempre).
		 *
		 * @returns {Number|null}
		 */
		header_row_para_el_backend() {
			if (!this.encabezado_fila) {
				return null
			}

			return Number(this.encabezado_fila)
		},

		aplicar_resultado_analisis(resultado) {
			this.excel_path           = resultado.excel_path
			this.column_mapping       = this.normalize_column_mapping(resultado.column_mapping)
			this.selected_provider_id = resultado.provider_id
			this.provider_confidence  = resultado.provider_confidence

			/* Guardar índice de columna provider_code para refresh-provider-stats al cambiar proveedor. */
			const provider_col = resultado.column_mapping.find(
				col => col.system_property === 'codigo_de_proveedor'
			)
			this.provider_code_column_index = provider_col ? provider_col.excel_column_index : null

			/* Datos del preanálisis de duplicados (la recomendación se genera al confirmar el paso 2). */
			this.duplicate_stats = resultado.duplicate_stats || null
			this.preview_rows    = resultado.preview_rows || []

			/* Prompt 03 (grupo 239): estadísticas de números con punto ambiguos por columna. */
			this.formatos_numericos = resultado.formatos_numericos || null

			/* Notas globales de asistencia que Claude generó sobre el archivo completo. */
			this.assistant_notes = resultado.assistant_notes || []

			/* Prompt 06 (grupo 229): placeholders, cadena de identificación y nombres repetidos. */
			this.placeholders           = resultado.placeholders || []
			this.cadena_identificacion  = resultado.cadena_identificacion || null
			this.nombres_duplicados     = resultado.nombres_duplicados || null

			/*
			 * Hoja y encabezado que el backend efectivamente usó. Se muestran en el paso 2
			 * como un renglón fijo: el usuario tiene que poder ver de qué hoja y con qué
			 * fila de encabezado salió el mapeo que está por confirmar, ANTES de importar.
			 *
			 * Las hojas vienen siempre, aunque el libro tenga una sola. Es lo que permite
			 * rearmar el selector después de un F5, cuando el archivo local ya no existe.
			 */
			if (Array.isArray(resultado.hojas) && resultado.hojas.length > 0) {
				this.hojas = resultado.hojas
			}

			this.hoja_elegida_del_backend = resultado.hoja_elegida || null
			this.encabezado_del_backend   = resultado.encabezado_detectado || null

			if (this.hoja_elegida_del_backend && this.hoja_elegida_del_backend.indice !== null && this.hoja_elegida_del_backend.indice !== undefined) {
				/*
				 * El watcher de hoja_seleccionada no rehace nada acá: o el índice ya es el
				 * que estaba leído, o el libro no está en memoria porque esto es una
				 * rehidratación. En los dos casos manda lo que dice el backend.
				 */
				this.hoja_seleccionada = Number(this.hoja_elegida_del_backend.indice)
			}

			if (this.encabezado_del_backend && this.encabezado_del_backend.fila) {
				this.encabezado_fila      = Number(this.encabezado_del_backend.fila)
				this.encabezado_motivo    = this.encabezado_del_backend.motivo || null
				this.encabezado_confianza = this.encabezado_del_backend.confianza || 'alta'
			}

			/*
			 * Columnas que quedaron sin nombre en el encabezado, aun después de propagar las
			 * fusiones. Se muestran como alerta amarilla en el paso 2: si no se pudo
			 * recuperar el nombre, al menos se avisa cuál revisar antes de importar.
			 */
			this.columnas_sin_nombre = Array.isArray(resultado.columnas_sin_nombre)
				? resultado.columnas_sin_nombre
				: []

			/*
			 * Encabezados que cubren más de una columna. Default [] a propósito: una corrida
			 * vieja rehidratada, o un modelo que todavía no mande la clave, no puede romper
			 * el paso 2 — simplemente no muestra el aviso.
			 */
			this.columnas_ambiguas = Array.isArray(resultado.columnas_ambiguas)
				? resultado.columnas_ambiguas
				: []
		},

		/*
		 * Llama al endpoint get-recomendacion con el proveedor confirmado por el usuario
		 * y los stats actualizados, y avanza al paso 3 con la recomendación correcta.
		 */
		confirmar_paso_2() {
			let self = this

			self.loading_recomendacion = true
			self.recomendacion_configuracion = null

			/* Mismo motivo y mismo criterio que run_analyze_request(): ver ese comentario. */
			let token_corrida = ++self.analysis_polling_token

			/* Ídem run_analyze_request(): sin loading global, el estado se muestra en el modal. */
			self.analysis_paso     = 'Generando recomendación con IA…'
			self.analysis_progreso = 0

			self.$api.post('ai-excel-import/get-recomendacion', {
				excel_path:                 self.excel_path,
				provider_id:                self.selected_provider_id,
				provider_code_column_index: self.provider_code_column_index,
				column_mapping:             self.column_mapping,
				/*
				 * uuid del análisis del que salió este paso 2. El backend lo guarda para
				 * que, si el usuario se va y vuelve, se pueda reconstruir el paso 3
				 * completo: la recomendación sola no alcanza, la pantalla también muestra
				 * duplicados, placeholders y cadena de identificación, que son del análisis.
				 */
				analysis_uuid:              self.analysis_uuid,
				/*
				 * La recomendación recorre el Excel de nuevo, así que tiene que leer la
				 * MISMA hoja y con la MISMA fila de encabezado que el análisis. Si acá se
				 * volviera al default (hoja 0, encabezado automático), las estadísticas de
				 * duplicados y de formatos numéricos saldrían de otra planilla que la que
				 * el usuario está mirando.
				 */
				hoja:                       self.hoja_para_el_backend(),
				header_row:                 self.header_row_para_el_backend(),
			}, { timeout: 120000 })
			.then(function(res) {

				/* Punto de chequeo: el .then del POST inicial, antes de llamar al helper. */
				if (token_corrida !== self.analysis_polling_token) return

				self.recomendacion_uuid = res.data.analysis_uuid

				self.$store.commit('excel_analysis/set_corrida', {
					uuid:   res.data.analysis_uuid,
					tipo:   'recomendacion',
					estado: res.data.estado || 'pendiente',
					/* Ídem run_analyze_request(): el módulo desde el vamos. */
					contexto: { model: self.model },
				})

				return self.esperar_analisis_terminado(res.data.analysis_uuid, token_corrida)
				.then(function(resultado) {

					if (token_corrida !== self.analysis_polling_token) return

					self.terminar_seguimiento()
					self.aplicar_resultado_recomendacion(resultado)
					self.step = 3
				})
				.catch(function(mensaje) {

					if (token_corrida !== self.analysis_polling_token) return

					self.terminar_seguimiento()
					self.$toast.error(mensaje)
				})
			})
			.catch(function(err) {

				/* Punto de chequeo: el .catch del POST inicial. */
				if (token_corrida !== self.analysis_polling_token) return

				self.terminar_seguimiento()

				let message = 'Error al generar la recomendación.'
				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}

				self.$toast.error(message)
			})
		},

		/*
		 * Vuelca en el modal el resultado de una corrida de recomendación. Mismo
		 * criterio que aplicar_resultado_analisis(): un solo lugar donde se arma el
		 * paso 3, lo haya esperado el usuario o lo esté reabriendo después.
		 *
		 * @param {Object} resultado  "resultado" tal como lo devuelve la API
		 * @return {void}
		 */
		aplicar_resultado_recomendacion(resultado) {
			this.loading_recomendacion = false

			this.recomendacion_configuracion = resultado.recomendacion_configuracion || null

			/*
			 * Prompt 03 (grupo 239): refrescar formatos_numericos con el recalculo del
			 * backend, por si el usuario corrigió el mapeo de columnas en el paso 2.
			 */
			this.formatos_numericos = resultado.formatos_numericos || null

			/* Actualizar duplicate_stats con los conteos recalculados para el proveedor confirmado. */
			if (this.duplicate_stats) {
				this.duplicate_stats = {
					...this.duplicate_stats,
					provider_codes_existentes_mismo_proveedor:   resultado.provider_codes_existentes_mismo_proveedor,
					provider_codes_existentes_otros_proveedores: resultado.provider_codes_existentes_otros_proveedores,
				}
			}

			/* Preseleccionar los valores recomendados. */
			if (this.recomendacion_configuracion) {

				/*
				 * Grupo 284, prompt 04: politica_colision valida contra los tres valores
				 * nuevos. 'actualizar_uno' es el valor legado (backend, prompt 02): se
				 * traduce a 'saltear_y_reportar', la opción más cercana a su intención
				 * original. Sin un valor reconocido, no se preselecciona nada (igual que
				 * antes, cuando la recomendación no traía un valor válido).
				 */
				let politica_colision_recomendada = this.recomendacion_configuracion.politica_colision
				if (politica_colision_recomendada === 'actualizar_uno') {
					politica_colision_recomendada = 'saltear_y_reportar'
				}
				if (
					politica_colision_recomendada === 'actualizar_todos'
					|| politica_colision_recomendada === 'saltear_y_reportar'
					|| politica_colision_recomendada === 'crear_nuevo'
				) {
					this.politica_colision = politica_colision_recomendada
				}

				/*
				 * Prompt 06 (grupo 265): igual patrón defensivo — si no viene o no es uno
				 * de los dos valores válidos, se deja el default ('ultima_gana').
				 */
				if (
					this.recomendacion_configuracion.politica_intra_archivo === 'ultima_gana'
					|| this.recomendacion_configuracion.politica_intra_archivo === 'productos_distintos'
				) {
					this.politica_intra_archivo = this.recomendacion_configuracion.politica_intra_archivo
				}
			}
		},

		/**
		 * Recalcula provider_codes_existentes_mismo/otros_proveedor cuando el usuario
		 * cambia el proveedor en el paso 2 (stats del /analyze usan el proveedor inferido).
		 */
		refresh_provider_stats() {
			let self = this

			self.$api.post('ai-excel-import/refresh-provider-stats', {
				excel_path:                 self.excel_path,
				provider_code_column_index: self.provider_code_column_index,
				provider_id:                self.selected_provider_id,
				/* Mismo motivo que en get-recomendacion: se recuentan códigos de LA hoja elegida. */
				hoja:                       self.hoja_para_el_backend(),
				header_row:                 self.header_row_para_el_backend(),
			})
			.then(function(res) {
				self.duplicate_stats = {
					...self.duplicate_stats,
					provider_codes_existentes_mismo_proveedor:   res.data.provider_codes_existentes_mismo_proveedor,
					provider_codes_existentes_otros_proveedores: res.data.provider_codes_existentes_otros_proveedores,
				}
			})
			.catch(function(err) {
				console.warn('refresh_provider_stats: error al recalcular stats', err)
			})
		},

		/*
		 * Prompt 05 (grupo 239 - alerta-formatos-numericos-import): true si el valor original
		 * tiene coma y punto a la vez (ej. "1.234,56"). Esos valores no se ven afectados por
		 * ninguna de las tres opciones de interpretacion_punto: el formato ya es inequivoco.
		 *
		 * @param {String|Number} valor - Valor original tal como vino en el Excel.
		 * @returns {Boolean}
		 */
		valor_tiene_coma_y_punto(valor) {
			let texto = String(valor)
			return texto.indexOf(',') !== -1 && texto.indexOf('.') !== -1
		},

		/*
		 * Prompt 05 (grupo 239 - alerta-formatos-numericos-import): aplica en JS, sobre el cliente,
		 * la misma regla que usa el backend (ImportHelper::parseNumericValue) para recalcular como
		 * queda un valor con punto segun la opcion elegida en interpretacion_punto:
		 * - siempre_miles: el punto siempre separa miles, se sacan todos los puntos.
		 * - siempre_decimal: el punto siempre es decimal, se deja el valor tal cual (parseado).
		 * - auto: separador de miles solo si el punto separa grupos de exactamente 3 digitos;
		 *   si no, decimal.
		 *
		 * @param {String|Number} valor - Valor original tal como vino en el Excel.
		 * @returns {String} - Valor recalculado, listo para mostrar en la vista previa.
		 */
		recalcular_resultado_interpretacion_punto(valor) {
			let texto = String(valor)

			/* Los valores con coma y punto juntos no se ven afectados por ninguna opcion. */
			if (this.valor_tiene_coma_y_punto(texto)) {
				return texto
			}

			if (this.interpretacion_punto === 'siempre_miles') {
				return texto.split('.').join('')
			}

			if (this.interpretacion_punto === 'siempre_decimal') {
				return this.formatear_como_decimal(texto)
			}

			/* auto: separador de miles solo si el punto separa grupos de exactamente 3 digitos. */
			let es_separador_de_miles = /^-?\d{1,3}(\.\d{3})+$/.test(texto)
			return es_separador_de_miles ? texto.split('.').join('') : this.formatear_como_decimal(texto)
		},

		/*
		 * Prompt 05 (grupo 239 - alerta-formatos-numericos-import): interpreta el valor como
		 * numero decimal (parseFloat, que descarta ceros finales igual que un float real) y lo
		 * formatea con coma como separador decimal, como el resto del sistema.
		 *
		 * @param {String} texto - Valor original con punto.
		 * @returns {String} - Valor formateado con coma decimal, o el texto original si no es numerico.
		 */
		formatear_como_decimal(texto) {
			let numero = parseFloat(texto)

			if (isNaN(numero)) {
				return texto
			}

			return numero.toString().replace('.', ',')
		},

		/**
		 * Traduce las decisiones de negocio (politica_colision y politica_otro_proveedor)
		 * a los 5 flags que sigue esperando /ai-excel-import/import.
		 * Permite mantener el contrato del backend sin cambios.
		 *
		 * @returns {Object} - Objeto con los 5 flags calculados (0 o 1 cada uno).
		 */
		derive_flags_from_choice() {
			/*
			 * Grupo 284, prompt 04 (30/7/2026): hasta este cambio, actualizar_por_provider_code
			 * solo se encendía cuando el usuario elegía explícitamente "código de proveedor"
			 * como clave de identidad — elegir cualquier otra clave (o no elegir nada) lo
			 * apagaba en silencio, y esas filas terminaban creando un artículo nuevo en vez de
			 * actualizar el existente. La clave de identidad ya no existe como pregunta (la
			 * jerarquía de identificación es fija, ver el prompt 03 de empresa-api): ahora
			 * identificar por código de proveedor es el comportamiento DEFAULT, salvo que el
			 * usuario elija explícitamente "No identificar por código de proveedor"
			 * (politica_colision === 'crear_nuevo'). NO volver a poner este default en 0 "por
			 * las dudas": eso es exactamente el bug que este prompt vino a arreglar.
			 */
			let flags = {
				permitir_provider_code_repetido: 0,
				permitir_provider_code_repetido_en_multi_providers: 0,
				actualizar_articulos_de_otro_proveedor: 0,
				actualizar_por_provider_code: 1,
				actualizar_proveedor: 0,
			}

			/* La política politica_otro_proveedor controla si se actualizan artículos de otros proveedores. */
			if (this.politica_otro_proveedor === 'actualizar') {
				flags.actualizar_articulos_de_otro_proveedor = 1
			}

			if (this.politica_colision === 'actualizar_todos') {
				flags.permitir_provider_code_repetido = 1
				flags.permitir_provider_code_repetido_en_multi_providers = 1

			} else if (this.politica_colision === 'crear_nuevo') {
				flags.actualizar_por_provider_code = 0
			}
			/*
			 * 'saltear_y_reportar' y el caso sin valor (la pregunta todavía no se mostró, por
			 * ejemplo porque no hay filas que se identifiquen por código de proveedor) dejan
			 * actualizar_por_provider_code=1 con permitir_provider_code_repetido=0: es
			 * justamente la combinación que produce AmbiguousMatch en
			 * ArticleIndexCache::find_with_index() cuando el código coincide con más de un
			 * artículo — la fila se saltea y queda reportada.
			 */

			return flags
		},

		/*
		 * Lanza la importación de artículos usando el mapeo confirmado por el usuario.
		 * Cierra el modal al recibir respuesta exitosa del backend.
		 */
		importar() {
			if (this.create_and_edit === null) {
				this.$toast.error('Indicá las operaciones a realizar')
				return
			}

			if (!this.can_start_import) {
				this.$toast.error('Indicá un rango de filas válido (inicio y última fila)')
				return
			}

			this.error_message = ''
			this.loading = true

			this.$store.commit('auth/setMessage', 'Iniciando importación...')
			this.$store.commit('auth/setLoading', true)

			/* Traducir las decisiones de negocio del paso 3 a los flags que espera el backend. */
			let derived_flags = this.derive_flags_from_choice()

			this.$api.post('ai-excel-import/import', {
				model:           this.model,
				excel_path:      this.excel_path,
				columns:         this.build_columns(),
				provider_id:     this.selected_provider_id,
				create_and_edit: this.create_and_edit,
				start_row:       Number(this.start_row),
				finish_row:      Number(this.finish_row),
				/*
				 * Hoja a importar. Se manda siempre (el default del backend es 0, así que
				 * es inocuo para un libro de una sola hoja) porque acá no importa el
				 * tamaño del request: importa que la hoja que se vuelca al CSV sea la misma
				 * sobre la que se calcularon start_row y finish_row.
				 *
				 * /import NO recibe header_row a propósito: la importación real se rige por
				 * start_row, que el usuario ve y controla en pantalla. Dos fuentes de verdad
				 * ahí serían el próximo bug.
				 */
				hoja:            this.hoja_para_el_backend(),
				/* Campos específicos de artículos (ignorados por el backend para client/provider). */
				registrar_art_cre: true,
				registrar_art_act: true,
				/*
				 * Misión costo-bruto-por-condicion-fiscal (20/8/2026): cómo interpretar el costo de
				 * cada fila, bruto (con IVA adentro) o neto. Se manda SIEMPRE, incluso apagado: si
				 * la clave no viaja, el backend cae en su default y un cambio de default del otro
				 * lado le cambia el costeo a este flujo sin que nadie lo haya declarado acá.
				 *
				 * Acá sí va como booleano real porque este endpoint recibe JSON. En el import
				 * clásico viaja como 1/0, que es lo único seguro en un FormData (todo se serializa
				 * a string y `(bool) 'false'` en PHP da TRUE).
				 */
				precios_incluyen_iva: this.model === 'article' && Number(this.precios_incluyen_iva) === 1,
				permitir_provider_code_repetido:                    derived_flags.permitir_provider_code_repetido,
				permitir_provider_code_repetido_en_multi_providers: derived_flags.permitir_provider_code_repetido_en_multi_providers,
				actualizar_articulos_de_otro_proveedor:             derived_flags.actualizar_articulos_de_otro_proveedor,
				actualizar_por_provider_code:                       derived_flags.actualizar_por_provider_code,
				actualizar_proveedor:                               derived_flags.actualizar_proveedor,
				/* Prompt 05 (grupo 239): como interpretar el punto en numeros ambiguos, elegido en el paso 3. */
				interpretacion_punto:                               this.interpretacion_punto,
				/*
				 * Prompt 06 (grupo 265): decisión sobre códigos de proveedor repetidos DENTRO del
				 * propio Excel. Se manda siempre, incluso cuando la pregunta no se mostró: el
				 * backend tiene el mismo default ('ultima_gana'), así que es inocuo.
				 */
				filas_repetidas_del_archivo:                        this.politica_intra_archivo || 'ultima_gana',
			})
			.then(() => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				this.$bvModal.hide(this.modal_id)

				this.$toast.success(
					'La importación está en proceso. Te avisaremos cuando termine.',
					{ duration: 7000 }
				)
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				let message = 'Error al iniciar la importación.'

				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}

				this.error_message = message
			})
		},

		/*
		 * Alinea claves del mapeo IA con las que usa el importador de artículos en el backend.
		 *
		 * @param {string|null} system_property Propiedad elegida en el select de mapeo.
		 * @return {string|null} Clave canónica o null si se ignora la columna.
		 */
		normalize_system_property_key(system_property) {
			if (system_property === null || system_property === '') {
				return null
			}

			let property_aliases = {
				codigo_proveedor:  'codigo_de_proveedor',
				codigo_barras:     'codigo_de_barras',
				moneda:            'costo_en_dolares',
			}

			if (property_aliases[system_property]) {
				return property_aliases[system_property]
			}

			return system_property
		},

		/*
		 * Devuelve una etiqueta amigable para una propiedad del sistema, incluyendo
		 * las propiedades codificadas de depósitos (address_{id}_{sub_tipo}) y listas
		 * de precio (price_type_{id}_{sub_tipo}). Para propiedades planas conocidas
		 * usa el diccionario estático; si no la reconoce devuelve el valor crudo.
		 *
		 * @param {string|null} system_property - Propiedad a etiquetar.
		 * @returns {string} - Etiqueta legible para mostrar en la UI.
		 */
		get_property_label(system_property) {
			if (system_property === null || system_property === '') {
				return ''
			}

			/* Propiedad codificada de depósito: address_{id}_{amount|min|max}. */
			let address_match = system_property.match(/^address_(\d+)_(amount|min|max)$/)
			if (address_match) {
				const address_id = parseInt(address_match[1])
				const sub_type   = address_match[2]
				const address    = this.addresses.find(a => a.id === address_id)
				if (address) {
					if (sub_type === 'amount') return 'Stock: ' + address.street
					if (sub_type === 'min')    return 'Stock mín: ' + address.street
					if (sub_type === 'max')    return 'Stock máx: ' + address.street
				}
				return system_property
			}

			/* Propiedad codificada de lista de precio: price_type_{id}_{final_price|percentage|setear}. */
			let pt_match = system_property.match(/^price_type_(\d+)_(final_price|percentage|setear)$/)
			if (pt_match) {
				const pt_id    = parseInt(pt_match[1])
				const sub_type = pt_match[2]
				const pt       = this.price_types.find(p => p.id === pt_id)
				if (pt) {
					if (sub_type === 'final_price') return '$ Final: ' + pt.name
					if (sub_type === 'percentage')  return '%: ' + pt.name
					if (sub_type === 'setear')      return 'Setear: ' + pt.name
				}
				return system_property
			}

			/* Diccionario de etiquetas para propiedades planas conocidas. */
			const labels = {
				numero:               'Número',
				nombre:               'Nombre',
				codigo_de_barras:     'Cód. barras',
				sku:                  'SKU',
				codigo_de_proveedor:  'Cód. proveedor',
				costo:                'Costo',
				precio:               'Precio',
				iva:                  'IVA',
				margen_de_ganancia:   'Margen',
				categoria:            'Categoría',
				sub_categoria:        'Sub categoría',
				marca:                'Marca',
				descripcion:          'Descripción',
				stock_actual:         'Stock',
				descuentos:           'Descuentos',
				recargos:             'Recargos',
				proveedor:            'Proveedor',
				// propiedades nuevas de artículo
				costo_en_dolares:       'Costo en USD',
				aplicar_iva:            'Aplicar IVA',
				medida:                 'Medida',
				contenido:              'Contenido',
				unidad_medida:          'Unidad medida',
				u_individuales:         'U. individuales',
				descuentos_montos:      'Desc. (montos)',
				recargos_montos:        'Recarg. (montos)',
				in_offer:               'En oferta',
				online:                 'Activo',
				precio_pausado:         'Precio pausado',
				disponible_tienda_nube: 'Tienda Nube',
				// cliente
				telefono:             'Teléfono',
				email:                'Email',
				direccion:            'Dirección',
				localidad:            'Localidad',
				provincia:            'Provincia',
				cuit:                 'CUIT',
				cuil:                 'CUIL',
				dni:                  'DNI',
				razon_social:         'Razón social',
				numero:               'Número',
				vendedor:             'Vendedor',
				sucursal:             'Sucursal',
				condicion_frente_al_iva: 'Cond. IVA',
				tipo_de_precio:       'Tipo precio',
				saldo_actual:         'Saldo',
				// proveedor
				observaciones:        'Observaciones',
			}

			return labels[system_property] || system_property
		},

		/*
		 * Transforma el column_mapping al formato que espera InitExcelImport.
		 * Genera un objeto { system_property: 0-indexed-position } descartando
		 * las columnas marcadas como "Ignorar columna" (system_property === null).
		 * Las propiedades codificadas de depósitos y listas de precio se traducen
		 * a los nombres internos planos que espera ProcessRow.
		 */
		build_columns() {
			let columns = {}

			this.column_mapping.forEach((item, index) => {
				let system_property = this.normalize_system_property_key(item.system_property)
				if (system_property === null) {
					return
				}

				/*
				 * Posición real en el Excel (0-based); el backend la envía como excel_column_index.
				 */
				let column_position = index
				if (typeof item.excel_column_index === 'number') {
					column_position = item.excel_column_index
				}

				/* Traducir propiedades codificadas de depósitos a las claves planas de ProcessRow. */
				let address_match = system_property.match(/^address_(\d+)_(amount|min|max)$/)
				if (address_match) {
					const address_id = parseInt(address_match[1])
					const sub_type   = address_match[2]
					const address    = this.addresses.find(a => a.id === address_id)
					if (address) {
						const street_key = address.street.toLowerCase().replace(/\s+/g, '_')
						if (sub_type === 'amount') columns[street_key]          = column_position
						if (sub_type === 'min')    columns['min_' + street_key] = column_position
						if (sub_type === 'max')    columns['max_' + street_key] = column_position
					}
					return
				}

				/* Traducir propiedades codificadas de listas de precio a las claves planas de ProcessRow. */
				let pt_match = system_property.match(/^price_type_(\d+)_(final_price|percentage|setear)$/)
				if (pt_match) {
					const pt_id    = parseInt(pt_match[1])
					const sub_type = pt_match[2]
					const pt       = this.price_types.find(p => p.id === pt_id)
					if (pt) {
						const name_key = pt.name.toLowerCase().replace(/\s+/g, '_')
						if (sub_type === 'final_price') columns['$_final_' + name_key]             = column_position
						if (sub_type === 'percentage')  columns['%_' + name_key]                   = column_position
						if (sub_type === 'setear')      columns['setear_precio_final_' + name_key] = column_position
					}
					return
				}

				/* Propiedad plana normal. */
				columns[system_property] = column_position
			})

			/*
			 * Respaldo: si quedó solo descripcion en el mapeo, usar esa columna como nombre.
			 */
			if (typeof columns.nombre === 'undefined' && typeof columns.descripcion !== 'undefined') {
				columns.nombre = columns.descripcion
				delete columns.descripcion
			}

			return columns
		},

		/*
		 * Asegura tipos consistentes en cada ítem del mapeo recibido del análisis.
		 */
		normalize_column_mapping(column_mapping) {
			if (!Array.isArray(column_mapping)) {
				return []
			}

			let normalized = []

			column_mapping.forEach((item, index) => {
				if (!item) {
					return
				}

				let confidence = parseFloat(item.confidence)
				if (isNaN(confidence)) {
					confidence = 0
				}
				confidence = Math.max(0, Math.min(1, confidence))

				let excel_column_index = index
				if (typeof item.excel_column_index === 'number') {
					excel_column_index = item.excel_column_index
				}

				let interpretation_note = item.interpretation_note
				if (typeof interpretation_note === 'string') {
					interpretation_note = interpretation_note.trim()
					if (interpretation_note === '') {
						interpretation_note = null
					}
				} else {
					interpretation_note = null
				}

				normalized.push({
					excel_column:        item.excel_column || '',
					system_property:     this.normalize_system_property_key(item.system_property),
					confidence:          confidence,
					interpretation_note: interpretation_note,
					excel_column_index:  excel_column_index,
					excel_column_letter: item.excel_column_letter || this.number_to_excel_column(excel_column_index + 1),
				})
			})

			return normalized
		},

		/*
		 * Letra de columna Excel para mostrar en la tabla (A, B, C…).
		 */
		excel_column_letter_label(item, index) {
			if (item && item.excel_column_letter) {
				return item.excel_column_letter
			}

			let column_index = index
			if (item && typeof item.excel_column_index === 'number') {
				column_index = item.excel_column_index
			}

			return this.number_to_excel_column(column_index + 1)
		},

		/*
		 * True si esta fila del mapeo cae en un encabezado que cubre más de una columna.
		 * Sirve para marcarla con el icono de aviso al lado de la letra.
		 */
		columna_es_ambigua(item, index) {
			if (this.letras_de_columnas_ambiguas.length === 0) {
				return false
			}

			return this.letras_de_columnas_ambiguas.indexOf(this.excel_column_letter_label(item, index)) !== -1
		},

		/*
		 * Texto completo para el tooltip: "A — CODIGO".
		 */
		excel_column_full_label(item, index) {
			let letter = this.excel_column_letter_label(item, index)
			let header = (item && item.excel_column) ? item.excel_column : ''

			return letter + ' — ' + header
		},

		/*
		 * Convierte índice 1-based a letra de columna (mismo criterio que import manual).
		 */
		number_to_excel_column(column_number) {
			let column_letter = ''
			let n = column_number

			while (n > 0) {
				let remainder = (n - 1) % 26
				column_letter = String.fromCharCode(65 + remainder) + column_letter
				n = Math.floor((n - 1) / 26)
			}

			return column_letter
		},

		/*
		 * Porcentaje redondeado para la columna Confianza (0%–100%).
		 */
		format_column_confidence(confidence) {
			let value = parseFloat(confidence)
			if (isNaN(value)) {
				return '—'
			}

			return Math.round(value * 100) + '%'
		},

		/*
		 * Clases de resaltado por fila: ignorada (violeta) tiene prioridad sobre baja confianza (amarillo).
		 */
		mapping_row_highlight_class(item) {
			if (this.column_mapping_is_ignored(item)) {
				return {
					'ai-import-mapping-block--ignored': true,
				}
			}

			if (this.column_has_interpretation_note(item)) {
				return {
					'ai-import-mapping-block--interpretation': true,
				}
			}

			return {
				'ai-import-mapping-block--warning': this.column_confidence_is_low(item.confidence),
			}
		},

		/*
		 * True si la IA dejó una nota para que el usuario valide el mapeo (p. ej. Descripción → nombre).
		 */
		column_has_interpretation_note(item) {
			if (!item || !item.interpretation_note) {
				return false
			}

			return String(item.interpretation_note).trim() !== ''
		},

		/*
		 * True si el usuario eligió "Ignorar columna" (system_property null).
		 */
		column_mapping_is_ignored(item) {
			return item && (item.system_property === null || item.system_property === '')
		},

		/*
		 * Confianza baja: menos del 70% (fila resaltada en amarillo).
		 */
		column_confidence_is_low(confidence) {
			let value = parseFloat(confidence)
			if (isNaN(value)) {
				return true
			}

			return value < 0.7
		},

		/*
		 * Clase de color según el nivel de confianza del mapeo.
		 */
		column_confidence_text_class(confidence) {
			let value = parseFloat(confidence)
			if (isNaN(value)) {
				return 'text-muted'
			}

			if (value >= 0.7) {
				return 'text-success'
			}

			if (value >= 0.4) {
				return 'text-warning'
			}

			return 'text-danger'
		},

		/*
		 * Descripción para el atributo title del porcentaje de confianza.
		 */
		column_confidence_title(confidence) {
			let value = parseFloat(confidence)
			if (isNaN(value)) {
				return 'Sin dato de confianza'
			}

			if (value >= 0.7) {
				return 'Confianza alta'
			}

			if (value >= 0.4) {
				return 'Confianza media — conviene revisar'
			}

			return 'Confianza baja — revisar el mapeo'
		},

		/*
		 * Deja de seguir la corrida desde este componente. Se llama al cerrar el
		 * modal (@hide: ESC, clic afuera o cierre explícito) y al destruirlo
		 * (navegación fuera de la vista).
		 *
		 * 🔴 SOLTAR NO ES CANCELAR, y este método se llamaba cancelar_analisis_en_curso().
		 * El nombre viejo describía la intención del grupo 299 pero nunca describió lo
		 * que pasaba del otro lado: la corrida es un job en un worker y nadie la
		 * cancelaba nunca; lo único que se cancelaba era el polling, y con él se tiraba
		 * a la basura un resultado que el servidor iba a terminar igual, minutos
		 * después, sin que nadie lo consumiera. Esa era la razón de fondo por la que
		 * cerrar el modal se sentía como perder el trabajo hecho.
		 *
		 * Ahora el resultado se recupera por el aviso que manda el job al terminar, así
		 * que soltar el polling no cuesta nada: es simplemente dejar de preguntar.
		 *
		 * Sigue haciendo lo mismo que hacía, y por los mismos motivos:
		 * 1. invalida el token vigente, de modo que cualquier request ya en vuelo
		 *    — el POST inicial incluido — quede huérfano al volver;
		 * 2 y 3. limpia los timers pendientes (polling y aviso de archivo grande);
		 * 4. apaga los flags locales SIN depender de que la Promise en curso se
		 *    resuelva o rechace, porque una vez soltada no va a hacer ninguna de las dos.
		 */
		soltar_seguimiento_del_analisis() {
			this.analysis_polling_token++

			if (this.analysis_polling_timer_id) {
				clearTimeout(this.analysis_polling_timer_id)
				this.analysis_polling_timer_id = null
			}

			if (this.analysis_warning_timer_id) {
				clearTimeout(this.analysis_warning_timer_id)
				this.analysis_warning_timer_id = null
			}

			this.loading = false
			this.loading_recomendacion = false
			this.analysis_paso = ''
			this.analysis_progreso = 0
			this.analysis_es_archivo_grande = false

			/*
			 * Deja de estar mirando la corrida: desde acá en adelante, si termina, el
			 * aviso sí le tiene que llegar — es el punto entero del cambio.
			 */
			this.$store.commit('excel_analysis/set_siguiendo_uuid', null)
		},

		/*
		 * Cierra el seguimiento de una corrida que YA terminó: limpia los timers y
		 * los indicadores, sin tocar el token.
		 *
		 * La diferencia con soltar_seguimiento_del_analisis() es justamente el token,
		 * y no es un detalle: el token es del caller, que lo vuelve a chequear en el
		 * callback que consume el resultado. Invalidarlo acá dejaría huérfano a ese
		 * mismo callback — es el bug que dejaba el modal clavado en "Analizando el
		 * archivo con IA... (40%)" para siempre (grupo 303, 1/8/2026).
		 */
		terminar_seguimiento() {
			if (this.analysis_warning_timer_id) {
				clearTimeout(this.analysis_warning_timer_id)
				this.analysis_warning_timer_id = null
			}

			this.loading = false
			this.loading_recomendacion = false
			this.analysis_paso = ''
			this.analysis_progreso = 0
			this.analysis_es_archivo_grande = false

			/*
			 * La corrida terminó con el usuario mirando, así que ya se enteró: se marca
			 * vista. Sin esto, la próxima vez que cargue la SPA le volveríamos a
			 * ofrecer, como novedad, el análisis que acaba de ver terminar.
			 *
			 * Vale también cuando terminó con error: el error se lo mostró esta misma
			 * pantalla. Si nunca hubo corrida (falló el POST inicial), no hay uuid y
			 * esto no hace nada.
			 */
			const siguiendo_uuid = this.$store.state.excel_analysis.siguiendo_uuid

			this.$store.commit('excel_analysis/set_siguiendo_uuid', null)

			if (siguiendo_uuid) {
				this.$store.dispatch('excel_analysis/marcar_visto', siguiendo_uuid)
			}
		},

		/*
		 * Reabre el modal en el estado en que quedó una corrida, sin el archivo local
		 * y sin nada guardado en memoria del navegador. Es lo que ejecuta el botón
		 * "Ver resultado" del aviso.
		 *
		 * Para una corrida de análisis alcanza con su propio resultado (paso 2). Para
		 * una recomendación hacen falta las dos: primero el análisis padre, que es de
		 * donde salen duplicados, placeholders y cadena de identificación, y recién
		 * encima la recomendación (paso 3).
		 *
		 * @param {Object} orden  { uuid, tipo } de la corrida a abrir
		 * @return {void}
		 */
		abrir_desde_corrida(orden) {
			let self = this

			if (!orden || !orden.uuid) {
				return
			}

			/* Empezamos de cero: puede haber quedado estado de una importación anterior. */
			self.reset()
			self.loading = true

			/*
			 * Misma disciplina de token que el resto del componente, y por el mismo
			 * motivo: entre este GET y su respuesta el usuario puede cerrar el modal.
			 * Sin el chequeo, la respuesta llegaría igual y dejaría el modal cerrado
			 * parado en el paso 2 — de modo que la próxima vez que lo abriera se
			 * encontraría con el resumen de una importación que ya había descartado.
			 *
			 * Se captura DESPUÉS del reset(), que es quien incrementa el token.
			 */
			let token_corrida = self.analysis_polling_token

			self.$api.get('ai-excel-import/analysis/' + orden.uuid, { timeout: 30000 })
			.then(function(res) {

				if (token_corrida !== self.analysis_polling_token) return

				/*
				 * El usuario está viendo el resultado (o el error): la corrida deja de
				 * ser una novedad pendiente. Se marca acá, una sola vez, para los tres
				 * desenlaces de abajo.
				 */
				if (res.data.estado === 'listo' || res.data.estado === 'error') {
					self.$store.dispatch('excel_analysis/marcar_visto', orden.uuid)
				}

				if (res.data.estado === 'error') {
					self.loading = false
					self.error_message = res.data.error || 'Ocurrió un error al analizar el archivo.'
					return
				}

				/*
				 * La corrida todavía está trabajando. Puede pasar: el usuario abre el
				 * modal por su cuenta mientras el análisis corre, o el aviso llega justo
				 * cuando ya estaba mirando. Se muestra el paso 1 siguiéndola en vivo.
				 */
				if (res.data.estado !== 'listo') {
					self.retomar_seguimiento(orden.uuid, res.data)
					return
				}

				if (res.data.tipo !== 'recomendacion') {
					self.analysis_uuid = orden.uuid
					self.aplicar_contexto_analisis(res.data.contexto)
					self.aplicar_resultado_analisis(res.data.resultado)
					self.loading = false
					self.step = 2
					return
				}

				/* Recomendación: hay que traer también el análisis del que salió. */
				const contexto = res.data.contexto || {}

				if (!contexto.analysis_uuid) {
					/*
					 * Recomendación sin análisis padre: son las corridas encoladas antes de
					 * este cambio, que no guardaban el uuid. No hay forma de rearmar el paso
					 * 3 con lo que quedó, así que se dice y se empieza de nuevo — es un caso
					 * que se apaga solo en 48 horas, cuando la limpieza se lleve esas corridas.
					 */
					self.loading = false
					self.error_message = 'Este análisis es de una versión anterior y no se puede reabrir. Volvé a subir el archivo.'
					return
				}

				self.recomendacion_uuid = orden.uuid

				self.$api.get('ai-excel-import/analysis/' + contexto.analysis_uuid, { timeout: 30000 })
				.then(function(res_analisis) {

					if (token_corrida !== self.analysis_polling_token) return

					if (res_analisis.data.estado !== 'listo') {
						self.loading = false
						self.error_message = 'No se pudo recuperar el análisis original. Volvé a subir el archivo.'
						return
					}

					self.analysis_uuid = contexto.analysis_uuid
					self.aplicar_contexto_analisis(res_analisis.data.contexto)
					self.aplicar_resultado_analisis(res_analisis.data.resultado)

					/*
					 * Encima del paso 2 va lo que el usuario había confirmado a mano antes de
					 * pedir la recomendación: si eligió otro proveedor o corrigió el mapeo, eso
					 * es lo que vale, no lo que había inferido la IA.
					 */
					if (contexto.provider_id) {
						self.selected_provider_id = contexto.provider_id
					}
					if (contexto.provider_code_column_index !== null && contexto.provider_code_column_index !== undefined) {
						self.provider_code_column_index = contexto.provider_code_column_index
					}
					if (contexto.column_mapping && contexto.column_mapping.length) {
						self.column_mapping = self.normalize_column_mapping(contexto.column_mapping)
					}

					self.aplicar_resultado_recomendacion(res.data.resultado)
					self.loading = false
					self.step = 3
				})
				.catch(function() {
					if (token_corrida !== self.analysis_polling_token) return

					self.loading = false
					self.error_message = 'No se pudo recuperar el análisis original. Volvé a subir el archivo.'
				})
			})
			.catch(function() {
				if (token_corrida !== self.analysis_polling_token) return

				self.loading = false
				self.error_message = 'No se pudo recuperar el análisis. Volvé a subir el archivo.'
			})
		},

		/*
		 * Restituye el rango de filas y la detección de cabecera que el navegador
		 * había calculado al elegir el archivo. Sin esto, un modal reabierto
		 * importaría con los defaults (fila 2 a la 1000) en vez de con el rango real
		 * del Excel, que es de las pocas cosas de este flujo que fallan en silencio.
		 *
		 * @param {Object} contexto  "contexto" tal como lo devuelve la API
		 * @return {void}
		 */
		aplicar_contexto_analisis(contexto) {
			if (!contexto) {
				return
			}

			if (contexto.start_row) {
				this.start_row = contexto.start_row
			}

			if (contexto.finish_row) {
				this.finish_row = contexto.finish_row
				this.finish_row_original = contexto.finish_row
			}

			if (contexto.has_header_row !== null && contexto.has_header_row !== undefined) {
				/* Viaja como 1/0 en el multipart del análisis. */
				this.has_header_row = contexto.has_header_row == 1
			}

			/*
			 * Hoja y fila de encabezado con las que se encoló la corrida. Sin esto, un modal
			 * reabierto después de un F5 volvería a la hoja 0 y a la detección automática,
			 * y las llamadas siguientes (get-recomendacion, refresh-provider-stats, import)
			 * leerían una planilla distinta de la que el usuario ve en pantalla.
			 */
			if (contexto.hoja !== null && contexto.hoja !== undefined) {
				this.hoja_seleccionada = Number(contexto.hoja)
			}

			if (contexto.hoja_nombre) {
				/*
				 * Sin el libro en memoria las hojas no se pueden listar, pero el nombre
				 * alcanza para que el paso 2 diga de qué hoja salió el mapeo.
				 */
				this.hoja_elegida_del_backend = {
					indice: contexto.hoja !== null && contexto.hoja !== undefined ? Number(contexto.hoja) : 0,
					nombre: contexto.hoja_nombre,
				}
			}

			if (contexto.header_row) {
				this.encabezado_fila = Number(contexto.header_row)
				/*
				 * Viene de una corrida ya encolada: es una decisión tomada, no una
				 * detección para volver a pisar.
				 */
				this.encabezado_manualmente_corregido = true
			}
		},

		/*
		 * Vuelve a engancharse a una corrida que sigue trabajando, mostrando el paso 1
		 * con su progreso. Se usa al reabrir el modal sobre un análisis en curso.
		 *
		 * @param {string} uuid          uuid de la corrida
		 * @param {Object} estado_actual  última respuesta de /analysis/{uuid}
		 * @return {void}
		 */
		retomar_seguimiento(uuid, estado_actual) {
			let self = this

			self.loading = true
			self.analysis_paso     = estado_actual.paso || 'Analizando el archivo con IA…'
			self.analysis_progreso = estado_actual.progreso || 0

			const es_recomendacion = estado_actual.tipo === 'recomendacion'

			if (es_recomendacion) {
				self.recomendacion_uuid = uuid
			} else {
				self.analysis_uuid = uuid
			}

			self.aplicar_contexto_analisis(estado_actual.contexto)

			/* Mismo criterio de token que los dos POST: se captura antes de esperar. */
			let token_corrida = ++self.analysis_polling_token

			self.esperar_analisis_terminado(uuid, token_corrida)
			.then(function(resultado) {

				if (token_corrida !== self.analysis_polling_token) return

				self.terminar_seguimiento()

				if (es_recomendacion) {
					/*
					 * Una recomendación que termina mientras la miramos necesita el paso 2
					 * armado abajo, y eso vive en el análisis padre: se rearma todo desde
					 * cero por el camino de siempre, que ya sabe hacerlo.
					 */
					self.abrir_desde_corrida({ uuid: uuid, tipo: 'recomendacion' })
					return
				}

				self.aplicar_resultado_analisis(resultado)
				self.step = 2
			})
			.catch(function(mensaje) {

				if (token_corrida !== self.analysis_polling_token) return

				self.terminar_seguimiento()
				self.error_message = mensaje
			})
		},

		/*
		 * Cierra el modal dejando la corrida trabajando. El aviso de que terminó
		 * llega solo, por broadcast.
		 */
		seguir_en_segundo_plano() {
			this.$bvModal.hide(this.modal_id)
		},

		/*
		 * Toma la orden de apertura que dejó el aviso, si es para esta instancia del
		 * modal, y la ejecuta.
		 *
		 * El chequeo de model no es decorativo: de este componente hay tres instancias
		 * vivas al mismo tiempo (artículos, clientes y proveedores), cada una con su
		 * propio id de modal. Sin el filtro, un análisis de clientes abriría también
		 * el modal de artículos.
		 *
		 * @return {void}
		 */
		consumir_orden_de_apertura() {
			const orden = this.$store.state.excel_analysis.abrir_en

			if (!orden || !orden.uuid) {
				return
			}

			if ((orden.model || 'article') !== this.model) {
				return
			}

			/* Se consume una sola vez: si no, cada reapertura del modal la repetiría. */
			this.$store.commit('excel_analysis/set_abrir_en', null)

			/*
			 * Primero se arranca la carga y recién después se muestra el modal, no al
			 * revés: mostrarlo dispara @show, y @show también intenta retomar la
			 * corrida en curso. Con la carga ya arrancada, esa segunda vía se ve a sí
			 * misma ocupada y no hace nada, en vez de largar un segundo pedido en
			 * paralelo por la misma corrida.
			 */
			this.abrir_desde_corrida(orden)
			this.$bvModal.show(this.modal_id)
		},

		/*
		 * Al abrir el modal a mano (menú → Importar con IA) con una corrida todavía
		 * trabajando, se retoma esa corrida en lugar de mostrar el paso 1 vacío.
		 *
		 * Sin esto, el usuario que se cansó de esperar y volvió a entrar vería un
		 * formulario limpio, subiría el mismo archivo otra vez y pondría un segundo
		 * análisis pesado en la misma cola que el primero — que es exactamente el
		 * escenario que hace que los dos tarden el doble.
		 *
		 * @return {void}
		 */
		on_show() {
			/* Ya hay una apertura dirigida en marcha (ver consumir_orden_de_apertura). */
			if (this.loading || this.loading_recomendacion) {
				return
			}

			if (!this.$store.getters['excel_analysis/hay_corrida_en_curso']) {
				return
			}

			const corrida = this.$store.state.excel_analysis.corrida
			const contexto = corrida.contexto || {}

			/* Una corrida de clientes no tiene nada que hacer en el modal de artículos. */
			if ((contexto.model || 'article') !== this.model) {
				return
			}

			this.abrir_desde_corrida({ uuid: corrida.uuid, tipo: corrida.tipo })
		},

		/*
		 * Resetea el estado del modal al cerrarlo para que la próxima vez
		 * empiece desde el paso 1 limpio.
		 *
		 * Lo que NO hace es tocar la corrida del servidor: si había un análisis
		 * trabajando, sigue trabajando y va a avisar cuando termine. Limpiar la
		 * pantalla y abandonar el trabajo dejaron de ser la misma cosa.
		 */
		reset() {
			this.soltar_seguimiento_del_analisis()

			this.analysis_uuid     = null
			this.recomendacion_uuid = null
			this.step          = 1
			this.file          = null
			this.file_processing = false
			this.start_row     = 2
			this.finish_row    = ''
			this.finish_row_original = ''
			this.excel_rows_read_error = ''
			this.loading       = false
			this.error_message = ''
			this.excel_path    = null
			this.column_mapping = []
			this.selected_provider_id = null
			this.provider_confidence  = 'bajo'
			this.create_and_edit      = null
			this.precios_incluyen_iva = 0
			this.actualizar_articulos_de_otro_proveedor = 1
			this.permitir_provider_code_repetido = 0
			this.permitir_provider_code_repetido_en_multi_providers = 0
			this.actualizar_por_provider_code = 0
			this.actualizar_proveedor = 0
			this.has_header_row = true
			this.header_row_manually_overridden = false
			/* Hoja elegida y encabezado detectado: todo lo nuevo vuelve a cero. */
			this.hojas                       = []
			this.hoja_seleccionada           = null
			this.hoja_leida                  = null
			this.workbook_cache              = null
			this.encabezado_fila             = null
			this.encabezado_motivo           = null
			this.encabezado_confianza        = 'alta'
			this.encabezado_manualmente_corregido = false
			this.columnas_sin_nombre         = []
			this.columnas_ambiguas           = []
			this.hoja_elegida_del_backend    = null
			this.encabezado_del_backend      = null
			this.duplicate_stats             = null
			this.provider_code_column_index  = null
			this.recomendacion_configuracion = null
			this.loading_recomendacion       = false
			this.politica_colision           = null
			this.politica_otro_proveedor     = null
			this.politica_intra_archivo      = 'ultima_gana'
			this.preview_rows                = []
			this.assistant_notes             = []
			this.placeholders                = []
			this.cadena_identificacion       = null
			this.nombres_duplicados          = null
			this.interpretacion_punto        = 'auto'
		},

	},

	/*
	 * Al montar el modal aseguramos que los depósitos y listas de precio estén
	 * cargados en el store, ya que el dropdown de mapeo genera sus opciones a
	 * partir de ellos. Solo se despachan si aún no hay datos, para evitar
	 * peticiones redundantes cuando el padre ya los cargó.
	 */
	created() {
		if (this.addresses.length === 0) {
			this.$store.dispatch('address/getModels')
		}

		if (this.price_types.length === 0) {
			this.$store.dispatch('price_type/getModels')
		}

		// getOptions ya se guarda solo si ya esta cargado (options_loaded), asi que no hace
		// falta un guard extra aca.
		this.$store.dispatch('provider/getOptions')
	},

	/*
	 * El caso normal del botón "Ver resultado": el aviso dejó la orden en el store
	 * y navegó hasta acá, así que este componente recién se está montando y su
	 * watch todavía no existía cuando la orden se escribió.
	 *
	 * Va en mounted() y no en created() porque $bvModal.show() emite un evento que
	 * escucha el <b-modal>: en created() ese hijo todavía no existe y el pedido de
	 * apertura se perdería sin ningún error a la vista.
	 */
	mounted() {
		this.consumir_orden_de_apertura()
	},

	/*
	 * Si el componente se destruye (navegación fuera de la vista) con una corrida
	 * en curso, suelta el seguimiento — si no, el polling sigue pegándole a la API
	 * con el componente ya destruido. La corrida en sí sigue su curso en el
	 * servidor y avisa cuando termina.
	 */
	beforeDestroy() {
		this.soltar_seguimiento_del_analisis()
	},

}
</script>

<style lang="sass">
/* Indicador visual de pasos del flujo */
.ai-import-steps
	display: flex
	align-items: center
	gap: 8px
	margin-bottom: 20px

.ai-import-step-dot
	display: inline-flex
	align-items: center
	justify-content: center
	width: 28px
	height: 28px
	border-radius: 50%
	background: #e9ecef
	color: #6c757d
	font-weight: 600
	font-size: 13px
	transition: background 0.2s, color 0.2s

	&--active
		background: #007bff
		color: #fff

/* Contenedor de notas de asistencia globales de Claude (paso 2) */
.assistant-notes-container
	display: flex
	flex-direction: column
	gap: 6px

/* Nota individual de asistencia: fondo ámbar suave con ícono de bombilla */
.assistant-note
	display: flex
	align-items: flex-start
	gap: 8px
	padding: 8px 12px
	border-radius: 6px
	background: rgba(255, 193, 7, 0.12)
	border-left: 4px solid #ffc107
	font-size: 13px
	color: #6c5200

.assistant-note-icon
	flex-shrink: 0
	line-height: 1.4

.assistant-note-text
	line-height: 1.4

/* Tabla de mapeo de columnas */
.ai-import-mapping-table
	border: 1px solid rgba(0,0,0,.1)
	border-radius: 8px
	overflow: hidden

.ai-import-mapping-block
	border-bottom: 1px solid rgba(0,0,0,.06)

	&:last-child
		border-bottom: none

	&--warning
		background: rgba(255, 193, 7, 0.14)

	&--interpretation
		background: rgba(0, 123, 255, 0.1)
		border-left: 4px solid #17a2b8
		padding-left: 8px

	&--ignored
		background: rgba(111, 66, 193, 0.16)
		border-left: 4px solid #6f42c1
		padding-left: 8px

		.ai-import-mapping-excel-header
			color: #5a32a3
			font-style: italic

		.ai-import-mapping-confidence-value
			opacity: 0.75

.ai-import-mapping-row
	display: grid
	grid-template-columns: 1fr 1.4fr 100px
	align-items: center
	gap: 10px
	padding: 8px 12px

	&--header
		background: #f8f9fa
		font-weight: 600
		font-size: 13px
		color: #495057
		border-bottom: 1px solid rgba(0,0,0,.06)

.ai-import-mapping-interpretation-note
	padding: 0 12px 8px 12px
	color: #0c5460

.ai-import-mapping-legend-interpretation
	color: #17a2b8
	font-weight: 600

.ai-import-mapping-legend-ignored
	color: #6f42c1
	font-weight: 600

.ai-import-mapping-excel-col
	display: flex
	align-items: baseline
	gap: 8px
	min-width: 0
	font-size: 13px
	color: #343a40

.ai-import-mapping-excel-letter
	flex-shrink: 0
	font-weight: 700
	color: #007bff
	font-size: 12px
	min-width: 1.5em

.ai-import-mapping-excel-header
	font-weight: 500
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

/* Marca de columna ambigua al lado de la letra: chica, ámbar, sin fondo ni borde. */
/* No tiene que competir con el resaltado de fila; sólo indicar cuál revisar. */
.ai-import-mapping-ambiguous-flag
	flex-shrink: 0
	align-self: center
	font-size: 12px
	line-height: 1
	color: #b28704
	cursor: help

.ai-import-mapping-confidence
	display: flex
	flex-direction: column
	align-items: center
	gap: 2px

.ai-import-mapping-confidence-value
	font-weight: 600
	font-size: 13px
	line-height: 1.2

.ai-import-mapping-confidence-hint
	font-size: 11px
	line-height: 1

/* Bloque informativo de archivo cargado en el paso 1 */
.ai-import-file-info
	background: rgba(0, 123, 255, 0.05)
	border-left: 3px solid rgba(0, 123, 255, 0.3)
	padding: 10px 14px
	border-radius: 4px

/* Selector de hoja del paso 1: solo aparece cuando el libro tiene más de una */
.ai-import-hojas
	margin-bottom: 10px

	label
		font-size: 13px
		font-weight: 600

/* Contenedor del toggle de cabecera */
.ai-import-header-detection
	margin-top: 6px

/* Fila de encabezado detectada y corregible, en una sola línea */
.ai-import-encabezado
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 8px
	margin-top: 8px
	font-size: 13px

	&--dudoso .ai-import-encabezado-input
		border-color: #ffc107

.ai-import-encabezado-label
	font-size: 13px

/* Ancho justo para dos o tres dígitos: no tiene por qué ocupar la fila entera */
.ai-import-encabezado-input
	width: 80px
	flex: 0 0 auto

.ai-import-encabezado-datos
	font-size: 12px

/* Renglón fijo del paso 2 con la hoja y la fila de encabezado que usó el backend */
.ai-import-resumen-hoja
	font-style: italic

/* Etiqueta de detección automática junto al checkbox */
.ai-import-header-auto-label
	font-size: 11px
	font-style: italic

/* Bloque explicativo de la cadena de identificación efectiva (paso 3, prompt 06 grupo 229) */
.ai-import-identification-chain
	background: rgba(0, 123, 255, 0.04)
	border: 1px solid rgba(0, 123, 255, 0.15)
	border-radius: 6px
	padding: 14px 16px

.ai-import-identification-chain-list
	margin: 0
	padding-left: 20px

.ai-import-identification-chain-item
	margin-bottom: 12px

	&:last-child
		margin-bottom: 0

.ai-import-identification-chain-title
	font-weight: 600
	font-size: 13px
	color: #343a40

/* Chips de resumen del archivo en el paso 3 */
.ai-import-summary-chips
	display: flex
	flex-wrap: wrap
	gap: 8px

/* Chip individual: borde redondeado, fondo suave */
.ai-import-summary-chip
	display: inline-flex
	align-items: center
	gap: 4px
	padding: 4px 10px
	border-radius: 20px
	font-size: 12px
	font-weight: 500
	background: rgba(0, 123, 255, 0.08)
	border: 1px solid rgba(0, 123, 255, 0.2)
	color: #004085

	/* Variante de advertencia: fondo naranja suave */
	&--warning
		background: rgba(255, 193, 7, 0.14)
		border-color: rgba(255, 193, 7, 0.5)
		color: #856404

	/* Variante informativa: fondo verde suave */
	&--info
		background: rgba(40, 167, 69, 0.08)
		border-color: rgba(40, 167, 69, 0.25)
		color: #155724

/* Card de recomendación de Claude en el paso 3 */
.ai-import-recomendacion-card
	background: #f8f9fa
	border: 1px solid rgba(0, 123, 255, 0.2)
	border-left: 4px solid #007bff
	border-radius: 6px
	padding: 14px 16px

/* Línea resumen de la decisión recomendada dentro de la card */
.ai-import-recomendacion-decision
	display: inline-flex
	align-items: center
	gap: 4px
	font-size: 13px
	color: #155724
	background: rgba(40, 167, 69, 0.1)
	border: 1px solid rgba(40, 167, 69, 0.25)
	border-radius: 4px
	padding: 4px 10px

	i
		color: #28a745

/* Tabla de duplicados del paso 3 */
.ai-import-duplicates-table
	border: 1px solid rgba(0, 0, 0, 0.1)
	border-radius: 6px
	overflow: hidden
	font-size: 12px

/* Fila de cabecera de la tabla de duplicados */
.ai-import-duplicates-table__header
	display: grid
	grid-template-columns: 1fr 100px 1fr
	gap: 8px
	padding: 7px 12px
	background: #f8f9fa
	font-weight: 600
	color: #495057
	border-bottom: 1px solid rgba(0, 0, 0, 0.08)

/* Fila de dato de la tabla de duplicados */
.ai-import-duplicates-table__row
	display: grid
	grid-template-columns: 1fr 100px 1fr
	gap: 8px
	padding: 7px 12px
	border-bottom: 1px solid rgba(0, 0, 0, 0.05)

	&:last-child
		border-bottom: none

	&:hover
		background: rgba(255, 193, 7, 0.06)

/* Badge con el número de repeticiones en la tabla de duplicados */
.ai-import-duplicates-badge
	display: inline-flex
	align-items: center
	justify-content: center
	min-width: 24px
	height: 20px
	padding: 0 6px
	border-radius: 10px
	font-size: 11px
	font-weight: 700
	background: rgba(255, 193, 7, 0.25)
	color: #856404
	border: 1px solid rgba(255, 193, 7, 0.4)

/* Títulos de las preguntas de decisión en el paso 3 */
.ai-import-decision-title
	font-size: 14px
	font-weight: 700
	color: #343a40
	margin-bottom: 10px
	display: block

/* Wrapper con scroll horizontal para la tabla de preview */
.ai-import-preview-table-wrapper
	overflow-x: auto
	border: 1px solid rgba(0, 0, 0, 0.1)
	border-radius: 6px

/* Tabla de preview de artículos en el paso 2 */
.ai-import-preview-table
	width: 100%
	border-collapse: collapse
	font-size: 12px
	white-space: nowrap

	thead tr
		background: #f8f9fa
		border-bottom: 2px solid rgba(0, 0, 0, 0.08)

	th
		padding: 7px 12px
		font-weight: 600
		color: #495057
		text-align: left

	td
		padding: 6px 12px
		border-bottom: 1px solid rgba(0, 0, 0, 0.05)
		color: #343a40
		max-width: 200px
		overflow: hidden
		text-overflow: ellipsis

	tbody tr:last-child td
		border-bottom: none

	tbody tr:hover
		background: rgba(0, 123, 255, 0.03)

/* Bloque de números con punto ambiguos del paso 3 (prompt 03, grupo 239) */
.ai-import-numeric-formats
	display: block

/* Separación entre columnas cuando hay más de una con ambigüedad numérica */
.ai-import-numeric-formats__column
	&:not(:last-child)
		border-bottom: 1px solid rgba(0, 0, 0, 0.06)
		padding-bottom: 12px

/* Aviso de riesgo alto: mismo tono que otras alertas destacadas del paso 3 */
.ai-import-numeric-formats__risk-alert
	font-size: 12px

/* Selector de interpretacion_punto y su vista previa (prompt 05, grupo 239) */
.ai-import-numeric-interpretacion
	border-top: 1px solid rgba(0, 0, 0, 0.06)
	padding-top: 10px

/* Separación entre las vistas previas cuando hay más de una columna con selector */
.ai-import-numeric-interpretacion__preview
	&:not(:last-child)
		margin-bottom: 10px
</style>
