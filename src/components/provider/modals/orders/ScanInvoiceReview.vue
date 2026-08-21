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
						No se detectaron datos de factura AFIP; se van a cargar solo los artículos.
					</b-alert>

					<div v-if="mostrar_factura">

						<!--
							🔴 La trampa del modo de facturación. Si la compra está en "sin
							factura" o en "automático", guardar la factura acá no serviría de
							nada: el helper de facturación la borra o le pisa los totales en el
							mismo request. Cambiarle la configuración a la compra por nuestra
							cuenta sería peor que no guardarla, así que se le pregunta.
						-->
						<b-alert
						v-if="factura_bloqueada_por_modo"
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
						</b-alert>

						<b-form-checkbox
						v-model="guardar_factura"
						class="m-b-15">
							Guardar los datos del comprobante en la compra
						</b-form-checkbox>

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
						<div
						v-for="(iva, index) in ivas"
						:key="'iva-' + index"
						class="scan-review__iva">
							<div class="scan-review__iva-campo">
								<label class="scan-review__label">Alícuota</label>
								<span class="scan-review__iva-porcentaje">
									{{ iva.porcentaje }}
									<b-badge
									v-if="!iva.iva_id"
									variant="warning">
										sin identificar
									</b-badge>
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
								Copia de las dos columnas que se ocultan entre 768 y 1199px. Vive
								en su propio bloque, después de todas las celdas, y no reusa las
								de arriba: si a una celda del medio de la grilla se le da ancho
								completo, empuja a las que vienen después a otra fila y la tabla
								se desarma. En los otros dos anchos está en display:none.
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

				<!-- ─── 5. Pie ─────────────────────────────────────────────────────── -->
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
 * Responsive (es la parte más frágil de la pantalla, y el ancho del medio es donde se
 * esconden los defectos):
 *  - ≥1200px: la tabla completa, ocho columnas.
 *  - 768–1199px: se ocultan código de barras y notas; se editan desde el "+" de la fila.
 *  - <768px: la tabla se vuelve tarjetas apiladas. Una tabla de ocho columnas a 360px no
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
			return hay_articulos || (this.guardar_factura && this.es_factura_afip)
		},
	},
	watch: {
		/*
		 * El detalle llega asincrónico: el botón rojo dispara el GET y muestra el modal
		 * al mismo tiempo, así que casi siempre el modal se abre antes que la respuesta.
		 */
		detalle() {
			this.construir()
		},
	},
	methods: {
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

			/* Si no es una factura AFIP no hay nada del comprobante que guardar. */
			this.guardar_factura = !!factura.es_factura_afip
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
						notas: articulo.notas,
					}
				})

			let payload = {
				articulos: articulos,
				factura: {
					guardar: this.guardar_factura && this.es_factura_afip,
					pasar_a_manual: this.pasar_a_manual === true,
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

	&__iva-porcentaje
		display: block
		padding: 4px 6px
		font-weight: 600

	// --- Tabla de artículos ------------------------------------------------------
	&__tabla
		display: flex
		flex-direction: column
		gap: 4px

	&__fila
		display: grid
		gap: 8px
		align-items: start
		padding: 6px 8px
		border-radius: 8px
		border: 1px solid rgba(100, 116, 139, 0.18)
		// Ocho columnas de datos + la del "+", que solo se ve en el ancho intermedio.
		grid-template-columns: 34px 1.1fr 1.1fr 2.2fr 0.7fr 1fr 1.8fr 1.2fr

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

		// El "+" del ancho intermedio: apagado en los otros dos anchos.
		&--mas
			display: none

		// La celda de estado apila badge, casilla y selector, así que necesita el
		// ancho completo de su columna y no puede alinearse al centro.
		&--estado
			min-width: 0

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
// medio. Se sacan las dos columnas menos usadas y se ofrecen desde el "+" de la fila.
@media (min-width: 768px) and (max-width: 1199.98px)
	.scan-review__fila
		grid-template-columns: 34px 1.1fr 2.2fr 0.7fr 1fr 1.8fr 40px

	.scan-review__celda--secundaria
		display: none

	.scan-review__celda--mas
		display: block

	.scan-review__fila--expandida .scan-review__extra
		display: grid
		grid-column: 1 / -1
		grid-template-columns: repeat(2, minmax(0, 1fr))
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

html.dark-mode .scan-review
	&__label,
	&__contadores,
	&__criterio,
	&__leido,
	&__avisos
		color: #94a3b8

	&__fila
		border-color: var(--color-border)
</style>
