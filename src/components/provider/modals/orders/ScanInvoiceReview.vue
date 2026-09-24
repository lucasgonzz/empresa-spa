<template>
	<b-modal
	id="scan-invoice-review"
	size="xl"
	title="Revisar el escaneo"
	hide-footer
	no-close-on-backdrop
	@show="construir">
		<div
		class="scan-review"
		data-tour="compras.modal_revision_escaneo">

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
					<div
					class="scan-review__chips"
					data-tour="compras.chips_columnas_detectadas">
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

				<b-alert
				v-if="!es_factura_afip"
				show
				variant="secondary"
				class="scan-review__aviso">
					No se detectaron datos de factura AFIP. Si querés guardar el comprobante igual
					—un remito, por ejemplo—, cargá el número y la fecha a mano en el comprobante de
					abajo y dejá tildado «guardar». Si no, se cargan solo los artículos.
				</b-alert>

				<!-- ─── 2. El comprobante, dibujado como una factura de ARCA ──────── -->
				<!--
					Un solo marco con las divisiones del papel: franja de título, cabecera en
					dos mitades con la letra en el medio, receptor, renglones y totales. Cuando
					la casilla de guardar está destildada, cabecera y totales se atenúan (lo
					que no se guarda se ve apagado), pero siguen editables: destildar no
					debería castigar al que después cambia de idea.
				-->
				<div
				class="scan-review__comprobante"
				:class="{ 'scan-review__comprobante--sin-guardar': !va_a_guardar_factura }">

					<!-- Franja superior: título y casilla de guardar -->
					<div class="scan-review__franja-titulo">
						<span class="scan-review__franja-texto">Comprobante escaneado</span>

						<div class="scan-review__guardar">
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
							:disabled="!hay_datos_de_comprobante">
								Guardar los datos del comprobante en la compra
							</b-form-checkbox>

							<p
							v-if="!hay_datos_de_comprobante"
							class="scan-review__nota m-b-0">
								Cargá al menos el número, la fecha o el total del comprobante para poder guardarlo.
							</p>
						</div>
					</div>

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
					class="scan-review__aviso scan-review__aviso-modo">
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

					<!-- Cabecera: emisor | letra | datos del comprobante -->
					<div class="scan-review__encabezado scan-review__atenuable">

						<div class="scan-review__mitad scan-review__mitad--emisor">
							<div
							class="scan-review__emisor-nombre"
							:class="{ 'scan-review__emisor-nombre--vacio': !factura.emisor_razon_social }">
								{{ factura.emisor_razon_social || 'Emisor sin identificar' }}
							</div>
							<div class="scan-review__dato">
								<span class="scan-review__dato-label">Razón Social:</span>
								<editable-cell
								:value="factura.emisor_razon_social"
								:dudoso="campo_dudoso(factura, 'emisor_razon_social')"
								@input="set_campo_factura('emisor_razon_social', $event)"></editable-cell>
							</div>
						</div>

						<!--
							El recuadro de la letra cuelga de la franja de título y de él baja la
							línea que parte la cabecera en dos, como en el papel. Es una columna
							propia de la grilla (y no un absoluto encima del borde) para que las
							dos mitades nunca le pasen por debajo con un nombre largo.
						-->
						<div class="scan-review__letra-columna">
							<div
							class="scan-review__letra"
							:class="{ 'scan-review__letra--sin-letra': !letra_comprobante }"
							:title="letra_comprobante ? 'Letra del comprobante (solo lectura)' : 'La IA no identificó la letra del comprobante'">
								<span class="scan-review__letra-valor">{{ letra_comprobante || 'X' }}</span>
								<span
								v-if="codigo_letra"
								class="scan-review__letra-cod">
									COD. {{ codigo_letra }}
								</span>
							</div>
							<div class="scan-review__letra-linea"></div>
						</div>

						<div class="scan-review__mitad scan-review__mitad--comprobante">
							<div class="scan-review__tipo">{{ es_factura_afip ? 'FACTURA' : 'COMPROBANTE' }}</div>

							<div class="scan-review__dato-fila">
								<div class="scan-review__dato">
									<span class="scan-review__dato-label">Punto de Venta:</span>
									<editable-cell
									:value="factura.punto_venta"
									:dudoso="campo_dudoso(factura, 'punto_venta') || campo_dudoso(factura, 'code')"
									@input="set_numeracion('punto_venta', $event)"></editable-cell>
								</div>
								<div class="scan-review__dato">
									<span class="scan-review__dato-label">Comp. Nro:</span>
									<editable-cell
									:value="factura.numero"
									:dudoso="campo_dudoso(factura, 'numero') || campo_dudoso(factura, 'code')"
									@input="set_numeracion('numero', $event)"></editable-cell>
								</div>
							</div>

							<div class="scan-review__dato">
								<span class="scan-review__dato-label">Fecha de Emisión:</span>
								<editable-cell
								:value="factura.issued_at"
								tipo="fecha"
								:dudoso="campo_dudoso(factura, 'issued_at')"
								@input="set_campo_factura('issued_at', $event)"></editable-cell>
							</div>

							<div class="scan-review__dato">
								<span class="scan-review__dato-label">CUIT:</span>
								<editable-cell
								:value="factura.emisor_cuit"
								:dudoso="campo_dudoso(factura, 'emisor_cuit')"
								@input="set_campo_factura('emisor_cuit', $event)"></editable-cell>
							</div>
						</div>
					</div>

					<!--
						Receptor: el propio comercio. Solo lectura e informativo — el CUIT es el
						que leyó la IA, y sirve para darse cuenta de una factura que en realidad
						no está hecha a nombre de este negocio.
					-->
					<div class="scan-review__receptor scan-review__atenuable">
						<div class="scan-review__dato">
							<span class="scan-review__dato-label">CUIT:</span>
							<span class="scan-review__dato-valor">{{ formatear_cuit(resultado_factura.receptor_cuit) }}</span>
						</div>
						<div class="scan-review__dato">
							<span class="scan-review__dato-label">Apellido y Nombre / Razón Social:</span>
							<span class="scan-review__dato-valor">{{ nombre_receptor }}</span>
						</div>
					</div>

					<!-- ─── 3. Los renglones (los artículos) ──────────────────────────── -->
					<div class="scan-review__renglones-resumen">
						{{ contadores.total }} artículos ·
						{{ contadores.encontrados }} encontrados ·
						{{ contadores.nuevos }} nuevos ·
						{{ contadores.excluidos }} excluidos
						<span
						v-if="contadores.se_descartan"
						class="scan-review__contadores-alerta">
							· {{ contadores.se_descartan }} se descartan
						</span>
					</div>

					<p
					v-if="!articulos.length"
					class="scan-review__vacio scan-review__vacio--renglones">
						La IA no pudo leer ningún artículo de estas fotos.
					</p>

					<div
					v-else
					class="scan-review__tabla"
					data-tour="compras.tabla_escaneo">

						<div class="scan-review__fila scan-review__cabecera">
							<div class="scan-review__celda scan-review__celda--check">&nbsp;</div>
							<div class="scan-review__celda">Código</div>
							<div class="scan-review__celda">Producto / Servicio</div>
							<div class="scan-review__celda scan-review__celda--numero">Cantidad</div>
							<div class="scan-review__celda scan-review__celda--numero">Precio Unit.</div>
							<div class="scan-review__celda scan-review__celda--numero">% Bonif</div>
							<div class="scan-review__celda scan-review__celda--numero">Subtotal</div>
							<div class="scan-review__celda scan-review__celda--alicuota">Alícuota IVA</div>
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
							data-label="Código">
								<editable-cell
								:value="articulo.codigo_proveedor"
								:dudoso="campo_dudoso(articulo, 'codigo_proveedor')"
								@input="$set(articulo, 'codigo_proveedor', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda"
							data-label="Producto / Servicio">
								<editable-cell
								:value="articulo.nombre"
								:dudoso="campo_dudoso(articulo, 'nombre')"
								@input="$set(articulo, 'nombre', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda scan-review__celda--numero"
							data-label="Cantidad">
								<editable-cell
								:value="articulo.cantidad"
								tipo="numero"
								:dudoso="campo_dudoso(articulo, 'cantidad')"
								@input="$set(articulo, 'cantidad', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda scan-review__celda--numero"
							data-label="Precio Unit.">
								<editable-cell
								:value="articulo.costo_unitario"
								tipo="numero"
								:dudoso="campo_dudoso(articulo, 'costo_unitario')"
								@input="$set(articulo, 'costo_unitario', $event)"></editable-cell>
							</div>

							<div
							class="scan-review__celda scan-review__celda--numero"
							data-label="% Bonif">
								<editable-cell
								:value="articulo.descuento_porcentaje"
								tipo="numero"
								placeholder="0"
								:dudoso="campo_dudoso(articulo, 'descuento_porcentaje')"
								@input="$set(articulo, 'descuento_porcentaje', $event)"></editable-cell>
							</div>

							<!--
								El total de la línea calculado con lo que hay en la fila
								(cantidad × costo − descuento), contra el importe que la IA
								leyó de la factura. Es el control de magnitud: si los dos
								números no coinciden, hay algo mal leído o una bonificación
								que no se cargó, y se ve ACÁ y no cuando la deuda del
								proveedor ya quedó $2.940 más alta.

								Valor y marca van en una sola caja: en tarjeta la celda es una
								grilla de dos columnas (etiqueta | valor), y un tercer hijo suelto
								caería abajo de la etiqueta como si fuera otra.
							-->
							<div
							class="scan-review__celda scan-review__celda--numero"
							data-label="Subtotal">
								<span
								class="scan-review__subtotal"
								:class="{ 'scan-review__subtotal--difiere': subtotal_difiere(articulo) }"
								:title="subtotal_title(articulo)">
									<span class="scan-review__subtotal-valor">{{ subtotal_texto(articulo) || '—' }}</span>
									<span
									v-if="subtotal_leido_texto(articulo)"
									class="scan-review__subtotal-leido">
										{{ subtotal_leido_texto(articulo) }}
									</span>
								</span>
							</div>

							<div
							class="scan-review__celda scan-review__celda--alicuota"
							data-label="Alícuota IVA">
								<b-form-select
								size="sm"
								:value="articulo.iva_id"
								:options="opciones_ivas_articulo"
								@change="$set(articulo, 'iva_id', $event)"></b-form-select>
							</div>

							<div class="scan-review__celda scan-review__celda--mas">
								<b-button
								size="sm"
								variant="outline-secondary"
								:class="{ 'scan-review__mas--dudoso': extra_dudoso(articulo) }"
								:title="extra_dudoso(articulo) ? 'Hay un dato dudoso en el código de barras o en las notas: revisalo' : (articulo.expandida ? 'Ocultar código de barras y notas' : 'Ver código de barras y notas')"
								@click="$set(articulo, 'expandida', !articulo.expandida)">
									{{ articulo.expandida ? '−' : '+' }}
								</b-button>
							</div>

							<!--
								El estado del matcheo va en una sub-línea debajo del renglón, desde
								la columna Producto hasta el final, y no como columna: la tabla
								tiene que leerse como la factura, y el estado no está en el papel.
							-->
							<div class="scan-review__estado">
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

							<!--
								Lo que no es columna de una factura: código de barras y notas, en
								todos los anchos de escritorio, más la alícuota entre 768 y 991px,
								donde ya no entra como columna. Vive en su propio bloque, después de
								todas las celdas, y no reusa las de arriba: si a una celda del medio
								de la grilla se le da ancho completo, empuja a las que vienen
								después a otra fila y la tabla se desarma.

								En teléfono este bloque se ve siempre, como parte de la tarjeta, y
								el "+" desaparece: ahí no hay columnas que ahorrar.
							-->
							<div class="scan-review__extra">
								<div class="scan-review__extra-campo">
									<label class="scan-review__label">Cód. barras</label>
									<editable-cell
									:value="articulo.bar_code"
									:dudoso="campo_dudoso(articulo, 'bar_code')"
									@input="$set(articulo, 'bar_code', $event)"></editable-cell>
								</div>
								<div class="scan-review__extra-campo scan-review__extra-campo--alicuota">
									<label class="scan-review__label">Alícuota IVA</label>
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

					<!-- ─── 4. Totales, abajo a la derecha como en el papel ──────────── -->
					<div class="scan-review__pie-factura">
						<div class="scan-review__totales scan-review__atenuable">

							<div class="scan-review__total-linea">
								<span class="scan-review__total-label">Importe Neto Gravado: $</span>
								<span class="scan-review__total-valor">{{ mostrar_importe(neto_gravado_desglose) }}</span>
							</div>

							<p
							v-if="!ivas.length"
							class="scan-review__vacio scan-review__vacio--totales">
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
								<div class="scan-review__iva-campo scan-review__iva-campo--alicuota">
									<span class="scan-review__total-label">IVA</span>
									<div class="scan-review__iva-selector">
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
								</div>
								<div class="scan-review__iva-campo">
									<span class="scan-review__total-label scan-review__total-label--chica">Neto: $</span>
									<editable-cell
									:value="iva.neto"
									tipo="numero"
									@input="$set(ivas[index], 'neto', $event)"></editable-cell>
								</div>
								<div class="scan-review__iva-campo">
									<span class="scan-review__total-label scan-review__total-label--chica">IVA: $</span>
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

							<div class="scan-review__total-linea">
								<span class="scan-review__total-label">Percepción IIBB: $</span>
								<editable-cell
								:value="factura.percepcion_iibb"
								tipo="numero"
								:dudoso="campo_dudoso(factura, 'percepcion_iibb')"
								@input="set_campo_factura('percepcion_iibb', $event)"></editable-cell>
							</div>

							<div class="scan-review__total-linea">
								<span class="scan-review__total-label">Percepción IVA: $</span>
								<editable-cell
								:value="factura.percepcion_iva"
								tipo="numero"
								:dudoso="campo_dudoso(factura, 'percepcion_iva')"
								@input="set_campo_factura('percepcion_iva', $event)"></editable-cell>
							</div>

							<div class="scan-review__total-linea scan-review__total-linea--total">
								<span class="scan-review__total-label">Importe Total: $</span>
								<editable-cell
								:value="factura.total"
								tipo="numero"
								:dudoso="campo_dudoso(factura, 'total')"
								@input="set_campo_factura('total', $event)"></editable-cell>
							</div>

							<!--
								🔴 Lo que el backend hace con el total y la pantalla no decía: con
								desglose, el total que se guarda es Σ(neto + IVA) + percepciones, y
								el impreso se ignora. Si no coinciden, se dice acá cuál entra.
							-->
							<p
							v-if="total_guardado_difiere"
							class="scan-review__total-guardado">
								El total que se va a guardar sale del desglose: $ {{ mostrar_importe(total_que_se_guarda) }}
							</p>
						</div>

						<p class="scan-review__leido">
							Leído en el papel: neto {{ mostrar_numero(resultado_factura.neto_gravado) }} ·
							IVA {{ mostrar_numero(resultado_factura.total_iva) }} ·
							certeza {{ porcentaje(resultado_factura.confianza) }}
						</p>
					</div>
				</div>

				<!-- ─── 5. Las fotos, para cotejar mientras se corrige ─────────────── -->
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

				<!-- ─── 6. Lo que se va a perder si confirma así ───────────────────── -->
				<!--
					🔴 Este bloque es lo que faltaba: el resumen de lo que la confirmación va
					a tirar, ANTES de confirmar. El backend saltea sin avisar toda fila sin
					`article_id` y sin `crear_en_catalogo`, y el único aviso era un
					"se omitieron 5" en el toast posterior, que no dice cuáles y llega cuando
					ya no hay vuelta atrás. Acá se listan por nombre, y hay un botón para
					resolver los cinco de una.
				-->
				<b-alert
				data-tour="compras.aviso_descartes"
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

				<!-- ─── 7. Pie ─────────────────────────────────────────────────────── -->
				<div class="scan-review__pie">
					<b-button
					variant="primary"
					:disabled="confirmando || descartando || !hay_algo_para_cargar"
					data-tour="compras.boton_confirmar_escaneo"
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
import { env } from '@/runtime_config'
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
 * El comprobante se dibuja como una factura de ARCA/AFIP (misión
 * factura-escaneada-diseno-afip, 24/9/2026): marco, franja de título, cabecera en dos
 * mitades con el recuadro de la letra en el medio, franja del receptor, renglones y
 * recuadro de totales abajo a la derecha. No es decoración: el usuario tiene el papel al
 * lado y encuentra cada dato donde lo busca en el papel, en vez de leer una grilla de
 * campos sueltos y adivinar cuál es cuál.
 *
 * Responsive (es la parte más frágil de la pantalla, y el ancho del medio es donde se
 * esconden los defectos):
 *  - ≥992px: la tabla con las siete columnas de la factura (Código, Producto, Cantidad,
 *    Precio Unit., % Bonif, Subtotal, Alícuota IVA). Código de barras y notas no son
 *    columnas de una factura: viven en el "+" de la fila en todos los anchos de escritorio.
 *  - 768–991px: la alícuota tampoco entra y se suma al "+". El descuento se queda arriba:
 *    es plata del renglón, no un dato de referencia.
 *  - <768px: la cabecera se apila y la tabla se vuelve tarjetas. Una tabla de siete
 *    columnas a 360px no se puede editar con el dedo, y un scroll horizontal no resuelve
 *    nada: esconde justamente la columna que se está por tocar.
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

/*
 * Cuánto puede diferir el total que se va a guardar (el que sale del desglose) del total
 * impreso antes de avisarlo. Medio peso: menos que eso es redondeo del papel.
 */
const TOLERANCIA_TOTAL_COMPROBANTE = 0.5

/*
 * El código de ARCA que acompaña a la letra en el recuadro del medio. Solo las tres
 * facturas que un comercio recibe de un proveedor; para cualquier otra letra el recuadro
 * muestra la letra sola, sin inventarle un código.
 */
const CODIGOS_POR_LETRA = {
	A: '01',
	B: '06',
	C: '11',
}

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
			mostrar_fotos: false,
			confirmando: false,
			descartando: false,
			/*
			 * El toggle "Mostrar/Ocultar" del comprobante (`mostrar_factura`) y la lista
			 * `campos_factura` que alimentaba una grilla de campos sueltos se fueron con el
			 * rediseño: el comprobante ES la pantalla, y cada campo vive en el template en el
			 * lugar donde está en el papel. El comentario de las retenciones que colgaba de
			 * esa lista se mudó a `construir()`, donde se arma la copia de la factura.
			 */
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
		/*
		 * La letra del comprobante para el recuadro del medio. La IA la devuelve casi
		 * siempre sola ("A"), pero a veces con el nombre adelante ("Factura A"): se toma
		 * la última palabra si es una letra sola. Cualquier otra cosa es null, y el
		 * recuadro muestra la X gris de "no la identificó" — mejor eso que una letra
		 * inventada, que es justo lo que el usuario usaría para decidir si le sirve el
		 * crédito fiscal.
		 *
		 * Es solo lectura y no viaja: el contrato de la confirmación no tiene dónde
		 * guardarla.
		 *
		 * @return {String|null}
		 */
		letra_comprobante() {
			let tipo = this.resultado_factura.tipo_comprobante

			if (tipo === null || typeof tipo === 'undefined') {
				return null
			}

			let coincidencia = String(tipo).trim().toUpperCase().match(/(?:^|\s)([A-Z])$/)

			return coincidencia ? coincidencia[1] : null
		},
		/* "COD. 01" abajo de la A, como en el papel. Null para una letra sin código conocido. */
		codigo_letra() {
			if (!this.letra_comprobante) {
				return null
			}
			return CODIGOS_POR_LETRA[this.letra_comprobante] || null
		},
		/*
		 * La razón social del receptor, que es el propio comercio. Mismo criterio que
		 * `asistente-ia/FloatingButton.vue` (el nombre del dueño, y si no, el del
		 * usuario): un empleado ve el nombre del negocio, no el suyo.
		 *
		 * @return {String}
		 */
		nombre_receptor() {
			if (this.owner && this.owner.company_name) {
				return this.owner.company_name
			}
			if (this.user && this.user.company_name) {
				return this.user.company_name
			}
			return '—'
		},
		/*
		 * El "Importe Neto Gravado" del recuadro de totales: la suma de los netos del
		 * desglose tal como está en pantalla (se recalcula al editar un neto). Null sin
		 * desglose, para mostrar "—" en vez de un cero que parece un dato.
		 *
		 * @return {Number|null}
		 */
		neto_gravado_desglose() {
			if (!this.ivas.length) {
				return null
			}

			return this.ivas.reduce((suma, iva) => {
				let neto = Number(iva.neto)
				return suma + (isNaN(neto) ? 0 : neto)
			}, 0)
		},
		/*
		 * El total que el backend va a guardar de verdad, calculado igual que él
		 * (`FacturaDeCompraHelper::guardar_totales`): con desglose, Σ(neto + IVA) de las
		 * filas + percepciones, y el total impreso se ignora. Solo cuentan las filas con
		 * alícuota elegida, porque las otras el backend ni las crea.
		 *
		 * Null cuando no hay ninguna fila que sobreviva: ahí manda el total impreso y no
		 * hay nada que avisar.
		 *
		 * @return {Number|null}
		 */
		total_que_se_guarda() {
			let filas = this.ivas.filter(iva => {
				return !!iva.iva_id
			})

			if (!filas.length) {
				return null
			}

			let total = filas.reduce((suma, iva) => {
				let neto = Number(iva.neto)
				let importe = Number(iva.importe)
				return suma + (isNaN(neto) ? 0 : neto) + (isNaN(importe) ? 0 : importe)
			}, 0)

			let percepcion_iibb = Number(this.factura.percepcion_iibb)
			let percepcion_iva = Number(this.factura.percepcion_iva)

			total += isNaN(percepcion_iibb) ? 0 : percepcion_iibb
			total += isNaN(percepcion_iva) ? 0 : percepcion_iva

			return Math.round(total * 100) / 100
		},
		/*
		 * 🔴 True cuando lo que se va a guardar no es el total que el usuario ve impreso.
		 * La pantalla mostraba el total del papel como si fuera el que entraba, y el
		 * backend lo pisaba con la suma del desglose sin decir nada: un neto mal leído
		 * movía la deuda con el proveedor con el total "correcto" a la vista. También
		 * avisa si el total impreso está vacío, porque ahí lo que entra es la suma.
		 *
		 * @return {Boolean}
		 */
		total_guardado_difiere() {
			if (this.total_que_se_guarda === null) {
				return false
			}

			let impreso = Number(this.factura.total)

			if (this.factura.total === null || typeof this.factura.total === 'undefined' || this.factura.total === '' || isNaN(impreso)) {
				return true
			}

			return Math.abs(this.total_que_se_guarda - impreso) > TOLERANCIA_TOTAL_COMPROBANTE
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

			/*
			 * Punto de venta y número se editan por separado, como están en el papel, y
			 * `code` se recompone con los dos (ver `set_numeracion`). Un escaneo viejo, de
			 * antes de que el resultado trajera las dos mitades, tiene `code` y no
			 * `numero`: se muestra el `code` entero en "Comp. Nro" y el punto de venta
			 * vacío, así recomponerlo da el mismo `code` que vino.
			 */
			let punto_venta = factura.punto_venta || null
			let numero = factura.numero || null

			if (!numero && factura.code) {
				numero = factura.code
				punto_venta = null
			}

			this.factura = {
				/*
				 * `code` arranca EXACTAMENTE como vino del backend, y así viaja mientras el
				 * usuario no toque el punto de venta ni el número.
				 */
				code: factura.code || null,
				/* Solo de pantalla: no viajan, alimentan `code`. */
				punto_venta: punto_venta,
				numero: numero,
				issued_at: factura.issued_at || null,
				emisor_cuit: factura.emisor_cuit || null,
				emisor_razon_social: factura.emisor_razon_social || null,
				total: typeof factura.total === 'undefined' ? null : factura.total,
				percepcion_iibb: typeof factura.percepcion_iibb === 'undefined' ? null : factura.percepcion_iibb,
				percepcion_iva: typeof factura.percepcion_iva === 'undefined' ? null : factura.percepcion_iva,
				/*
				 * 🔴 Acá no van `retencion_iibb`, `retencion_iva` ni `retencion_ganancias`
				 * (misión `compras-factura-manual-alicuotas`, 17/9/2026). Se fueron porque una
				 * factura de COMPRA no trae retenciones: quien retiene es tu cliente cuando te
				 * paga, no el proveedor cuando te factura, así que se cargan al registrar un
				 * cobro en la cuenta corriente de un cliente.
				 *
				 * La API ya hizo su mitad: el escaneo dejó de pedírselas a la IA
				 * (`EscaneoFacturaCompraService::CAMPOS_NUMERICOS_FACTURA`) y la confirmación
				 * dejó de escribirlas (`ProviderOrderScanController`). Mostrarlas era pedirle a
				 * la persona que revisara y corrigiera tres números que ya no viajan a ningún
				 * lado, y eso es peor que no mostrarlos: la pantalla prometía un guardado que no
				 * existe. (Este comentario vivía en la lista `campos_factura`, que se fue con el
				 * rediseño del 24/9/2026.)
				 */
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
		 * Edición del punto de venta o del número. Recompone `code`, que es lo único de
		 * la numeración que viaja.
		 *
		 * 🔴 Si el valor no cambió, no se toca nada. EditableCell emite al perder el
		 * foco aunque el usuario solo haya hecho clic y salido, y recomponer ahí
		 * cambiaría el `code` de un escaneo cuyo `code` el backend armó distinto (uno
		 * viejo, por ejemplo) sin que nadie lo haya editado. "Mientras no lo toque, viaja
		 * como vino" tiene que ser literal.
		 *
		 * @param {String} clave  'punto_venta' | 'numero'
		 * @param {String|null} valor
		 */
		set_numeracion(clave, valor) {
			if (this.factura[clave] === valor) {
				return
			}

			this.$set(this.factura, clave, valor)
			this.$set(this.factura, 'code', this.componer_code(this.factura.punto_venta, this.factura.numero))
		},
		/*
		 * Arma `code` igual que el backend (`EscaneoFacturaCompraService::normalizar_factura`):
		 * "pv-numero" con las dos mitades, el número solo si falta el punto de venta, y null
		 * sin número — un punto de venta suelto no identifica ningún comprobante.
		 *
		 * @param {String|null} punto_venta
		 * @param {String|null} numero
		 * @return {String|null}
		 */
		componer_code(punto_venta, numero) {
			let pv = punto_venta === null || typeof punto_venta === 'undefined' ? '' : String(punto_venta).trim()
			let nro = numero === null || typeof numero === 'undefined' ? '' : String(numero).trim()

			if (pv !== '' && nro !== '') {
				return pv + '-' + nro
			}
			if (nro !== '') {
				return nro
			}
			return null
		},
		/*
		 * Importe con separadores argentinos y dos decimales, sin el "$": en el recuadro
		 * de totales el signo ya está en la etiqueta ("Importe Total: $"), como en el papel.
		 *
		 * @param {Number|null} valor
		 * @return {String}
		 */
		mostrar_importe(valor) {
			let numero = Number(valor)

			if (valor === null || typeof valor === 'undefined' || valor === '' || isNaN(numero)) {
				return '—'
			}

			return numero.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
		},
		/*
		 * CUIT con guiones (30-71727742-9) cuando son once dígitos; si no, tal cual vino.
		 * Solo para mostrar el del receptor, que no se edita.
		 *
		 * @param {String|null} cuit
		 * @return {String}
		 */
		formatear_cuit(cuit) {
			if (!cuit) {
				return '—'
			}

			let digitos = String(cuit).replace(/\D/g, '')

			if (digitos.length !== 11) {
				return String(cuit)
			}

			return digitos.slice(0, 2) + '-' + digitos.slice(2, 10) + '-' + digitos.slice(10)
		},
		/*
		 * True si alguno de los dos campos escondidos en el "+" (código de barras o notas)
		 * la IA lo leyó con dificultad. El "+" se pinta ámbar: un dato dudoso que no se ve
		 * es un dato dudoso que nadie revisa.
		 *
		 * @param {Object} articulo
		 * @return {Boolean}
		 */
		extra_dudoso(articulo) {
			return this.campo_dudoso(articulo, 'bar_code') || this.campo_dudoso(articulo, 'notas')
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
		 * El valor de la columna Subtotal. Desde que el subtotal es su propia columna (y no
		 * una línea abajo del costo) va sin el "= " adelante: el encabezado ya dice qué es.
		 *
		 * @param {Object} articulo
		 * @return {String}
		 */
		subtotal_texto(articulo) {
			let calculado = this.subtotal_calculado(articulo)

			if (calculado === null) {
				return ''
			}

			return this.price(calculado)
		},
		/*
		 * La marca roja de abajo del subtotal cuando no da lo que dice el papel. Vacía
		 * si coinciden (misma tolerancia de `subtotal_difiere`, sin tocar).
		 *
		 * @param {Object} articulo
		 * @return {String}
		 */
		subtotal_leido_texto(articulo) {
			if (!this.subtotal_difiere(articulo)) {
				return ''
			}

			return '≠ leído ' + this.price(articulo.total_linea)
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
			return env('VUE_APP_API_URL') + '/api/provider-order-scan/' + this.uuid + '/imagen/' + orden
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
					/* Sin `retencion_*`: ver el comentario 🔴 de `construir()`. */
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
	// El trazo de la "hoja": marco, franjas, recuadro de la letra y encabezado de la
	// tabla. Más oscuro que --color-border a propósito: en el papel esas líneas son
	// negras, y con el gris clarito de los separadores la factura no se reconoce como
	// factura. En oscuro se redefine abajo.
	--scan-linea: var(--color-text-secondary)

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

	&__toggle
		padding: 0
		font-size: 0.8rem

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
		margin: 8px 0
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

		&--renglones
			padding: 14px 12px

		&--totales
			padding: 4px 0
			text-align: right

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

	// --- El comprobante: la "hoja" -----------------------------------------------
	&__comprobante
		margin-bottom: 22px
		border: 1px solid var(--scan-linea)
		border-radius: 4px
		background: var(--bg-card)
		color: var(--color-text-primary)
		// Sin overflow hidden a propósito: los select y el input de fecha de adentro
		// tienen que poder desplegarse fuera del marco.

	// Lo que no se va a guardar se ve apagado, pero sigue siendo editable: la
	// opacidad no bloquea clics, y así el que cambia de idea no tiene que re-tildar
	// para poder corregir.
	&__comprobante--sin-guardar &__atenuable
		opacity: 0.5

	&__franja-titulo
		display: flex
		flex-direction: row
		flex-wrap: wrap
		align-items: center
		justify-content: space-between
		gap: 8px 16px
		padding: 8px 14px
		border-bottom: 1px solid var(--scan-linea)

	&__franja-texto
		font-weight: 800
		font-size: 0.82rem
		text-transform: uppercase
		letter-spacing: 0.12em

	&__guardar
		font-size: 0.85rem

	&__aviso-modo
		margin: 10px 14px

	// Cabecera: emisor | recuadro de la letra | datos del comprobante. La letra es una
	// columna `auto` de la grilla, así las dos mitades se reparten lo que sobra y
	// nunca le pasan por debajo.
	&__encabezado
		display: grid
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)
		border-bottom: 1px solid var(--scan-linea)

	&__mitad
		min-width: 0
		padding: 14px 16px 16px 16px
		display: flex
		flex-direction: column
		gap: 6px

	&__emisor-nombre
		font-size: 1.35rem
		font-weight: 800
		line-height: 1.2
		margin: 4px 0 8px 0
		overflow-wrap: anywhere

		&--vacio
			color: var(--color-text-secondary)
			font-weight: 600
			font-style: italic

	&__tipo
		font-size: 1.35rem
		font-weight: 800
		letter-spacing: 0.04em
		margin: 4px 0 8px 0

	// La columna del medio: el recuadro arriba, colgado del borde de la franja, y la
	// línea vertical que baja de él hasta el borde de abajo de la cabecera.
	&__letra-columna
		display: flex
		flex-direction: column
		align-items: center

	&__letra
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		width: 66px
		min-height: 62px
		padding: 4px 0
		border: 1px solid var(--scan-linea)
		border-top: 0
		background: var(--bg-card)

		&--sin-letra .scan-review__letra-valor
			color: var(--color-text-secondary)
			opacity: 0.6

	&__letra-valor
		font-size: 2.3rem
		font-weight: 800
		line-height: 1

	&__letra-cod
		margin-top: 2px
		font-size: 0.62rem
		font-weight: 700
		letter-spacing: 0.02em
		white-space: nowrap

	&__letra-linea
		flex: 1 1 auto
		width: 1px
		min-height: 12px
		background: var(--scan-linea)

	// Un dato de la factura: etiqueta en negrita a la izquierda del valor, como en el
	// papel ("Razón Social: DISTRIBUIDORA DEL SUR").
	&__dato
		display: flex
		flex-direction: row
		align-items: center
		gap: 6px
		min-width: 0

		// `width: auto` pisa el 100% de EditableCell: con el 100% como base, en
		// teléfono (donde el dato envuelve) el valor saltaba SIEMPRE abajo de su
		// etiqueta, aunque hubiera lugar al lado.
		.editable-cell
			flex: 1 1 120px
			width: auto

	&__dato-label
		flex: 0 0 auto
		font-weight: 700
		white-space: nowrap

	&__dato-valor
		min-width: 0
		overflow-wrap: anywhere

	// Punto de venta y número en la misma línea, como en el papel; envuelven si no
	// entran en vez de apretar el valor hasta cero.
	&__dato-fila
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 6px 14px

		.scan-review__dato
			flex: 1 1 150px

	&__receptor
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 6px 28px
		padding: 10px 16px
		border-bottom: 1px solid var(--scan-linea)

		.scan-review__dato
			min-height: 28px

	&__renglones-resumen
		padding: 8px 14px
		font-size: 0.78rem
		color: #64748b
		text-align: right

	// --- Tabla de renglones ------------------------------------------------------
	&__tabla
		display: flex
		flex-direction: column

	&__fila
		display: grid
		gap: 0 6px
		align-items: center
		// Renglones MÁS separados que el PDF (pedido de Lucas): en el papel las líneas van
		// pegadas porque nadie las edita; acá cada una se toca con el mouse o el dedo.
		padding: 10px 10px
		border-bottom: 1px solid var(--color-border)
		// Siete columnas de la factura entre el check y el "+". `minmax(0, …)` y no
		// `Nfr` pelado: el mínimo `auto` de un `fr` es el min-content del contenido, y un
		// código largo sin espacios ensanchaba su columna y sacaba la fila del modal.
		// Orden: check, código, producto, cantidad, precio unit., bonif., subtotal,
		// alícuota, "+".
		grid-template-columns: 30px minmax(0, 0.95fr) minmax(0, 2.4fr) minmax(0, 0.7fr) minmax(0, 1fr) minmax(0, 0.6fr) minmax(0, 1.1fr) minmax(0, 1.1fr) 38px

		&--nueva
			background: rgba(220, 38, 38, 0.06)
			// La marca del borde izquierdo reemplaza al borde rojo de la tarjeta de antes:
			// ahora el renglón es una línea de la factura, y un marco entero la rompería.
			box-shadow: inset 3px 0 0 rgba(220, 38, 38, 0.55)

		&--excluida
			opacity: 0.5

		&:last-child
			border-bottom: 0

	// El encabezado gris de la tabla del PDF, con su trazo arriba y abajo.
	&__cabecera
		padding-top: 7px
		padding-bottom: 7px
		background: rgba(100, 116, 139, 0.16)
		border-top: 1px solid var(--scan-linea)
		border-bottom: 1px solid var(--scan-linea)
		font-size: 0.78rem
		font-weight: 700
		color: var(--color-text-primary)

	&__celda
		min-width: 0

		// Los selectores de alícuota viven adentro de una celda angosta: se achican
		// para no forzar un scroll horizontal en la fila.
		.custom-select
			font-size: 0.78rem
			padding-left: 6px
			padding-right: 18px

		// Los importes y cantidades se alinean a la derecha, como en cualquier factura:
		// así se comparan de un vistazo las magnitudes de una columna.
		&--numero
			text-align: right

			.editable-cell__texto
				text-align: right

		&--mas
			text-align: center

	// El "+" con un dato dudoso adentro: ámbar, el mismo tono que las celdas dudosas.
	&__mas--dudoso
		background: rgba(245, 158, 11, 0.18)
		border-color: rgba(217, 119, 6, 0.7)
		color: #b45309

	// Sub-línea del estado del matcheo, desde la columna Producto hasta el final.
	&__estado
		grid-column: 3 / -1
		display: flex
		flex-direction: row
		flex-wrap: wrap
		align-items: center
		gap: 4px 10px
		min-width: 0
		margin-top: 6px
		font-size: 0.8rem

		// 🔴 El `.badge` de Bootstrap trae `white-space: nowrap`, y en una grilla un
		// ítem que no envuelve ENSANCHA su pista: el mínimo `auto` es el min-content del
		// contenido, así que un nombre de catálogo largo ("Martillo acero galvanizado
		// 500g mango de fibra") empuja la fila entera más allá del modal. Es el mismo
		// defecto que ya se comió una corrida en este proyecto, y aparece justo en el
		// ancho del medio. Antes vivía en la celda de estado; la sub-línea hereda el
		// problema y el arreglo.
		.badge
			max-width: 100%
			white-space: normal
			overflow-wrap: anywhere
			text-align: left

		.custom-select
			width: auto
			max-width: 100%
			font-size: 0.78rem

	// Total de la línea calculado, en su propia columna. El estado "difiere" es lo único
	// que grita: significa que lo que se va a asentar no es lo que dice el papel.
	&__subtotal
		display: block
		overflow-wrap: anywhere

		&--difiere
			color: #b91c1c
			font-weight: 700

	&__subtotal-valor
		display: block

	&__subtotal-leido
		display: block
		font-size: 0.72rem

	// Marca de que confirmar así tira esta fila.
	&__descarte
		font-size: 0.72rem
		font-weight: 700
		color: #b91c1c

	&__criterio
		font-size: 0.72rem
		color: #64748b

	&__crear
		font-size: 0.78rem

	&__candidatos
		font-size: 0.78rem

	// El bloque de lo que no es columna de la factura: apagado hasta que se abre el "+".
	&__extra
		display: none

	&__extra-campo
		min-width: 0

		// La alícuota solo cae acá entre 768 y 991px.
		&--alicuota
			display: none

	// --- Totales -------------------------------------------------------------------
	&__pie-factura
		padding: 14px 16px
		border-top: 1px solid var(--scan-linea)

	// El recuadro de totales abajo a la derecha, como en el papel.
	&__totales
		display: flex
		flex-direction: column
		gap: 4px
		width: 100%
		max-width: 540px
		margin-left: auto
		padding: 10px 12px
		border: 1px solid var(--scan-linea)

	&__total-linea
		display: grid
		grid-template-columns: minmax(0, 1fr) minmax(120px, 170px)
		align-items: center
		gap: 8px

		.editable-cell__texto
			text-align: right

		&--total
			margin-top: 4px
			padding-top: 6px
			border-top: 1px solid var(--color-border)
			font-size: 1.05rem

			.scan-review__total-label,
			.editable-cell__texto
				font-size: 1.05rem
				font-weight: 800

	&__total-label
		font-weight: 700
		text-align: right
		white-space: nowrap

		&--chica
			font-size: 0.8rem

	&__total-valor
		padding: 4px 6px
		text-align: right
		font-weight: 600

	// Una línea por alícuota del desglose: selector, neto e importe.
	&__iva
		display: grid
		grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr)
		align-items: start
		gap: 8px
		padding: 6px 0
		border-bottom: 1px dashed var(--color-border)

		.editable-cell__texto
			text-align: right

		.custom-select
			font-size: 0.78rem
			padding-left: 6px
			padding-right: 18px

		// La fila sin alícuota elegida es la que el backend va a saltear: se marca
		// entera, no solo el selector, porque lo que se pierde es el renglón completo.
		&--sin-identificar
			background: rgba(217, 119, 6, 0.1)
			border-left: 3px solid rgba(217, 119, 6, 0.6)
			padding-left: 8px

	&__iva-campo
		display: flex
		flex-direction: row
		align-items: center
		gap: 6px
		min-width: 0

		.editable-cell
			flex: 1 1 auto

		&--alicuota
			align-items: flex-start

			.scan-review__total-label
				padding-top: 5px

	&__iva-selector
		flex: 1 1 auto
		min-width: 0

	// Lo que la IA leyó en el papel, abajo del selector. Sirve para decidir sin volver
	// a la foto cuando el porcentaje leído no matcheó contra ninguna alícuota.
	&__iva-leido
		display: block
		margin-top: 3px
		font-size: 0.72rem
		color: #64748b

	// Lo que el backend va a guardar cuando no es lo impreso. Rojo: es plata que entra
	// distinta de lo que el usuario ve en el papel.
	&__total-guardado
		margin: 6px 0 0 0
		text-align: right
		font-size: 0.8rem
		font-weight: 700
		color: #b91c1c

	&__leido
		margin: 8px 0 0 0
		font-size: 0.78rem
		color: #64748b
		text-align: right

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

// ─── Escritorio y tablet (≥768px): el "+" abre lo que no es columna ──────────────
@media (min-width: 768px)
	.scan-review__fila--expandida .scan-review__extra
		display: grid
		// Desde Producto hasta el final, alineado con la sub-línea del estado.
		grid-column: 3 / -1
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))
		gap: 10px
		margin-top: 8px
		padding-top: 8px
		border-top: 1px dashed var(--color-border)

// ─── Ancho intermedio alto (992–1199px) ──────────────────────────────────────────
// Las mismas nueve pistas, más apretadas: a 992px el modal (90% del ancho) deja unos
// 850px de tabla, y la alícuota todavía entra como columna.
@media (min-width: 992px) and (max-width: 1199.98px)
	.scan-review__fila
		grid-template-columns: 28px minmax(0, 0.9fr) minmax(0, 2fr) minmax(0, 0.65fr) minmax(0, 0.95fr) minmax(0, 0.6fr) minmax(0, 1fr) minmax(0, 1.15fr) 36px
		padding-left: 8px
		padding-right: 8px

// ─── Ancho intermedio bajo (768–991px) ───────────────────────────────────────────
// Acá es donde se esconden los defectos: se prueba en 1366 y en 375 y nadie mira el
// medio. A 768px el modal deja unos 660px de tabla: con el select de la alícuota como
// columna, todas quedan abajo del ancho con el que un dedo acierta. La alícuota se va
// al "+", junto al código de barras y las notas. El descuento se queda arriba a
// propósito: es plata del renglón, no un dato de referencia.
@media (min-width: 768px) and (max-width: 991.98px)
	.scan-review__fila
		// check, código, producto, cantidad, precio, bonif., subtotal, "+".
		grid-template-columns: 28px minmax(0, 0.9fr) minmax(0, 2fr) minmax(0, 0.7fr) minmax(0, 1fr) minmax(0, 0.65fr) minmax(0, 1.05fr) 36px
		padding-left: 8px
		padding-right: 8px

	.scan-review__celda--alicuota
		display: none

	.scan-review__extra-campo--alicuota
		display: block

	.scan-review__mitad
		padding-left: 12px
		padding-right: 12px

	.scan-review__emisor-nombre,
	.scan-review__tipo
		font-size: 1.15rem

// ─── Teléfono (<768px) ───────────────────────────────────────────────────────────
// La cabecera se apila (emisor, letra, comprobante) y la tabla deja de ser una tabla:
// cada artículo es una tarjeta con las etiquetas a la izquierda y el valor editable a
// la derecha. Siete columnas a 360px no se editan con el dedo, y un scroll horizontal
// esconde justo la columna que se está por tocar.
@media (max-width: 767.98px)
	.scan-review__encabezado
		grid-template-columns: minmax(0, 1fr)

	.scan-review__mitad
		padding: 12px

	.scan-review__mitad--comprobante
		border-top: 1px solid var(--scan-linea)

	// La letra queda centrada entre las dos mitades apiladas, con su recuadro completo:
	// sin la franja de arriba pegada ya no "cuelga" de nada.
	.scan-review__letra-columna
		padding-bottom: 12px

	.scan-review__letra
		border-top: 1px solid var(--scan-linea)

	.scan-review__letra-linea
		display: none

	.scan-review__emisor-nombre,
	.scan-review__tipo
		font-size: 1.1rem

	.scan-review__dato
		flex-wrap: wrap

	.scan-review__receptor
		flex-direction: column
		padding: 10px 12px

	.scan-review__cabecera
		display: none

	.scan-review__fila
		grid-template-columns: minmax(0, 1fr)
		gap: 4px
		padding: 12px

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

	// En tarjeta los números van a la izquierda como el resto de los valores: alineados
	// a la derecha quedarían lejos de su etiqueta.
	.scan-review__celda--numero,
	.scan-review__celda--numero .editable-cell__texto
		text-align: left

	// 🔴 Esta línea no es redundante. La regla de arriba le pone `display: grid` a
	// TODA celda y le ganaría al "+" por venir después: sin esto, el botón de "ver
	// código de barras y notas" aparece justo en el ancho donde esos campos ya se ven
	// enteros en la tarjeta, y abre un colapso vacío.
	.scan-review__celda--mas
		display: none

	.scan-review__estado
		grid-column: 1
		margin-top: 4px

	// En tarjeta el código de barras y las notas se ven siempre, como filas más de la
	// tarjeta. La alícuota no: ya tiene su celda propia arriba.
	.scan-review__extra
		display: grid
		grid-template-columns: minmax(0, 1fr)
		gap: 4px

	.scan-review__extra-campo
		display: grid
		grid-template-columns: 40% minmax(0, 60%)
		align-items: center
		gap: 8px

		.scan-review__label
			margin-bottom: 0

	.scan-review__extra-campo--alicuota
		display: none

	.scan-review__pie-factura
		padding: 12px

	.scan-review__totales
		max-width: none

	.scan-review__total-linea
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)

	.scan-review__total-label
		white-space: normal

	// El desglose: el selector ocupa toda la línea y abajo neto e importe, lado a lado.
	.scan-review__iva
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)

	.scan-review__iva-campo--alicuota
		grid-column: 1 / -1

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
	// El trazo de la hoja en oscuro: el gris medio del modo claro sobre --bg-card
	// quedaría demasiado brillante, y --color-border (14% de blanco) demasiado tenue
	// para que se lea como el marco de una factura.
	--scan-linea: rgba(255, 255, 255, 0.3)

	&__label,
	&__criterio,
	&__leido,
	&__nota,
	&__iva-leido,
	&__avisos,
	&__renglones-resumen
		color: #94a3b8

	// Los tres rojos y el ámbar se aclaran: el #b91c1c del modo claro sobre fondo
	// oscuro queda ilegible, que es justo lo contrario de lo que estas marcas hacen.
	&__subtotal--difiere,
	&__descarte,
	&__contadores-alerta,
	&__total-guardado
		color: #f87171

	&__alerta-inline,
	&__mas--dudoso
		color: #fbbf24

	&__cabecera
		background: var(--bg-section)
		color: var(--color-text-primary)

	&__comprobante,
	&__letra
		background: var(--bg-card)
		color: var(--color-text-primary)

@media (max-width: 767.98px)
	html.dark-mode .scan-review__celda::before
		color: #94a3b8
</style>
