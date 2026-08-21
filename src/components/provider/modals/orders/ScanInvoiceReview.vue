<template>
	<b-modal
	id="scan-invoice-review"
	size="xl"
	title="Revisar el escaneo"
	hide-footer
	no-close-on-backdrop
	@show="construir">
		<div class="scan-review">

			<div
			v-if="cargando"
			class="scan-review__cargando">
				Cargando el escaneo…
			</div>

			<div v-else-if="!detalle">
				<b-alert show variant="warning">
					No se pudo cargar el escaneo. Cerrá y volvé a intentarlo.
				</b-alert>
			</div>

			<div v-else>

				<!-- ─── 1. Qué columnas detectó la IA y con cuánta certeza ─────────── -->
				<div class="scan-review__bloque">
					<h6 class="scan-review__titulo">Columnas detectadas</h6>
					<p
					v-if="!columnas.length"
					class="scan-review__vacio">
						La IA no reconoció ninguna columna de la tabla.
					</p>
					<div class="scan-review__chips">
						<span
						v-for="(columna, index) in columnas"
						:key="'col-' + index"
						class="scan-review__chip"
						:class="'scan-review__chip--' + nivel_confianza(columna.confianza)"
						:title="'Certeza: ' + porcentaje(columna.confianza)">
							<strong>{{ columna.etiqueta_en_factura || '(sin encabezado)' }}</strong>
							<span class="scan-review__chip-flecha">&#8594;</span>
							{{ etiqueta_clave(columna.clave) }}
							<span class="scan-review__chip-pct">{{ porcentaje(columna.confianza) }}</span>
						</span>
					</div>

					<ul
					v-if="avisos.length"
					class="scan-review__avisos">
						<li
						v-for="(aviso, index) in avisos"
						:key="'aviso-' + index">
							{{ aviso }}
						</li>
					</ul>
				</div>

				<!-- ─── 2. Datos del comprobante ───────────────────────────────────── -->
				<div class="scan-review__bloque">
					<h6 class="scan-review__titulo">
						Comprobante
						<b-button
						size="sm"
						variant="link"
						class="scan-review__toggle"
						@click="mostrar_factura = !mostrar_factura">
							{{ mostrar_factura ? 'Ocultar' : 'Mostrar' }}
						</b-button>
					</h6>

					<b-alert
					v-if="!es_factura_afip"
					show
					variant="secondary"
					class="scan-review__aviso">
						No se detectaron datos de factura AFIP. Si querés guardar el comprobante igual
						—un remito, por ejemplo—, cargá el número y la fecha a mano acá abajo y dejá
						tildado «guardar». Si no, se cargan solo los artículos.
					</b-alert>

					<div v-if="mostrar_factura">

						<!--
							🔴 La casilla va PRIMERO, y de ella cuelga todo lo demás del panel.
							Antes estaba abajo del aviso del modo de facturación y, peor, el
							request se armaba con `guardar_factura && es_factura_afip`: si el
							documento era un remito y el usuario cargaba a mano el número y la
							fecha y tildaba esta casilla, el tilde se ignoraba y no se guardaba
							nada, sin un solo mensaje. Ahora el tilde se respeta siempre, y lo
							único que lo apaga es no tener ningún dato del comprobante que
							guardar — y en ese caso la casilla se deshabilita y se dice por qué,
							en vez de quedar prendida sin hacer nada.
						-->
						<b-form-checkbox
						v-model="guardar_factura"
						:disabled="!hay_datos_de_comprobante"
						class="m-b-5">
							Guardar los datos del comprobante en la compra
						</b-form-checkbox>

						<p
						v-if="!hay_datos_de_comprobante"
						class="scan-review__nota m-b-15">
							Cargá al menos el número, la fecha o el total del comprobante para poder guardarlo.
						</p>

						<!--
							🔴 La trampa del modo de facturación. Si la compra está en "sin
							factura" o en "automático", guardar la factura acá no serviría de
							nada: el helper de facturación la borra o le pisa los totales en el
							mismo request. Cambiarle la configuración a la compra por nuestra
							cuenta sería peor que no guardarla, así que se le pregunta.

							Va condicionado a `guardar_factura`: si el usuario no va a guardar el
							comprobante, ofrecerle "pasarla a manual y guardar la factura" no
							tiene sentido — y encima el backend le cambia el modo_facturacion a la
							compra con solo recibir ese flag en true, así que un tilde olvidado
							ahí le reconfiguraba la compra sin guardar nada a cambio.
						-->
						<b-alert
						v-if="factura_bloqueada_por_modo && guardar_factura"
						show
						variant="warning"
						class="scan-review__aviso">
							<p class="m-b-10">
								Esta compra está configurada como «{{ modo_facturacion }}». Para guardar los
								datos de la factura hay que pasarla a facturación manual.
							</p>
							<b-form-checkbox v-model="pasar_a_manual">
								Pasarla a manual y guardar la factura.
							</b-form-checkbox>
							<p
							v-if="!pasar_a_manual"
							class="scan-review__nota m-t-10 m-b-0">
								Sin tildar esto se cargan solo los artículos: los datos del comprobante no
								se guardan.
							</p>
						</b-alert>

						<div class="scan-review__factura">
							<div
							v-for="campo in campos_factura"
							:key="campo.clave"
							class="scan-review__factura-campo">
								<label class="scan-review__label">{{ campo.etiqueta }}</label>
								<editable-cell
								:value="factura[campo.clave]"
								:tipo="campo.tipo"
								:dudoso="campo_dudoso(factura, campo.clave)"
								@input="set_campo_factura(campo.clave, $event)"></editable-cell>
							</div>
						</div>

						<p class="scan-review__leido">
							Leído del comprobante: neto gravado {{ mostrar_numero(resultado_factura.neto_gravado) }} ·
							total IVA {{ mostrar_numero(resultado_factura.total_iva) }} ·
							certeza {{ porcentaje(resultado_factura.confianza) }}
						</p>

						<h6 class="scan-review__subtitulo">IVA discriminado</h6>
						<p
						v-if="!ivas.length"
						class="scan-review__vacio">
							No se detectaron alícuotas de IVA.
						</p>

						<!--
							🔴 La alícuota es un SELECTOR, no un texto. Antes era un <span> de
							solo lectura con un badge "sin identificar" al lado: el usuario veía
							el problema y no lo podía arreglar. Y del otro lado el backend saltea
							toda fila de IVA con `iva_id` en null, así que ese renglón del
							desglose se perdía en silencio y el total de IVA se recalculaba
							sumando solo las filas que sobrevivieron. Un "10,5" leído mal, o una
							alícuota que no matchea contra la tabla `ivas`, alcanzaba para que la
							factura entrara con el IVA cambiado.
						-->
						<div
						v-for="(iva, index) in ivas"
						:key="'iva-' + index"
						class="scan-review__iva"
						:class="{ 'scan-review__iva--sin-identificar': !iva.iva_id }">
							<div class="scan-review__iva-campo">
								<label class="scan-review__label">Alícuota</label>
								<b-form-select
								size="sm"
								:value="iva.iva_id"
								:options="opciones_ivas"
								@change="$set(ivas[index], 'iva_id', $event)"></b-form-select>
								<span
								class="scan-review__iva-leido"
								title="El porcentaje que la IA leyó en la factura">
									Leído: {{ mostrar_numero(iva.porcentaje) }}
								</span>
							</div>
							<div class="scan-review__iva-campo">
								<label class="scan-review__label">Neto</label>
								<editable-cell
								:value="iva.neto"
								tipo="numero"
								@input="$set(ivas[index], 'neto', $event)"></editable-cell>
							</div>
							<div class="scan-review__iva-campo">
								<label class="scan-review__label">IVA</label>
								<editable-cell
								:value="iva.importe"
								tipo="numero"
								@input="$set(ivas[index], 'importe', $event)"></editable-cell>
							</div>
						</div>

						<p
						v-if="ivas_sin_identificar"
						class="scan-review__alerta-inline">
							Hay {{ ivas_sin_identificar }} fila(s) del desglose sin alícuota elegida. No se
							guardan y su importe no suma al IVA de la factura: elegí la alícuota, o dejalas
							así a sabiendas.
						</p>

					</div>
				</div>

				<!-- ─── 3. La tabla de artículos ───────────────────────────────────── -->
				<div class="scan-review__bloque">
					<h6 class="scan-review__titulo">
						Artículos
						<span class="scan-review__contadores">
							{{ contadores.total }} artículos ·
							{{ contadores.encontrados }} encontrados ·
							{{ contadores.nuevos }} nuevos ·
							{{ contadores.excluidos }} excluidos
							<span
							v-if="contadores.se_descartan"
							class="scan-review__contadores-alerta">
								· {{ contadores.se_descartan }} se descartan
							</span>
						</span>
					</h6>

					<p
					v-if="!articulos.length"
					class="scan-review__vacio">
						La IA no pudo leer ningún artículo de estas fotos.
					</p>

					<div
					v-else
					class="scan-review__tabla">

						<div class="scan-review__fila scan-review__cabecera">
							<div class="scan-review__celda scan-review__celda--check">&nbsp;</div>
							<div class="scan-review__celda">Cód. proveedor</div>
							<div class="scan-review__celda scan-review__celda--secundaria">Cód. barras</div>
							<div class="scan-review__celda">Nombre</div>
							<div class="scan-review__celda">Cant.</div>
							<div class="scan-review__celda">Costo unit.</div>
							<div class="scan-review__celda">Desc. %</div>
							<div class="scan-review__celda scan-review__celda--secundaria">IVA</div>
							<div class="scan-review__celda">Estado</div>
							<div class="scan-review__celda scan-review__celda--secundaria">Notas</div>
							<div class="scan-review__celda scan-review__celda--mas">&nbsp;</div>
						</div>

						<div
						v-for="(articulo, index) in articulos"
						:key="'art-' + index"
						class="scan-review__fila"
						:class="{
							'scan-review__fila--nueva': es_nuevo(articulo),
							'scan-review__fila--excluida': !articulo.incluir,
							'scan-review__fila--expandida': articulo.expandida,
						}">

							<div
							class="scan-review__celda scan-review__celda--check"
							data-label="Incluir">
								<b-form-checkbox v-model="articulo.incluir"></b-form-checkbox>
							</div>

							<div
							class="scan-review__celda"
							data-label="Cód. proveedor">
								<editable-cell
								:value="articulo.codigo_proveedor"
								:dudoso="campo_dudoso(articulo, 'codigo_proveedor')"
								@input="$set(articulo, 'codigo_proveedor', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda scan-review__celda--secundaria"
							data-label="Cód. barras">
								<editable-cell
								:value="articulo.bar_code"
								:dudoso="campo_dudoso(articulo, 'bar_code')"
								@input="$set(articulo, 'bar_code', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda"
							data-label="Nombre">
								<editable-cell
								:value="articulo.nombre"
								:dudoso="campo_dudoso(articulo, 'nombre')"
								@input="$set(articulo, 'nombre', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda"
							data-label="Cantidad">
								<editable-cell
								:value="articulo.cantidad"
								tipo="numero"
								:dudoso="campo_dudoso(articulo, 'cantidad')"
								@input="$set(articulo, 'cantidad', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda"
							data-label="Costo unitario">
								<editable-cell
								:value="articulo.costo_unitario"
								tipo="numero"
								:dudoso="campo_dudoso(articulo, 'costo_unitario')"
								@input="$set(articulo, 'costo_unitario', $event)"></editable-cell>

								<!--
									El total de la línea calculado con lo que hay en la fila
									(cantidad × costo − descuento), contra el importe que la IA
									leyó de la factura. Es el control de magnitud: si los dos
									números no coinciden, hay algo mal leído o una bonificación
									que no se cargó, y se ve ACÁ y no cuando la deuda del
									proveedor ya quedó $2.940 más alta.
								-->
								<span
								v-if="subtotal_texto(articulo)"
								class="scan-review__subtotal"
								:class="{ 'scan-review__subtotal--difiere': subtotal_difiere(articulo) }"
								:title="subtotal_title(articulo)">
									{{ subtotal_texto(articulo) }}
								</span>
							</div>

							<div
							class="scan-review__celda"
							data-label="Descuento %">
								<editable-cell
								:value="articulo.descuento_porcentaje"
								tipo="numero"
								placeholder="0"
								:dudoso="campo_dudoso(articulo, 'descuento_porcentaje')"
								@input="$set(articulo, 'descuento_porcentaje', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda scan-review__celda--secundaria"
							data-label="IVA">
								<b-form-select
								size="sm"
								:value="articulo.iva_id"
								:options="opciones_ivas_articulo"
								@change="$set(articulo, 'iva_id', $event)"></b-form-select>
							</div>

							<div
							class="scan-review__celda scan-review__celda--estado"
							data-label="Estado">
								<template v-if="!es_nuevo(articulo)">
									<b-badge variant="success">
										{{ articulo.match.nombre_en_catalogo || 'En el catálogo' }}
									</b-badge>
									<span class="scan-review__criterio">
										{{ etiqueta_criterio(articulo.match.criterio) }}
									</span>
								</template>
								<template v-else>
									<b-badge variant="danger">Artículo nuevo</b-badge>
									<b-form-checkbox
									v-model="articulo.crear_en_catalogo"
									class="scan-review__crear">
										Crear en el catálogo
									</b-form-checkbox>

									<!--
										🔴 La marca por fila de que confirmar así la tira. El
										backend saltea sin avisar toda fila sin `article_id` y sin
										`crear_en_catalogo`, y hasta ahora la única señal era un
										"se omitieron 5" en el toast, DESPUÉS de confirmar y sin
										decir cuáles. Ahora se ve antes, en la fila que lo sufre.
									-->
									<span
									v-if="se_descarta(articulo)"
									class="scan-review__descarte">
										No se va a cargar
									</span>
									<b-form-select
									v-if="tiene_candidatos(articulo)"
									size="sm"
									class="scan-review__candidatos"
									:value="null"
									:options="opciones_candidatos(articulo)"
									@change="vincular(articulo, $event)"></b-form-select>
								</template>
							</div>

							<div
							class="scan-review__celda scan-review__celda--secundaria"
							data-label="Notas">
								<editable-cell
								:value="articulo.notas"
								:dudoso="campo_dudoso(articulo, 'notas')"
								@input="$set(articulo, 'notas', $event)"></editable-cell>
							</div>

							<div class="scan-review__celda scan-review__celda--mas">
								<b-button
								size="sm"
								variant="outline-secondary"
								:title="articulo.expandida ? 'Ocultar código de barras y notas' : 'Ver código de barras y notas'"
								@click="$set(articulo, 'expandida', !articulo.expandida)">
									{{ articulo.expandida ? '−' : '+' }}
								</b-button>
							</div>

							<!--
								Copia de las TRES columnas que se ocultan entre 768 y 1199px
								(código de barras, IVA y notas). Vive en su propio bloque, después
								de todas las celdas, y no reusa las de arriba: si a una celda del
								medio de la grilla se le da ancho completo, empuja a las que vienen
								después a otra fila y la tabla se desarma. En los otros dos anchos
								está en display:none.

								El IVA cayó acá y no entre las columnas principales del ancho
								intermedio porque a 768px ya hay ocho columnas peleando: un select
								más las deja a todas abajo del ancho con el que un dedo acierta.
								A ≥1200px sí es una columna propia, y a <768px se ve como una
								etiqueta más de la tarjeta.
							-->
							<div class="scan-review__extra">
								<div class="scan-review__extra-campo">
									<label class="scan-review__label">Cód. barras</label>
									<editable-cell
									:value="articulo.bar_code"
									:dudoso="campo_dudoso(articulo, 'bar_code')"
									@input="$set(articulo, 'bar_code', $event)"></editable-cell>
								</div>
								<div class="scan-review__extra-campo">
									<label class="scan-review__label">IVA</label>
									<b-form-select
									size="sm"
									:value="articulo.iva_id"
									:options="opciones_ivas_articulo"
									@change="$set(articulo, 'iva_id', $event)"></b-form-select>
								</div>
								<div class="scan-review__extra-campo">
									<label class="scan-review__label">Notas</label>
									<editable-cell
									:value="articulo.notas"
									:dudoso="campo_dudoso(articulo, 'notas')"
									@input="$set(articulo, 'notas', $event)"></editable-cell>
								</div>
							</div>

						</div>
					</div>
				</div>

				<!-- ─── 4. Las fotos, para cotejar mientras se corrige ─────────────── -->
				<div class="scan-review__bloque">
					<h6 class="scan-review__titulo">
						Fotos escaneadas ({{ imagenes.length }})
						<b-button
						size="sm"
						variant="link"
						class="scan-review__toggle"
						@click="mostrar_fotos = !mostrar_fotos">
							{{ mostrar_fotos ? 'Ocultar' : 'Ver' }}
						</b-button>
					</h6>
					<div
					v-if="mostrar_fotos"
					class="scan-review__fotos">
						<figure
						v-for="imagen in imagenes"
						:key="'img-' + imagen.orden"
						class="scan-review__foto">
							<img
							:src="url_imagen(imagen.orden)"
							:alt="'Página ' + imagen.orden">
							<figcaption>
								Página {{ imagen.orden }}
								<span v-if="imagen.nombre_original">— {{ imagen.nombre_original }}</span>
							</figcaption>
						</figure>
					</div>
				</div>

				<!-- ─── 5. Lo que se va a perder si confirma así ───────────────────── -->
				<!--
					🔴 Este bloque es lo que faltaba: el resumen de lo que la confirmación va
					a tirar, ANTES de confirmar. El backend saltea sin avisar toda fila sin
					`article_id` y sin `crear_en_catalogo`, y el único aviso era un
					"se omitieron 5" en el toast posterior, que no dice cuáles y llega cuando
					ya no hay vuelta atrás. Acá se listan por nombre, y hay un botón para
					resolver los cinco de una.
				-->
				<b-alert
				v-if="articulos_que_se_descartan.length"
				show
				variant="danger"
				class="scan-review__aviso">
					<p class="m-b-10">
						<strong>{{ articulos_que_se_descartan.length }} artículos no se van a cargar en la compra.</strong>
						No están en el catálogo y no tienen tildado «Crear en el catálogo». Si confirmás
						así, se pierden.
					</p>
					<ul class="scan-review__lista-descartes">
						<li
						v-for="(articulo, index) in descartes_a_mostrar"
						:key="'descarte-' + index">
							{{ etiqueta_articulo(articulo) }}
						</li>
						<li v-if="descartes_no_mostrados">
							…y {{ descartes_no_mostrados }} más.
						</li>
					</ul>
					<b-button
					size="sm"
					variant="outline-danger"
					@click="crear_todos_los_nuevos">
						Crear los {{ articulos_que_se_descartan.length }} en el catálogo
					</b-button>
				</b-alert>

				<!-- ─── 6. Pie ─────────────────────────────────────────────────────── -->
				<div class="scan-review__pie">
					<b-button
					variant="primary"
					:disabled="confirmando || descartando || !hay_algo_para_cargar"
					@click="confirmar">
						{{ confirmando ? 'Cargando…' : 'Confirmar y cargar en la compra' }}
					</b-button>
					<b-button
					variant="outline-danger"
					:disabled="confirmando || descartando"
					@click="descartar">
						Descartar escaneo
					</b-button>
					<b-button
					variant="outline-secondary"
					:disabled="confirmando || descartando"
					@click="cerrar">
						Cerrar
					</b-button>
				</div>

			</div>
		</div>
	</b-modal>
</template>
<script>
/*
 * Modal de revisión de un escaneo de factura de compra (misión escaneo-factura-compra).
 *
 * Muestra lo que leyó la IA y deja corregirlo ANTES de asentarlo en la compra. Todo lo
 * que se ve acá es editable a propósito: el OCR de una foto torcida o de una impresión
 * matricial gastada devuelve campos dudosos, y la única defensa contra que entre basura
 * al catálogo y a la cuenta corriente del proveedor es que una persona lo mire con la
 * foto al lado.
 *
 * Lo que sale de acá es el request de confirmación: los artículos con `incluir: false`
 * ni se mandan, y la factura viaja solo si el usuario dejó tildado "guardar".
 *
 * 🔴 Todo lo que la confirmación va a DESCARTAR se dice antes de mandarla, no después:
 * las filas sin artículo del catálogo y sin "crear", y las alícuotas de IVA sin elegir.
 * El backend saltea las dos cosas en silencio, y un resumen posterior no sirve de nada
 * cuando la compra ya quedó asentada.
 *
 * Responsive (es la parte más frágil de la pantalla, y el ancho del medio es donde se
 * esconden los defectos):
 *  - ≥1200px: la tabla completa, diez columnas.
 *  - 768–1199px: se ocultan código de barras, IVA y notas; se editan desde el "+" de la
 *    fila. El descuento se queda arriba: es plata del renglón, no un dato de referencia.
 *  - <768px: la tabla se vuelve tarjetas apiladas. Una tabla de diez columnas a 360px no
 *    se puede editar con el dedo, y un scroll horizontal no resuelve nada: esconde
 *    justamente la columna que se está por tocar.
 */

/* Etiquetas legibles de las claves fijas del contrato del resultado. */
const ETIQUETAS_CLAVE = {
	bar_code: 'código de barras',
	codigo_proveedor: 'código de proveedor',
	nombre: 'nombre',
	cantidad: 'cantidad',
	costo_unitario: 'costo unitario',
	descuento_porcentaje: 'descuento %',
	iva_porcentaje: 'IVA %',
	total_linea: 'total de la línea',
	notas: 'notas',
}

/* Etiquetas de `match.criterio`. */
const ETIQUETAS_CRITERIO = {
	bar_code: 'por código de barras',
	provider_code: 'por código de proveedor',
	name: 'por nombre',
}

/* Cuántos artículos a descartar se nombran en el aviso antes de resumir con "y N más". */
const TOPE_DESCARTES_LISTADOS = 8

/*
 * Tolerancia para comparar el total de línea calculado contra el que leyó la IA.
 * Un centavo de diferencia es redondeo del proveedor, no un error de carga: se avisa
 * recién cuando la diferencia pasa del 1% o de medio peso, lo que sea más grande.
 */
const TOLERANCIA_TOTAL_LINEA = 0.01
const TOLERANCIA_TOTAL_LINEA_MINIMA = 0.5

export default {
	components: {
		EditableCell: () => import('@/components/provider/modals/orders/scan-invoice/EditableCell'),
	},
	data() {
		return {
			/* Copia editable de los artículos del resultado. */
			articulos: [],
			/* Copia editable de los datos del comprobante. */
			factura: {},
			/* Copia editable de las alícuotas de IVA. */
			ivas: [],
			guardar_factura: true,
			pasar_a_manual: false,
			mostrar_factura: true,
			mostrar_fotos: false,
			confirmando: false,
			descartando: false,
			/* Los campos del comprobante que viajan en el request de confirmación. */
			campos_factura: [
				{ clave: 'code', etiqueta: 'Número', tipo: 'texto' },
				{ clave: 'issued_at', etiqueta: 'Fecha', tipo: 'fecha' },
				{ clave: 'emisor_cuit', etiqueta: 'CUIT del emisor', tipo: 'texto' },
				{ clave: 'emisor_razon_social', etiqueta: 'Razón social del emisor', tipo: 'texto' },
				{ clave: 'total', etiqueta: 'Total', tipo: 'numero' },
				{ clave: 'percepcion_iibb', etiqueta: 'Percepción IIBB', tipo: 'numero' },
				{ clave: 'percepcion_iva', etiqueta: 'Percepción IVA', tipo: 'numero' },
				{ clave: 'retencion_iibb', etiqueta: 'Retención IIBB', tipo: 'numero' },
				{ clave: 'retencion_iva', etiqueta: 'Retención IVA', tipo: 'numero' },
				{ clave: 'retencion_ganancias', etiqueta: 'Retención Ganancias', tipo: 'numero' },
			],
		}
	},
	computed: {
		detalle() {
			return this.$store.state.provider_order_scan.detalle
		},
		cargando() {
			return this.$store.state.provider_order_scan.cargando_detalle
		},
		compra() {
			return this.$store.state.provider_order_scan.compra
		},
		resultado() {
			return this.detalle && this.detalle.resultado ? this.detalle.resultado : {}
		},
		resultado_factura() {
			return this.resultado.factura ? this.resultado.factura : {}
		},
		columnas() {
			return this.resultado.columnas_detectadas || []
		},
		avisos() {
			return this.resultado.avisos || []
		},
		imagenes() {
			return this.detalle && this.detalle.imagenes ? this.detalle.imagenes : []
		},
		uuid() {
			return this.detalle ? this.detalle.uuid : null
		},
		provider_order_id() {
			return this.detalle ? this.detalle.provider_order_id : null
		},
		es_factura_afip() {
			return !!this.resultado_factura.es_factura_afip
		},
		modo_facturacion() {
			return this.compra ? this.compra.modo_facturacion : null
		},
		/*
		 * True cuando el modo de facturación de la compra haría inútil (o destructivo)
		 * guardar la factura sin permiso explícito del usuario.
		 *
		 * @return {Boolean}
		 */
		factura_bloqueada_por_modo() {
			return this.modo_facturacion === 'sin factura' || this.modo_facturacion === 'automatico'
		},
		/*
		 * Si hay algún dato del comprobante que valga la pena guardar.
		 *
		 * No mira `es_factura_afip`: un remito con el número y la fecha cargados a mano
		 * es exactamente el caso que antes se perdía en silencio. Lo que decide es si
		 * hay contenido, no de qué tipo de papel salió.
		 *
		 * @return {Boolean}
		 */
		hay_datos_de_comprobante() {
			let claves = ['code', 'issued_at', 'total', 'emisor_cuit', 'emisor_razon_social']

			return claves.some(clave => {
				let valor = this.factura[clave]
				return valor !== null && typeof valor !== 'undefined' && valor !== ''
			})
		},
		/*
		 * La verdad sobre si el comprobante se va a guardar. Es lo único que viaja en
		 * `factura.guardar`, y también lo que gatea la casilla de pasar a manual.
		 *
		 * @return {Boolean}
		 */
		va_a_guardar_factura() {
			return this.guardar_factura === true && this.hay_datos_de_comprobante
		},
		/* Las alícuotas del sistema, tal como las trae el store global de `iva`. */
		ivas_del_sistema() {
			return this.$store.state.iva ? this.$store.state.iva.models : []
		},
		/*
		 * Opciones del selector de alícuota del desglose de la factura.
		 *
		 * La primera opción es null y dice qué significa: sin alícuota elegida el
		 * backend saltea esa fila. Que la opción "vacía" exista es a propósito — es la
		 * que muestra el estado real cuando la IA no pudo resolverla.
		 *
		 * @return {Array}
		 */
		opciones_ivas() {
			let opciones = [{ value: null, text: 'Elegí la alícuota' }]

			this.ivas_del_sistema.forEach(modelo => {
				opciones.push({ value: modelo.id, text: this.etiqueta_iva(modelo) })
			})

			return opciones
		},
		/*
		 * Opciones del selector de alícuota de cada artículo. La diferencia con el de
		 * arriba es qué significa dejarlo vacío: acá el backend usa el `iva_id` que ya
		 * tiene el artículo en el catálogo, que es lo correcto en la mayoría de los
		 * casos. Solo hace falta elegir cuando ESTA factura trae otra alícuota.
		 *
		 * @return {Array}
		 */
		opciones_ivas_articulo() {
			let opciones = [{ value: null, text: 'El del artículo' }]

			this.ivas_del_sistema.forEach(modelo => {
				opciones.push({ value: modelo.id, text: this.etiqueta_iva(modelo) })
			})

			return opciones
		},
		/*
		 * Cuántas filas del desglose de IVA quedaron sin alícuota del sistema. Cada una
		 * es una fila que el backend va a saltear.
		 *
		 * @return {Number}
		 */
		ivas_sin_identificar() {
			if (!this.va_a_guardar_factura) {
				return 0
			}

			return this.ivas.filter(iva => {
				return !iva.iva_id
			}).length
		},
		/*
		 * Los artículos que el usuario dejó incluidos pero que la confirmación va a
		 * tirar: no están en el catálogo y no tienen tildado "crear".
		 *
		 * @return {Array}
		 */
		articulos_que_se_descartan() {
			return this.articulos.filter(articulo => {
				return this.se_descarta(articulo)
			})
		},
		/* Los primeros del listado del aviso: la lista entera de 40 no la lee nadie. */
		descartes_a_mostrar() {
			return this.articulos_que_se_descartan.slice(0, TOPE_DESCARTES_LISTADOS)
		},
		descartes_no_mostrados() {
			let sobrantes = this.articulos_que_se_descartan.length - TOPE_DESCARTES_LISTADOS
			return sobrantes > 0 ? sobrantes : 0
		},
		contadores() {
			let total = this.articulos.length
			let excluidos = 0
			let nuevos = 0
			let encontrados = 0

			this.articulos.forEach(articulo => {
				if (!articulo.incluir) {
					excluidos++
					return
				}
				if (this.es_nuevo(articulo)) {
					nuevos++
				} else {
					encontrados++
				}
			})

			return {
				total: total,
				encontrados: encontrados,
				nuevos: nuevos,
				excluidos: excluidos,
				se_descartan: this.articulos_que_se_descartan.length,
			}
		},
		/*
		 * No tiene sentido confirmar un escaneo del que no entra nada: ni un artículo
		 * incluido ni la factura.
		 *
		 * @return {Boolean}
		 */
		hay_algo_para_cargar() {
			let hay_articulos = this.articulos.some(articulo => {
				return articulo.incluir
			})
			return hay_articulos || this.va_a_guardar_factura
		},
	},
	/*
	 * Este componente se monta con el listado de compras, mucho antes de que alguien
	 * abra el modal. Es justamente por eso que el created() sirve para levantar la orden
	 * de apertura que dejó el aviso de "terminó el escaneo": cuando el usuario aprieta
	 * "Revisar ahora" desde otro módulo, la navegación monta el listado, el listado monta
	 * esto, y acá está la orden esperando.
	 */
	created() {
		this.consumir_orden_de_apertura()
	},
	watch: {
		/*
		 * El detalle llega asincrónico: el botón rojo dispara el GET y muestra el modal
		 * al mismo tiempo, así que casi siempre el modal se abre antes que la respuesta.
		 */
		detalle() {
			this.construir()
		},
		/*
		 * La otra mitad del par created()/watch: cubre el caso en que el usuario nunca
		 * se fue de compras y este componente ya estaba montado cuando llegó el aviso.
		 * Sin esto, "Revisar ahora" no haría nada para el que ya estaba parado ahí, que
		 * es bastante común (mandó el escaneo desde el listado y se quedó).
		 */
		'$store.state.provider_order_scan.abrir_en'() {
			this.consumir_orden_de_apertura()
		},
		/*
		 * Si el usuario destilda "guardar el comprobante", "pasarla a manual" deja de
		 * tener sentido y no puede quedar viajando en true: el backend le cambia el
		 * modo_facturacion a la compra con solo recibir ese flag, y quedaría reconfigurada
		 * sin haber guardado ninguna factura a cambio.
		 */
		guardar_factura(nuevo) {
			if (!nuevo) {
				this.pasar_a_manual = false
			}
		},
		/*
		 * Si el usuario borra a mano los últimos datos del comprobante, la casilla queda
		 * deshabilitada: también se destilda, para que el control diga lo que va a pasar.
		 */
		hay_datos_de_comprobante(nuevo) {
			if (!nuevo) {
				this.guardar_factura = false
			}
		},
	},
	methods: {
		/*
		 * Toma la orden de "abrí la revisión de este escaneo" que dejó el aviso, y la
		 * ejecuta. Se consume una sola vez: si no, cada reapertura del modal la repetiría.
		 *
		 * @return {void}
		 */
		consumir_orden_de_apertura() {
			let orden = this.$store.state.provider_order_scan.abrir_en

			if (!orden || !orden.uuid) {
				return
			}

			this.$store.commit('provider_order_scan/set_abrir_en', null)

			this.resolver_compra(orden.provider_order_id)
			this.$store.dispatch('provider_order_scan/abrir_revision', orden.uuid)
			this.$bvModal.show('scan-invoice-review')
		},
		/*
		 * Deja en el store la compra del escaneo que se está por revisar.
		 *
		 * Viniendo del botón rojo de la fila esto no hace nada: BtnScanInvoice ya dejó la
		 * compra correcta. Hace falta para el otro camino, el del aviso, donde nadie pasó
		 * por ninguna fila.
		 *
		 * 🔴 Si la compra no está en el listado cargado se deja en null, no se conserva la
		 * anterior: usar el `modo_facturacion` de OTRA compra es peor que no tenerlo. Sin
		 * él la casilla de pasar a manual no se ofrece, el backend decide igual y avisa en
		 * el resumen por qué no guardó la factura.
		 *
		 * @param {Number|String} provider_order_id
		 */
		resolver_compra(provider_order_id) {
			if (!provider_order_id) {
				return
			}

			if (this.compra && this.compra.id == provider_order_id) {
				return
			}

			let models = this.$store.state.provider_order ? this.$store.state.provider_order.models : []

			let encontrada = models.find(model => {
				return model.id == provider_order_id
			})

			this.$store.commit('provider_order_scan/set_compra', encontrada || null)
		},
		/*
		 * Pide las alícuotas del sistema si todavía no están.
		 *
		 * La tabla `ivas` es global y chica (media docena de filas), y este es el único
		 * lugar del módulo de compras que la necesita: no vale la pena cargarla al
		 * arrancar la SPA para todos. Se pide una sola vez y queda en el store global.
		 */
		cargar_ivas() {
			if (this.ivas_del_sistema.length) {
				return
			}

			this.$store.dispatch('iva/getModels')
		},
		/*
		 * Arma las copias editables desde el resultado del escaneo.
		 *
		 * Se trabaja sobre copias y no sobre el objeto del store porque el usuario puede
		 * cerrar sin confirmar: si editara el store directo, sus correcciones a medias
		 * quedarían dando vueltas y la próxima apertura mostraría un resultado que la IA
		 * nunca devolvió.
		 */
		construir() {
			let resultado = this.resultado
			let articulos = resultado.articulos || []

			/* Las alícuotas del sistema alimentan los dos selectores nuevos. */
			this.cargar_ivas()

			/* Por si se llegó desde el aviso y nadie pasó por la fila del listado. */
			this.resolver_compra(this.provider_order_id)

			this.articulos = articulos.map(articulo => {
				let match = articulo.match || { estado: 'sin_match', article_id: null, criterio: null, candidatos: [] }

				return {
					fila: articulo.fila,
					pagina: articulo.pagina,
					bar_code: articulo.bar_code,
					codigo_proveedor: articulo.codigo_proveedor,
					nombre: articulo.nombre,
					cantidad: articulo.cantidad,
					costo_unitario: articulo.costo_unitario,
					/*
					 * 🔴 El descuento por renglón se leía, se mostraba en el chip de
					 * columnas detectadas y se tiraba: no había columna para corregirlo y
					 * el payload no lo mandaba. Una factura con "Bonif. 10%" entraba un 10%
					 * más cara en la cuenta corriente del proveedor, y con "actualizar
					 * precios" tildado el costo inflado se propagaba a los precios de venta.
					 */
					descuento_porcentaje: typeof articulo.descuento_porcentaje === 'undefined' ? null : articulo.descuento_porcentaje,
					/*
					 * Alícuota de ESTA factura para este renglón. Null significa "la que
					 * ya tiene el artículo en el catálogo", que es lo correcto casi siempre.
					 */
					iva_id: typeof articulo.iva_id === 'undefined' ? null : articulo.iva_id,
					/*
					 * El importe de línea que leyó la IA. No se manda: se usa solo para
					 * contrastarlo contra cantidad × costo − descuento y avisar si no dan.
					 */
					total_linea: typeof articulo.total_linea === 'undefined' ? null : articulo.total_linea,
					notas: articulo.notas,
					campos_dudosos: articulo.campos_dudosos || [],
					match: match,
					article_id: match.article_id,
					/* Los dos arrancan como los dejó el backend (§2.1). */
					incluir: articulo.incluir !== false,
					crear_en_catalogo: articulo.crear_en_catalogo === true,
					/* Solo de interfaz: el "+" del ancho intermedio. */
					expandida: false,
				}
			})

			let factura = resultado.factura || {}

			this.factura = {
				code: factura.code || null,
				issued_at: factura.issued_at || null,
				emisor_cuit: factura.emisor_cuit || null,
				emisor_razon_social: factura.emisor_razon_social || null,
				total: typeof factura.total === 'undefined' ? null : factura.total,
				percepcion_iibb: typeof factura.percepcion_iibb === 'undefined' ? null : factura.percepcion_iibb,
				percepcion_iva: typeof factura.percepcion_iva === 'undefined' ? null : factura.percepcion_iva,
				retencion_iibb: typeof factura.retencion_iibb === 'undefined' ? null : factura.retencion_iibb,
				retencion_iva: typeof factura.retencion_iva === 'undefined' ? null : factura.retencion_iva,
				retencion_ganancias: typeof factura.retencion_ganancias === 'undefined' ? null : factura.retencion_ganancias,
				campos_dudosos: factura.campos_dudosos || [],
			}

			this.ivas = (factura.ivas || []).map(iva => {
				return {
					porcentaje: iva.porcentaje,
					iva_id: iva.iva_id,
					neto: iva.neto,
					importe: iva.importe,
				}
			})

			/*
			 * El valor de arranque de la casilla: un remito no propone guardar nada, y una
			 * factura sin ningún dato legible tampoco. Pero es solo el arranque — a partir
			 * de acá manda el usuario, y su tilde se respeta venga de donde venga el papel.
			 * `hay_datos_de_comprobante` ya puede evaluarse porque `this.factura` acaba de
			 * quedar asignado arriba.
			 */
			this.guardar_factura = !!factura.es_factura_afip && this.hay_datos_de_comprobante
			this.pasar_a_manual = false
			this.confirmando = false
			this.descartando = false
		},
		/*
		 * @param {Object} objeto  artículo o factura
		 * @param {String} campo
		 * @return {Boolean}
		 */
		campo_dudoso(objeto, campo) {
			if (!objeto || !objeto.campos_dudosos) {
				return false
			}
			return objeto.campos_dudosos.indexOf(campo) !== -1
		},
		set_campo_factura(clave, valor) {
			this.$set(this.factura, clave, valor)
		},
		/*
		 * Umbrales de color de la certeza de una columna: ≥0,85 verde; 0,6–0,85
		 * amarillo; abajo de 0,6 rojo.
		 *
		 * @param {Number} valor
		 * @return {String}
		 */
		nivel_confianza(valor) {
			let numero = Number(valor)
			if (isNaN(numero)) {
				return 'baja'
			}
			if (numero >= 0.85) {
				return 'alta'
			}
			if (numero >= 0.6) {
				return 'media'
			}
			return 'baja'
		},
		porcentaje(valor) {
			let numero = Number(valor)
			if (isNaN(numero)) {
				return '0%'
			}
			return Math.round(numero * 100) + '%'
		},
		mostrar_numero(valor) {
			if (valor === null || typeof valor === 'undefined' || valor === '') {
				return '—'
			}
			return valor
		},
		etiqueta_clave(clave) {
			return ETIQUETAS_CLAVE[clave] || clave
		},
		etiqueta_criterio(criterio) {
			return ETIQUETAS_CRITERIO[criterio] || ''
		},
		/*
		 * Un artículo es "nuevo" cuando no quedó vinculado a ninguno del catálogo. Se
		 * mira `article_id` y no `match.estado` porque el usuario puede haberlo
		 * vinculado a mano recién, eligiendo un candidato.
		 *
		 * @param {Object} articulo
		 * @return {Boolean}
		 */
		es_nuevo(articulo) {
			return !articulo.article_id
		},
		/*
		 * True si esta fila, tal como está, la confirmación la va a tirar: está incluida,
		 * no quedó vinculada a ningún artículo del catálogo y no se pidió crearla. Es
		 * exactamente la condición con la que el backend saltea la fila.
		 *
		 * @param {Object} articulo
		 * @return {Boolean}
		 */
		se_descarta(articulo) {
			return articulo.incluir && this.es_nuevo(articulo) && articulo.crear_en_catalogo !== true
		},
		/*
		 * Cómo nombrar una fila en el aviso de descartes. Se usa lo que haya, en orden de
		 * utilidad para reconocerla en la factura.
		 *
		 * @param {Object} articulo
		 * @return {String}
		 */
		etiqueta_articulo(articulo) {
			let partes = []

			if (articulo.codigo_proveedor) {
				partes.push(articulo.codigo_proveedor)
			}
			if (articulo.nombre) {
				partes.push(articulo.nombre)
			}
			if (!partes.length && articulo.bar_code) {
				partes.push(articulo.bar_code)
			}
			if (!partes.length) {
				partes.push('Fila ' + (articulo.fila || '?'))
			}

			return partes.join(' — ')
		},
		/*
		 * Tilda "crear en el catálogo" en todas las filas que se iban a descartar. Es el
		 * atajo para el caso común: una factura con cinco artículos nuevos que el usuario
		 * sí quiere dar de alta.
		 */
		crear_todos_los_nuevos() {
			let self = this

			this.articulos.forEach(articulo => {
				if (self.se_descarta(articulo)) {
					self.$set(articulo, 'crear_en_catalogo', true)
				}
			})
		},
		/*
		 * Cómo se muestra una alícuota del sistema. La tabla `ivas` guarda el porcentaje
		 * como TEXTO, y no siempre es un número: hay filas 'Exento' y 'No Gravado'. Se
		 * agrega el % solo cuando lo que hay es un número.
		 *
		 * @param {Object} modelo  fila de la tabla `ivas`
		 * @return {String}
		 */
		etiqueta_iva(modelo) {
			let porcentaje = modelo.percentage

			if (porcentaje === null || typeof porcentaje === 'undefined' || porcentaje === '') {
				return '(sin porcentaje)'
			}

			let numero = Number(String(porcentaje).replace(',', '.'))

			return isNaN(numero) ? String(porcentaje) : String(porcentaje) + ' %'
		},
		/*
		 * El total de la línea con lo que hay cargado en la fila: cantidad × costo, menos
		 * el descuento. Null si falta cantidad o costo (no se inventa un total).
		 *
		 * @param {Object} articulo
		 * @return {Number|null}
		 */
		subtotal_calculado(articulo) {
			let cantidad = Number(articulo.cantidad)
			let costo = Number(articulo.costo_unitario)

			if (articulo.cantidad === null || articulo.costo_unitario === null || isNaN(cantidad) || isNaN(costo)) {
				return null
			}

			let descuento = Number(articulo.descuento_porcentaje)

			if (articulo.descuento_porcentaje === null || isNaN(descuento)) {
				descuento = 0
			}

			return cantidad * costo * (1 - (descuento / 100))
		},
		/*
		 * True cuando el total calculado y el que leyó la IA no dan lo mismo. Es la señal
		 * de que hay una bonificación sin cargar, o un número mal leído.
		 *
		 * @param {Object} articulo
		 * @return {Boolean}
		 */
		subtotal_difiere(articulo) {
			let calculado = this.subtotal_calculado(articulo)
			let leido = Number(articulo.total_linea)

			if (calculado === null || articulo.total_linea === null || isNaN(leido)) {
				return false
			}

			let tolerancia = Math.max(Math.abs(leido) * TOLERANCIA_TOTAL_LINEA, TOLERANCIA_TOTAL_LINEA_MINIMA)

			return Math.abs(calculado - leido) > tolerancia
		},
		/*
		 * @param {Object} articulo
		 * @return {String}
		 */
		subtotal_texto(articulo) {
			let calculado = this.subtotal_calculado(articulo)

			if (calculado === null) {
				return ''
			}

			let texto = '= ' + this.price(calculado)

			if (this.subtotal_difiere(articulo)) {
				texto = texto + ' ≠ ' + this.price(articulo.total_linea)
			}

			return texto
		},
		/*
		 * @param {Object} articulo
		 * @return {String}
		 */
		subtotal_title(articulo) {
			if (this.subtotal_difiere(articulo)) {
				return 'Cantidad × costo menos el descuento no da el importe que la factura dice para esta línea. Revisá la cantidad, el costo o el descuento.'
			}
			return 'Total de esta línea: cantidad × costo, menos el descuento.'
		},
		tiene_candidatos(articulo) {
			return !!(articulo.match && articulo.match.candidatos && articulo.match.candidatos.length)
		},
		opciones_candidatos(articulo) {
			let opciones = [{ value: null, text: '…o vincularlo a un artículo del catálogo' }]

			articulo.match.candidatos.forEach(candidato => {
				let texto = candidato.nombre
				if (candidato.provider_code) {
					texto = texto + ' (' + candidato.provider_code + ')'
				}
				opciones.push({ value: candidato.article_id, text: texto })
			})

			return opciones
		},
		/*
		 * Vincula la fila a un artículo del catálogo. Deja de ser "nueva" y, por lo
		 * tanto, deja de poder crear nada.
		 *
		 * @param {Object} articulo
		 * @param {Number} article_id
		 */
		vincular(articulo, article_id) {
			if (!article_id) {
				return
			}

			let candidato = articulo.match.candidatos.find(item => {
				return item.article_id === article_id
			})

			this.$set(articulo, 'article_id', article_id)
			this.$set(articulo, 'crear_en_catalogo', false)
			this.$set(articulo, 'match', {
				estado: 'encontrado',
				article_id: article_id,
				criterio: 'name',
				nombre_en_catalogo: candidato ? candidato.nombre : null,
				candidatos: [],
			})
		},
		url_imagen(orden) {
			return process.env.VUE_APP_API_URL + '/api/provider-order-scan/' + this.uuid + '/imagen/' + orden
		},
		/*
		 * Arma el request de confirmación y lo manda.
		 *
		 * Los artículos con `incluir: false` no viajan: filtrarlos acá es parte del
		 * contrato con el backend, que no recibe ningún flag de "no lo cargues".
		 */
		confirmar() {
			if (!this.uuid) {
				return
			}

			let advertencias = this.advertencias_de_confirmacion()

			if (!advertencias.length) {
				this.enviar_confirmacion()
				return
			}

			let self = this

			/*
			 * 🔴 Hay algo que se va a perder: se dice ANTES y con la puerta abierta para
			 * volver. El toast posterior ("se omitieron 5") llegaba cuando ya no había
			 * nada que hacer, y no decía cuáles.
			 */
			this.$bvModal.msgBoxConfirm(advertencias.join('\n\n'), {
				title: 'Confirmá que esto es lo que querés',
				okTitle: 'Confirmar igual',
				okVariant: 'danger',
				cancelTitle: 'Volver y revisar',
				centered: true,
				/*
				 * El mensaje va con saltos de línea de verdad. Sin esta clase el cuerpo del
				 * msgBox los colapsa y los cinco artículos quedan en un párrafo corrido
				 * imposible de leer. La clase está declarada en el <style> de este archivo,
				 * que no es scoped a propósito: el msgBox se monta afuera del componente.
				 */
				bodyClass: 'scan-review__confirmacion',
			})
			.then(confirmado => {
				if (!confirmado) {
					return
				}
				self.enviar_confirmacion()
			})
		},
		/*
		 * Arma la lista de cosas que la confirmación va a descartar. Vacía significa que
		 * lo que se ve en pantalla es exactamente lo que va a entrar en la compra.
		 *
		 * @return {Array}
		 */
		advertencias_de_confirmacion() {
			let advertencias = []

			if (this.articulos_que_se_descartan.length) {
				let nombres = this.descartes_a_mostrar.map(articulo => {
					return '• ' + this.etiqueta_articulo(articulo)
				})

				if (this.descartes_no_mostrados) {
					nombres.push('• …y ' + this.descartes_no_mostrados + ' más.')
				}

				advertencias.push(
					this.articulos_que_se_descartan.length + ' artículos NO se van a cargar, porque no están en el catálogo y no tienen tildado «Crear en el catálogo»:\n' + nombres.join('\n')
				)
			}

			if (this.ivas_sin_identificar) {
				advertencias.push(
					this.ivas_sin_identificar + ' filas del desglose de IVA no tienen alícuota elegida: no se van a guardar y su importe no va a sumar al IVA de la factura.'
				)
			}

			return advertencias
		},
		/*
		 * Manda el request de confirmación. Se separó de `confirmar()` porque el aviso
		 * previo es una promesa: sin el corte, el request salía igual mientras el usuario
		 * todavía estaba leyendo la advertencia.
		 */
		enviar_confirmacion() {
			let self = this

			let articulos = this.articulos
				.filter(articulo => {
					return articulo.incluir
				})
				.map(articulo => {
					return {
						article_id: articulo.article_id || null,
						crear_en_catalogo: articulo.crear_en_catalogo === true,
						bar_code: articulo.bar_code,
						codigo_proveedor: articulo.codigo_proveedor,
						nombre: articulo.nombre,
						cantidad: articulo.cantidad,
						costo_unitario: articulo.costo_unitario,
						/* La clave la fijó el contrato con la API: `descuento_porcentaje`. */
						descuento_porcentaje: articulo.descuento_porcentaje,
						/* Null = la alícuota que ya tiene el artículo en el catálogo. */
						iva_id: articulo.iva_id || null,
						notas: articulo.notas,
					}
				})

			let payload = {
				articulos: articulos,
				factura: {
					/*
					 * Se le hace caso al tilde, sea factura AFIP o remito cargado a mano.
					 * Lo único que lo apaga es no tener ningún dato que guardar, y en ese
					 * caso la casilla ya está deshabilitada y destildada en pantalla.
					 */
					guardar: this.va_a_guardar_factura,
					/*
					 * Solo tiene sentido si además se guarda: este flag le cambia el
					 * modo_facturacion a la compra, y hacerlo sin guardar ninguna factura
					 * sería reconfigurársela a cambio de nada.
					 */
					pasar_a_manual: this.va_a_guardar_factura && this.pasar_a_manual === true,
					code: this.factura.code,
					issued_at: this.factura.issued_at,
					emisor_cuit: this.factura.emisor_cuit,
					emisor_razon_social: this.factura.emisor_razon_social,
					total: this.factura.total,
					percepcion_iibb: this.factura.percepcion_iibb,
					percepcion_iva: this.factura.percepcion_iva,
					retencion_iibb: this.factura.retencion_iibb,
					retencion_iva: this.factura.retencion_iva,
					retencion_ganancias: this.factura.retencion_ganancias,
					ivas: this.ivas.map(iva => {
						return {
							iva_id: iva.iva_id,
							neto: iva.neto,
							iva_importe: iva.importe,
						}
					}),
				},
			}

			this.confirmando = true

			this.$api.post('provider-order-scan/' + this.uuid + '/confirmar', payload, {
				skip_global_error_event: true,
			})
			.then(res => {
				self.confirmando = false

				self.$toast.success(self.texto_resumen(res.data.resumen))

				if (res.data.model) {
					self.$store.commit('provider_order/add', res.data.model)
				}

				self.$store.dispatch('provider_order_scan/marcar_gestionado', {
					uuid: self.uuid,
					provider_order_id: self.provider_order_id,
				})

				self.$bvModal.hide('scan-invoice-review')
			})
			.catch(err => {
				self.confirmando = false

				let respuesta = err.response
				let mensaje = respuesta && respuesta.data && respuesta.data.message
					? respuesta.data.message
					: 'No se pudo cargar el escaneo en la compra.'

				self.$toast.error(mensaje)
			})
		},
		/*
		 * @param {Object} resumen  { articulos_agregados, articulos_creados, articulos_omitidos, factura_guardada, factura_motivo }
		 * @return {String}
		 */
		texto_resumen(resumen) {
			let datos = resumen || {}
			let partes = []

			partes.push('Se cargaron ' + (datos.articulos_agregados || 0) + ' artículos')

			if (datos.articulos_creados) {
				partes.push('se crearon ' + datos.articulos_creados + ' nuevos')
			}

			if (datos.articulos_omitidos) {
				partes.push('se omitieron ' + datos.articulos_omitidos)
			}

			if (datos.factura_guardada === 'completa') {
				partes.push('se guardó la factura')
			} else if (datos.factura_guardada === 'parcial') {
				partes.push('la factura se guardó en parte')
			} else if (datos.factura_guardada === 'no') {
				partes.push('la factura no se guardó' + (datos.factura_motivo ? ' (' + datos.factura_motivo + ')' : ''))
			}

			return partes.join(', ') + '.'
		},
		/*
		 * Descartar existe porque si no, un escaneo que salió mal (foto borrosa,
		 * documento equivocado) deja el botón rojo prendido para siempre.
		 */
		descartar() {
			if (!this.uuid) {
				return
			}

			let self = this

			this.$bvModal.msgBoxConfirm('¿Descartás este escaneo? No se carga nada en la compra y el aviso se apaga.', {
				title: 'Descartar escaneo',
				okTitle: 'Descartar',
				okVariant: 'danger',
				cancelTitle: 'Volver',
				centered: true,
			})
			.then(confirmado => {
				if (!confirmado) {
					return
				}

				self.descartando = true

				self.$store.dispatch('provider_order_scan/descartar', self.uuid)
				.then(() => {
					self.descartando = false
					self.$toast.success('Escaneo descartado.')
					self.$bvModal.hide('scan-invoice-review')
				})
				.catch(err => {
					self.descartando = false
					console.log(err)
					self.$toast.error('No se pudo descartar el escaneo.')
				})
			})
		},
		/*
		 * Cerrar deja el escaneo pendiente y el botón rojo prendido: es la salida del
		 * que quiere seguir después.
		 */
		cerrar() {
			this.$bvModal.hide('scan-invoice-review')
		},
	},
}
</script>
<style lang="sass">
.scan-review
	font-size: 0.9rem

	&__cargando
		padding: 24px
		text-align: center
		color: #64748b

	&__bloque
		margin-bottom: 22px

	&__titulo
		display: flex
		flex-direction: row
		flex-wrap: wrap
		align-items: center
		gap: 10px
		font-weight: 700
		margin-bottom: 10px

	&__subtitulo
		font-weight: 600
		font-size: 0.85rem
		margin: 14px 0 8px 0

	&__toggle
		padding: 0
		font-size: 0.8rem

	&__contadores
		font-weight: 400
		font-size: 0.8rem
		color: #64748b

	&__contadores-alerta
		color: #b91c1c
		font-weight: 700

	// Letra chica que explica por qué un control está apagado o qué pasa si no se
	// toca. No es un error: es la aclaración que evita que alguien tilde algo y no
	// entienda por qué no pasó nada.
	&__nota
		font-size: 0.78rem
		color: #64748b

	// Aviso de que algo se va a perder, adentro de su bloque. Es distinto de un
	// b-alert entero: no interrumpe la lectura, pero se ve.
	&__alerta-inline
		margin: 10px 0 0 0
		padding: 8px 10px
		border-radius: 8px
		font-size: 0.8rem
		background: rgba(217, 119, 6, 0.12)
		border: 1px solid rgba(217, 119, 6, 0.4)
		color: #b45309

	&__lista-descartes
		margin: 0 0 12px 0
		padding-left: 18px
		font-size: 0.82rem

	&__vacio
		color: #94a3b8
		font-size: 0.85rem
		margin: 0

	&__aviso
		font-size: 0.85rem

	&__label
		display: block
		font-size: 0.72rem
		text-transform: uppercase
		letter-spacing: 0.02em
		color: #64748b
		margin-bottom: 2px

	// --- Chips de columnas detectadas -------------------------------------------
	&__chips
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 8px

	&__chip
		display: inline-flex
		flex-direction: row
		align-items: center
		gap: 6px
		padding: 4px 10px
		border-radius: 999px
		font-size: 0.78rem
		border: 1px solid transparent
		// Un chip de columna puede tener un encabezado largo: que envuelva adentro del
		// modal en vez de estirar la fila y sacar el bloque del ancho disponible.
		max-width: 100%
		overflow-wrap: anywhere

		&--alta
			background: rgba(5, 150, 105, 0.12)
			border-color: rgba(5, 150, 105, 0.4)
			color: #047857

		&--media
			background: rgba(217, 119, 6, 0.12)
			border-color: rgba(217, 119, 6, 0.4)
			color: #b45309

		&--baja
			background: rgba(220, 38, 38, 0.12)
			border-color: rgba(220, 38, 38, 0.4)
			color: #b91c1c

	&__chip-flecha
		opacity: 0.6

	&__chip-pct
		font-weight: 700

	&__avisos
		margin: 10px 0 0 0
		padding-left: 18px
		font-size: 0.8rem
		color: #64748b

	// --- Comprobante -------------------------------------------------------------
	&__factura
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))
		gap: 10px

	&__leido
		margin: 10px 0 0 0
		font-size: 0.78rem
		color: #64748b

	&__iva
		display: grid
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))
		gap: 10px
		padding: 8px 0
		border-bottom: 1px solid rgba(100, 116, 139, 0.15)

		// La fila sin alícuota elegida es la que el backend va a saltear: se marca
		// entera, no solo el selector, porque lo que se pierde es el renglón completo.
		&--sin-identificar
			background: rgba(217, 119, 6, 0.1)
			border-left: 3px solid rgba(217, 119, 6, 0.6)
			padding-left: 8px

	// Lo que la IA leyó en el papel, abajo del selector. Sirve para decidir sin volver
	// a la foto cuando el porcentaje leído no matcheó contra ninguna alícuota.
	&__iva-leido
		display: block
		margin-top: 3px
		font-size: 0.72rem
		color: #64748b

	// --- Tabla de artículos ------------------------------------------------------
	&__tabla
		display: flex
		flex-direction: column
		gap: 4px

	&__fila
		display: grid
		// 6px y no 8px: desde que la tabla tiene diez columnas (entraron descuento e
		// IVA), dos píxeles por hueco son catorce píxeles de nombre de artículo.
		gap: 6px
		align-items: start
		padding: 6px 8px
		border-radius: 8px
		border: 1px solid rgba(100, 116, 139, 0.18)
		// Diez columnas de datos + la del "+", que solo se ve en el ancho intermedio.
		// Orden: check, cód. proveedor, cód. barras, nombre, cantidad, costo, descuento,
		// IVA, estado, notas.
		grid-template-columns: 34px 1fr 1fr 1.9fr 0.6fr 1.05fr 0.6fr 0.95fr 1.6fr 0.95fr

		&--nueva
			background: rgba(220, 38, 38, 0.06)
			border-color: rgba(220, 38, 38, 0.28)

		&--excluida
			opacity: 0.5

	&__cabecera
		border: 0
		background: transparent
		font-size: 0.72rem
		text-transform: uppercase
		letter-spacing: 0.02em
		color: #64748b
		font-weight: 600
		padding-bottom: 0

	&__celda
		min-width: 0

		// Los selectores de alícuota viven adentro de una celda angosta: se achican
		// para no forzar un scroll horizontal en la fila.
		.custom-select
			font-size: 0.78rem
			padding-left: 6px
			padding-right: 18px

		// El "+" del ancho intermedio: apagado en los otros dos anchos.
		&--mas
			display: none

		// La celda de estado apila badge, casilla y selector, así que necesita el
		// ancho completo de su columna y no puede alinearse al centro.
		&--estado
			min-width: 0

			// 🔴 El `.badge` de Bootstrap trae `white-space: nowrap`, y en una grilla las
			// pistas `fr` son `minmax(auto, Nfr)`: el mínimo `auto` es el min-content del
			// contenido, así que un badge que no envuelve ENSANCHA su columna y empuja la
			// fila entera más allá del modal. Con un nombre de catálogo largo
			// ("Martillo acero galvanizado 500g mango de fibra") pasa de una. Es el mismo
			// defecto que ya se comió una corrida en este proyecto, y aparece justo en el
			// ancho del medio, donde la columna es la mitad de ancha que a 1200px.
			.badge
				white-space: normal
				overflow-wrap: anywhere
				text-align: left

	// Total de la línea calculado, abajo del costo. El estado "difiere" es lo único
	// que grita: significa que lo que se va a asentar no es lo que dice el papel.
	&__subtotal
		display: block
		margin-top: 2px
		font-size: 0.72rem
		color: #64748b
		overflow-wrap: anywhere

		&--difiere
			color: #b91c1c
			font-weight: 700

	// Marca de que confirmar así tira esta fila.
	&__descarte
		display: block
		margin-top: 4px
		font-size: 0.72rem
		font-weight: 700
		color: #b91c1c

	&__criterio
		display: block
		font-size: 0.72rem
		color: #64748b
		margin-top: 2px

	&__crear
		margin-top: 4px
		font-size: 0.78rem

	&__candidatos
		margin-top: 4px
		font-size: 0.78rem

	// El bloque de las dos columnas escondidas: apagado salvo en el ancho intermedio.
	&__extra
		display: none

	&__extra-campo
		min-width: 0

	// --- Fotos --------------------------------------------------------------------
	&__fotos
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 12px

	&__foto
		flex: 1 1 260px
		max-width: 100%
		margin: 0

		img
			width: 100%
			border-radius: 8px
			border: 1px solid rgba(100, 116, 139, 0.25)

		figcaption
			font-size: 0.75rem
			color: #64748b
			margin-top: 4px

	// --- Pie ----------------------------------------------------------------------
	&__pie
		display: flex
		flex-direction: row
		flex-wrap: wrap
		justify-content: flex-end
		gap: 10px
		padding-top: 12px
		border-top: 1px solid rgba(100, 116, 139, 0.2)

// ─── Ancho intermedio (768–1199px) ───────────────────────────────────────────────
// Acá es donde se esconden los defectos: se prueba en 1366 y en 375 y nadie mira el
// medio. Se sacan las TRES columnas menos usadas (código de barras, IVA y notas) y se
// ofrecen desde el "+" de la fila. El descuento se queda arriba a propósito: es plata
// del renglón, no un dato de referencia.
@media (min-width: 768px) and (max-width: 1199.98px)
	.scan-review__fila
		// check, cód. proveedor, nombre, cantidad, costo, descuento, estado, "+".
		grid-template-columns: 34px 1fr 2.1fr 0.65fr 1fr 0.6fr 1.7fr 40px

	.scan-review__celda--secundaria
		display: none

	.scan-review__celda--mas
		display: block

	.scan-review__fila--expandida .scan-review__extra
		display: grid
		grid-column: 1 / -1
		// auto-fit y no dos columnas fijas: los campos escondidos pasaron de dos a
		// tres, y con `repeat(2, ...)` el tercero quedaba solo, estirado a media fila.
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))
		gap: 10px
		margin-top: 6px
		padding-top: 6px
		border-top: 1px dashed rgba(100, 116, 139, 0.3)

// ─── Teléfono (<768px) ───────────────────────────────────────────────────────────
// La tabla deja de ser una tabla: cada artículo es una tarjeta con las etiquetas a la
// izquierda y el valor editable a la derecha. Ocho columnas a 360px no se editan con
// el dedo, y un scroll horizontal esconde justo la columna que se está por tocar.
@media (max-width: 767.98px)
	.scan-review__cabecera
		display: none

	.scan-review__fila
		grid-template-columns: minmax(0, 1fr)
		gap: 4px
		padding: 10px
		border-color: rgba(100, 116, 139, 0.3)

	.scan-review__celda
		display: grid
		grid-template-columns: 40% minmax(0, 60%)
		align-items: center
		gap: 8px
		padding: 2px 0

		&::before
			content: attr(data-label)
			font-size: 0.72rem
			text-transform: uppercase
			letter-spacing: 0.02em
			color: #64748b

	.scan-review__celda--estado
		grid-template-columns: minmax(0, 1fr)

		&::before
			margin-bottom: 4px

	// 🔴 En tarjeta, la celda del costo tiene TRES hijos (la etiqueta del ::before, el
	// valor editable y el total de la línea) adentro de una grilla de dos columnas. Sin
	// esto, el tercero cae solo en la columna de la etiqueta y el total aparece a la
	// izquierda, abajo del rótulo "Costo unitario", como si fuera otra etiqueta.
	// Mandándolo a la columna 2 queda debajo del valor, que es donde se lo busca.
	.scan-review__subtotal
		grid-column: 2

	// 🔴 Esta línea no es redundante. La regla de arriba le pone `display: grid` a
	// TODA celda y empata en especificidad con el `display: none` del "+" declarado
	// afuera del @media, así que gana por venir después: sin esto, el botón de
	// "ver código de barras y notas" reaparece justo en el ancho donde esas dos
	// columnas ya se ven enteras, y abre un colapso vacío.
	.scan-review__celda--mas
		display: none

	.scan-review__pie
		flex-direction: column-reverse

		.btn
			width: 100%

// El cuerpo del msgBox de "confirmá que esto es lo que querés". Se declara acá y
// afuera de `.scan-review` porque ese modal lo monta bootstrap-vue al final del body,
// fuera del árbol de este componente. `pre-line` es lo que hace que la lista de
// artículos a descartar se lea como una lista y no como un párrafo corrido.
.scan-review__confirmacion
	white-space: pre-line
	font-size: 0.88rem

html.dark-mode .scan-review
	&__label,
	&__contadores,
	&__criterio,
	&__leido,
	&__nota,
	&__subtotal,
	&__iva-leido,
	&__avisos
		color: #94a3b8

	// Los tres rojos y el ámbar se aclaran: el #b91c1c del modo claro sobre fondo
	// oscuro queda ilegible, que es justo lo contrario de lo que estas marcas hacen.
	&__subtotal--difiere,
	&__descarte,
	&__contadores-alerta
		color: #f87171

	&__alerta-inline
		color: #fbbf24

	&__fila
		border-color: var(--color-border)
</style>
