<template>
	<b-modal
	id="scan-invoice-history"
	size="lg"
	:title="titulo"
	scrollable
	@show="cargar">
		<div
		class="scan-history"
		data-tour="compras.modal_historial_escaneos">

			<div
			v-if="cargando"
			class="scan-history__mensaje">
				Cargando el historial…
			</div>

			<!-- null = falló el pedido; lista vacía = la compra no tiene escaneos. -->
			<b-alert
			v-else-if="fallo"
			show
			variant="warning">
				No se pudo cargar el historial. Cerrá y volvé a intentarlo.
			</b-alert>

			<div
			v-else-if="!escaneos.length"
			class="scan-history__mensaje">
				Esta compra todavía no tiene escaneos de factura.
			</div>

			<div v-else>

				<div
				v-for="escaneo in escaneos"
				:key="escaneo.uuid"
				class="scan-history__item"
				:data-testid="'scan-history-item-' + escaneo.uuid">

					<!--
						Cabecera de cada escaneo: siempre visible. Es un botón (no un div con
						click) para que se alcance con el teclado y anuncie que expande.
					-->
					<button
					type="button"
					class="scan-history__cabecera"
					:aria-expanded="esta_abierto(escaneo) ? 'true' : 'false'"
					@click="alternar(escaneo)">

						<span class="scan-history__cabecera-principal">
							<b-badge :variant="variante(escaneo)">
								{{ etiqueta(escaneo) }}
							</b-badge>
							<span class="scan-history__fecha">
								{{ fecha_hora(escaneo.created_at) }}
							</span>
						</span>

						<span class="scan-history__cabecera-detalle">
							<span v-if="escaneo.usuario">
								{{ escaneo.usuario }}
							</span>
							<span>
								{{ escaneo.cantidad_imagenes }}
								{{ escaneo.cantidad_imagenes == 1 ? 'página' : 'páginas' }}
							</span>
							<span v-if="escaneo.cantidad_articulos">
								{{ escaneo.cantidad_articulos }}
								{{ escaneo.cantidad_articulos == 1 ? 'artículo' : 'artículos' }}
							</span>
						</span>

						<i
						class="bi scan-history__chevron"
						:class="esta_abierto(escaneo) ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
					</button>

					<!-- Detalle: se arma solo cuando el escaneo está abierto. -->
					<div
					v-if="esta_abierto(escaneo)"
					class="scan-history__detalle">

						<b-alert
						v-if="escaneo.error"
						show
						variant="warning"
						class="scan-history__alerta">
							{{ escaneo.error }}
						</b-alert>

						<p
						v-if="escaneo.aplicado"
						class="scan-history__resumen">
							<strong>Qué se cargó en la compra:</strong>
							{{ texto_aplicado(escaneo.aplicado) }}
						</p>

						<p
						v-if="escaneo.gestionado_at"
						class="scan-history__nota">
							{{ escaneo.estado_visible == 'descartado' ? 'Descartado' : 'Confirmado' }}
							el {{ fecha_hora(escaneo.gestionado_at) }}.
						</p>

						<!-- Comprobante que se leyó de la foto. -->
						<div
						v-if="escaneo.factura"
						class="scan-history__factura">
							<strong>Comprobante</strong>
							<span v-if="escaneo.factura.tipo_comprobante">
								Tipo {{ escaneo.factura.tipo_comprobante }}
							</span>
							<span v-if="escaneo.factura.code">
								N° {{ escaneo.factura.code }}
							</span>
							<span v-if="escaneo.factura.issued_at">
								{{ fecha(escaneo.factura.issued_at) }}
							</span>
							<span v-if="escaneo.factura.emisor_razon_social">
								{{ escaneo.factura.emisor_razon_social }}
							</span>
							<span v-if="escaneo.factura.total !== null && escaneo.factura.total !== undefined">
								Total {{ price(escaneo.factura.total) }}
							</span>
						</div>

						<!-- Las fotos, para cotejar contra lo que se leyó. -->
						<div
						v-if="escaneo.imagenes.length"
						class="scan-history__fotos">
							<a
							v-for="imagen in escaneo.imagenes"
							:key="'img-' + escaneo.uuid + '-' + imagen.orden"
							:href="url_imagen(escaneo.uuid, imagen.orden)"
							target="_blank"
							rel="noopener"
							class="scan-history__foto"
							:title="'Página ' + imagen.orden + ' — abrir en una pestaña nueva'">
								<img
								:src="url_imagen(escaneo.uuid, imagen.orden)"
								:alt="'Página ' + imagen.orden"
								loading="lazy">
								<span class="scan-history__foto-numero">
									{{ imagen.orden }}
								</span>
							</a>
						</div>

						<!--
							Artículos que se leyeron (o, si el escaneo se confirmó, los que el
							usuario dejó). Con scroll horizontal propio: en teléfono la tabla no
							entra y no tiene que ensanchar el modal.
						-->
						<div
						v-if="escaneo.articulos.length"
						class="scan-history__tabla-contenedor">
							<table class="scan-history__tabla">
								<thead>
									<tr>
										<!-- En teléfono el código pasa debajo del nombre y esta columna se esconde. -->
										<th class="d-none d-sm-table-cell">Código</th>
										<th>Artículo</th>
										<th class="scan-history__num">Cant.</th>
										<th class="scan-history__num">Costo</th>
									</tr>
								</thead>
								<tbody>
									<tr
									v-for="(articulo, indice) in escaneo.articulos"
									:key="'art-' + escaneo.uuid + '-' + indice">
										<td class="d-none d-sm-table-cell">{{ articulo.codigo_proveedor || articulo.bar_code || '—' }}</td>
										<td>
											{{ articulo.nombre || '—' }}
											<div
											v-if="articulo.codigo_proveedor || articulo.bar_code"
											class="scan-history__codigo-movil d-sm-none">
												{{ articulo.codigo_proveedor || articulo.bar_code }}
											</div>
										</td>
										<td class="scan-history__num">{{ articulo.cantidad !== null ? articulo.cantidad : '—' }}</td>
										<td class="scan-history__num">
											{{ articulo.costo_unitario !== null ? price(articulo.costo_unitario) : '—' }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>

						<!--
							Solo un escaneo pendiente de revisar se puede retomar: los demás ya
							están resueltos. Reusa el modal de revisión de siempre.
						-->
						<div
						v-if="escaneo.estado_visible == 'para_revisar'"
						class="scan-history__acciones">
							<b-button
							size="sm"
							variant="danger"
							@click="revisar(escaneo)">
								Revisar y confirmar
							</b-button>
						</div>

					</div>
				</div>

			</div>
		</div>

		<template #modal-footer="{ cancel }">
			<b-button
			size="sm"
			variant="secondary"
			@click="cancel()">
				Cerrar
			</b-button>
		</template>
	</b-modal>
</template>
<script>
import moment from 'moment'
import { env } from '@/runtime_config'

/*
 * Historial de escaneos de factura de una compra (misión historial-escaneos-compra).
 *
 * Muestra TODOS los escaneos que tuvo la compra, en cualquier estado. El botón rojo del
 * listado solo alcanza al escaneo pendiente de revisar; un escaneo ya confirmado,
 * descartado o fallido no tenía forma de volver a verse.
 *
 * Es de solo lectura: acá no se edita nada. La única acción es retomar un escaneo
 * pendiente de revisar, que abre el modal de revisión existente sin tocarlo.
 *
 * La compra sobre la que se abre se lee del store (`provider_order_scan/compra`), igual
 * que los demás modales de este listado, que no reciben props.
 */
export default {
	data() {
		return {
			/* true si el pedido del historial falló (distinto de "no tiene escaneos"). */
			fallo: false,

			/* uuid de los escaneos con el detalle desplegado. */
			abiertos: [],
		}
	},
	computed: {
		compra() {
			return this.$store.state.provider_order_scan.compra
		},
		escaneos() {
			return this.$store.state.provider_order_scan.historial
		},
		cargando() {
			return this.$store.state.provider_order_scan.cargando_historial
		},
		titulo() {
			if (this.compra && this.compra.num) {
				return 'Escaneos de la compra N° ' + this.compra.num
			}
			return 'Escaneos de la compra'
		},
	},
	methods: {
		/*
		 * Al abrirse el modal: pide el historial de la compra y despliega el más nuevo
		 * (que casi siempre es el que el usuario quiere ver).
		 */
		cargar() {
			let self = this

			this.fallo = false
			this.abiertos = []

			if (!this.compra || !this.compra.id) {
				return
			}

			this.$store.dispatch('provider_order_scan/get_historial', this.compra.id)
			.then(models => {
				// undefined = la respuesta llegó tarde y otro pedido ya tomó la lista.
				if (models === undefined) {
					return
				}
				if (models === null) {
					self.fallo = true
					return
				}
				if (models.length) {
					self.abiertos = [models[0].uuid]
				}
			})
		},
		esta_abierto(escaneo) {
			return this.abiertos.indexOf(escaneo.uuid) !== -1
		},
		alternar(escaneo) {
			if (this.esta_abierto(escaneo)) {
				this.abiertos = this.abiertos.filter(uuid => {
					return uuid != escaneo.uuid
				})
			} else {
				this.abiertos.push(escaneo.uuid)
			}
		},
		/*
		 * Texto del estado, en el idioma del usuario. Las claves son las de
		 * `estado_visible` del backend (ProviderOrderScanController::estado_visible).
		 */
		etiqueta(escaneo) {
			let etiquetas = {
				en_proceso: 'Procesando',
				sin_terminar: 'No terminó',
				para_revisar: 'Para revisar',
				confirmado: 'Confirmado',
				descartado: 'Descartado',
				error: 'Con error',
			}
			return etiquetas[escaneo.estado_visible] || 'Sin resolver'
		},
		/*
		 * Color de la insignia. "Para revisar" va en rojo como el botón del listado, que
		 * es el que lo anuncia.
		 */
		variante(escaneo) {
			let variantes = {
				en_proceso: 'info',
				sin_terminar: 'secondary',
				para_revisar: 'danger',
				confirmado: 'success',
				descartado: 'secondary',
				error: 'warning',
			}
			return variantes[escaneo.estado_visible] || 'secondary'
		},
		/*
		 * Qué se cargó al confirmar, en una frase. Mismo criterio de redacción que el
		 * aviso que sale al confirmar en el modal de revisión.
		 *
		 * @param {Object} aplicado  { articulos_agregados, articulos_creados, articulos_omitidos, factura_guardada, factura_motivo }
		 * @return {String}
		 */
		texto_aplicado(aplicado) {
			let datos = aplicado || {}
			let partes = []

			partes.push('se cargaron ' + (datos.articulos_agregados || 0) + ' artículos')

			if (datos.articulos_creados) {
				partes.push('se crearon ' + datos.articulos_creados + ' nuevos en el catálogo')
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

			let texto = partes.join(', ') + '.'

			return texto.charAt(0).toUpperCase() + texto.slice(1)
		},
		/*
		 * @param {String} valor  Fecha y hora ISO que devuelve el backend.
		 * @return {String}
		 */
		fecha_hora(valor) {
			if (!valor) {
				return ''
			}
			return moment(valor).format('DD/MM/YYYY HH:mm')
		},
		/*
		 * Fecha de un comprobante (AAAA-MM-DD). Sin hora: es la fecha del papel.
		 */
		fecha(valor) {
			if (!valor) {
				return ''
			}
			return moment(valor).format('DD/MM/YYYY')
		},
		url_imagen(uuid, orden) {
			return env('VUE_APP_API_URL') + '/api/provider-order-scan/' + uuid + '/imagen/' + orden
		},
		/*
		 * Retoma un escaneo pendiente: cierra el historial y abre la revisión de siempre.
		 * El detalle completo se pide recién ahora, como al apretar el botón rojo.
		 */
		revisar(escaneo) {
			this.$bvModal.hide('scan-invoice-history')
			this.$store.dispatch('provider_order_scan/abrir_revision', escaneo.uuid)
			this.$bvModal.show('scan-invoice-review')
		},
	},
}
</script>
<style lang="sass">
#scan-invoice-history
	.scan-history
		&__mensaje
			padding: 24px 8px
			text-align: center
			color: var(--color-text-secondary)

		&__item
			border: 1px solid var(--color-border)
			border-radius: 10px
			background: var(--bg-card)
			margin-bottom: 10px
			overflow: hidden

		&__cabecera
			display: flex
			flex-direction: row
			flex-wrap: wrap
			align-items: center
			justify-content: space-between
			gap: 6px 12px
			width: 100%
			padding: 10px 12px
			border: 0
			background: var(--bg-section)
			color: var(--color-text-primary)
			text-align: left
			cursor: pointer
			&:hover
				background: var(--bg-hover)

		&__cabecera-principal
			display: inline-flex
			align-items: center
			gap: 10px

		&__fecha
			font-weight: 600

		&__cabecera-detalle
			display: inline-flex
			flex-wrap: wrap
			gap: 4px 14px
			flex: 1 1 auto
			justify-content: flex-end
			font-size: 0.85rem
			color: var(--color-text-secondary)

		&__chevron
			color: var(--color-text-secondary)

		&__detalle
			padding: 12px
			border-top: 1px solid var(--color-border)

		&__alerta
			font-size: 0.85rem

		&__resumen
			margin: 0 0 8px 0

		&__nota
			margin: 0 0 8px 0
			font-size: 0.85rem
			color: var(--color-text-secondary)

		&__factura
			display: flex
			flex-wrap: wrap
			gap: 4px 14px
			margin-bottom: 10px
			font-size: 0.9rem

		&__fotos
			display: flex
			flex-wrap: wrap
			gap: 8px
			margin-bottom: 10px

		&__foto
			position: relative
			display: block
			width: 84px
			height: 84px
			border: 1px solid var(--color-border)
			border-radius: 8px
			overflow: hidden
			img
				width: 100%
				height: 100%
				object-fit: cover
				display: block

		// Colores fijos a propósito: es un número superpuesto sobre una FOTO, y necesita el
		// mismo contraste en modo claro y oscuro (el fondo lo pone la imagen, no el tema).
		&__foto-numero
			position: absolute
			top: 4px
			left: 4px
			min-width: 20px
			height: 20px
			padding: 0 5px
			border-radius: 999px
			background: rgba(15, 23, 42, 0.75)
			color: #fff
			font-size: 0.72rem
			font-weight: 700
			display: flex
			align-items: center
			justify-content: center

		// Scroll propio por si aun así no entra: no tiene que ensanchar el modal.
		&__tabla-contenedor
			overflow-x: auto
			max-height: 260px
			overflow-y: auto
			border: 1px solid var(--color-border-secondary)
			border-radius: 8px

		&__tabla
			width: 100%
			font-size: 0.85rem
			th, td
				padding: 6px 10px
				border-bottom: 1px solid var(--color-border-secondary)
				text-align: left
				// Hay una regla global que deja los td en `nowrap`: sin esto un nombre largo de
				// artículo ensancha toda la tabla y empuja la columna del costo fuera de la vista.
				white-space: normal
				word-break: break-word
			th
				position: sticky
				top: 0
				background: var(--bg-section)
				color: var(--color-text-secondary)
				font-weight: 600
				white-space: nowrap
			// El código no se parte ("A-" / "100"): es corto y se lee de corrido. El que
			// se ajusta de línea es el nombre, que puede ser largo.
			td:first-child
				white-space: nowrap

		// El código bajo el nombre, solo en teléfono.
		&__codigo-movil
			font-size: 0.75rem
			color: var(--color-text-secondary)

		&__num
			text-align: right !important
			white-space: nowrap !important

		&__acciones
			margin-top: 12px
			display: flex
			justify-content: flex-end
</style>
