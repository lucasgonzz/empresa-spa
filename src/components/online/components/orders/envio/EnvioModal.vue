<template>
	<b-modal
	:id="modal_id"
	:title="titulo"
	size="lg"
	hide-footer>
		<div class="envio-modal">
			<!-- Destinatario y dirección: lo que cargó el comprador en la tienda -->
			<div class="envio-modal__seccion">
				<p class="envio-modal__titulo">Destinatario</p>
				<div
				v-if="destino"
				class="envio-modal__grilla">
					<div class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Nombre</span>
						<span class="envio-modal__valor">{{ nombre_destinatario }}</span>
					</div>
					<div
					v-if="destino.documento"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">DNI</span>
						<span class="envio-modal__valor">{{ destino.documento }}</span>
					</div>
					<div
					v-if="destino.telefono"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Teléfono</span>
						<span class="envio-modal__valor">{{ destino.telefono }}</span>
					</div>
					<div
					v-if="destino.email"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Email</span>
						<span class="envio-modal__valor">{{ destino.email }}</span>
					</div>
					<div class="envio-modal__fila">
						<span class="envio-modal__etiqueta">{{ es_punto_de_retiro ? 'Retiro' : 'Dirección' }}</span>
						<span class="envio-modal__valor">{{ direccion_destinatario }}</span>
					</div>
					<div
					v-if="destino.referencia"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Referencia</span>
						<span class="envio-modal__valor">{{ destino.referencia }}</span>
					</div>
				</div>
				<p
				v-else
				class="envio-modal__vacio">
					El pedido no trae los datos del destinatario.
					<span v-if="order.address">Dirección cargada: {{ order.address }}</span>
				</p>
			</div>

			<!-- Opción de envío elegida en la tienda -->
			<div class="envio-modal__seccion">
				<p class="envio-modal__titulo">Forma de envío elegida</p>
				<div
				v-if="opcion"
				class="envio-modal__opcion">
					<img
					v-if="opcion.carrier_logo"
					:src="opcion.carrier_logo"
					:alt="opcion.carrier_name"
					class="envio-modal__opcion-logo">
					<div class="envio-modal__opcion-texto">
						<strong>{{ opcion.carrier_name }}</strong>
						<span
						v-if="opcion.service_name"
						class="envio-modal__opcion-servicio"> · {{ opcion.service_name }}</span>
						<div class="envio-modal__opcion-detalle">
							{{ texto_precio_opcion }}
							<span v-if="texto_entrega_opcion"> · {{ texto_entrega_opcion }}</span>
						</div>
					</div>
				</div>
				<p
				v-else
				class="envio-modal__vacio">
					El comprador no eligió una forma de envío por correo.
				</p>
			</div>

			<!-- Estado del envío en Zipnova (solo si ya se generó, o se intentó) -->
			<div
			v-if="envio"
			class="envio-modal__seccion">
				<p class="envio-modal__titulo">Envío en Zipnova</p>
				<div class="envio-modal__grilla">
					<div class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Estado</span>
						<span class="envio-modal__valor">
							<b-badge
							:variant="variante_estado"
							:data-testid="'order-envio-estado-' + order.id">{{ texto_estado }}</b-badge>
							<span
							v-if="envio.substatus_name"
							class="envio-modal__substatus"> {{ envio.substatus_name }}</span>
						</span>
					</div>
					<div
					v-if="envio.carrier_name"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Correo</span>
						<span class="envio-modal__valor">
							{{ envio.carrier_name }}
							<span v-if="envio.service_name"> · {{ envio.service_name }}</span>
						</span>
					</div>
					<div
					v-if="numero_seguimiento"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">N° de seguimiento</span>
						<span class="envio-modal__valor">{{ numero_seguimiento }}</span>
					</div>
					<div
					v-if="envio.estimated_delivery"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Entrega estimada</span>
						<span class="envio-modal__valor">{{ fecha(envio.estimated_delivery) }}</span>
					</div>
					<div
					v-if="envio.price_incl_tax || envio.price"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Costo del envío</span>
						<span class="envio-modal__valor">{{ price(envio.price_incl_tax ? envio.price_incl_tax : envio.price) }}</span>
					</div>
					<div
					v-if="envio.tracking_url || envio.tracking_external_url"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Seguimiento</span>
						<span class="envio-modal__valor">
							<a
							:href="envio.tracking_url ? envio.tracking_url : envio.tracking_external_url"
							target="_blank"
							rel="noopener">Ver seguimiento</a>
						</span>
					</div>
					<div
					v-if="envio.ultima_sincronizacion"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Última actualización</span>
						<span class="envio-modal__valor">{{ fecha(envio.ultima_sincronizacion, true) }}</span>
					</div>
				</div>

				<b-alert
				:show="!!envio.error_message"
				variant="danger"
				class="envio-modal__error m-t-10 m-b-0">
					<strong>Último error:</strong> {{ envio.error_message }}
				</b-alert>
			</div>

			<div
			v-else-if="opcion"
			class="envio-modal__seccion">
				<p class="envio-modal__titulo">Envío en Zipnova</p>
				<p class="envio-modal__vacio">
					Todavía no se generó. Se genera solo al confirmar el pedido, o desde el botón de acá
					abajo.
				</p>
			</div>

			<!-- Acciones -->
			<div class="envio-modal__acciones">
				<btn-loader
				v-if="puede_generar"
				:block="false"
				:loader="loading_generar"
				:disabled="!opcion || !destino"
				:text="envio ? 'Volver a generar el envío' : 'Generar envío'"
				variant="primary"
				:data-testid="'order-envio-generar-' + order.id"
				@clicked="generar"></btn-loader>

				<btn-loader
				v-if="envio_vivo"
				:block="false"
				:loader="loading_sincronizar"
				text="Actualizar estado"
				variant="outline-primary"
				@clicked="sincronizar"></btn-loader>

				<b-button
				v-if="envio_vivo"
				variant="outline-primary"
				@click="abrir_etiqueta">
					<i class="bi bi-tag"></i>
					Etiqueta PDF
				</b-button>

				<btn-loader
				v-if="puede_cancelar"
				:block="false"
				:loader="loading_cancelar"
				text="Cancelar envío"
				variant="outline-danger"
				@clicked="cancelar"></btn-loader>
			</div>
		</div>
	</b-modal>
</template>
<script>
import moment from 'moment'
import BtnLoader from '@/common-vue/components/BtnLoader'
import { env } from '@/runtime_config'

/**
 * Modal "Envío" de un pedido de la tienda (misión zipnova-envios, 14/9/2026).
 *
 * Muestra lo que cargó el comprador (destinatario y dirección, `orders.envio_destino`), la forma
 * de envío que eligió (`orders.envio_opcion`) y, si ya existe, el envío en Zipnova (`order.envio`:
 * estado, correo, número de seguimiento, fecha estimada, link de seguimiento, último error).
 *
 * Acciones, todas contra `EnvioController` de empresa-api:
 * - Generar envío  → `POST envio/generar/{order_id}` responde `{model}` = el PEDIDO completo con
 *   `envio`; se reemplaza en el store (`order/add`) y, si el modal de edición está abierto sobre
 *   este mismo pedido, también `order/setModel`.
 * - Actualizar estado → `POST envio/{id}/sincronizar` responde `{model}` = el envío.
 * - Cancelar envío → `POST envio/{id}/cancelar` responde `{model}` = el envío.
 * - Etiqueta PDF → `GET envio/{id}/etiqueta`, abierto en otra pestaña (el PDF lo sirve la API
 *   con la sesión del navegador, misma técnica que la etiqueta de ventas).
 *
 * El pedido normalmente genera el envío solo al confirmarse (OrderController@update); este modal
 * es para ver el estado y para los casos donde eso falló (Zipnova caído, credenciales vencidas):
 * el error queda en `envio.error_message` y el botón permite reintentar.
 */
export default {
	components: {
		BtnLoader,
	},
	props: {
		// El pedido, tal como viene del store (con `envio` por withAll)
		order: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			loading_generar: false,
			loading_sincronizar: false,
			loading_cancelar: false,
			// Espejo de Envio::ESTADOS_FINALES de empresa-api: con uno de estos no se cancela.
			estados_finales: [
				'cancelled',
				'expired',
				'reshipped',
				'delivered',
				'delivered_with_damage',
				'lost_in_carrier',
				'generated_return',
				'returned_to_seller',
				'lost',
			],
			// Espejo de Envio::ESTADOS_REEMPLAZABLES: con uno de estos se puede generar otro.
			estados_reemplazables: ['error', 'cancelled', 'expired'],
		}
	},
	computed: {
		modal_id() {
			return 'order-envio-' + this.order.id
		},
		titulo() {
			return 'Envío del pedido N° ' + (this.order.num ? this.order.num : this.order.id)
		},
		// Opción elegida por el comprador (tolera que venga como string JSON si la API no castea)
		opcion() {
			return this.json_de(this.order.envio_opcion)
		},
		// Destinatario y dirección cargados en la tienda
		destino() {
			return this.json_de(this.order.envio_destino)
		},
		// Envío generado en Zipnova (o el intento fallido, con status 'error')
		envio() {
			return this.order.envio ? this.order.envio : null
		},
		es_punto_de_retiro() {
			return !!(this.opcion && this.opcion.es_punto_de_retiro)
		},
		nombre_destinatario() {
			if (!this.destino) {
				return '-'
			}
			let partes = []
			if (this.destino.nombre) {
				partes.push(this.destino.nombre)
			}
			if (this.destino.apellido) {
				partes.push(this.destino.apellido)
			}
			return partes.length ? partes.join(' ') : '-'
		},
		/**
		 * Dirección en una línea, misma forma que EnvioDestinoHelper::como_texto() de la API:
		 * "{calle} {numero} {piso_depto}, {localidad}, {provincia} (CP {codigo_postal})". Para un
		 * punto de retiro, la sucursal elegida.
		 */
		direccion_destinatario() {
			let destino = this.destino
			if (!destino) {
				return '-'
			}
			if (this.es_punto_de_retiro) {
				let punto = this.punto_de_retiro_elegido
				if (punto) {
					let texto = punto.description ? punto.description : 'Sucursal del correo'
					let calle = [punto.street, punto.street_number].filter(parte => !!parte).join(' ')
					if (calle) {
						texto += ' · ' + calle
					}
					if (punto.city) {
						texto += ', ' + punto.city
					}
					return texto
				}
				return 'Sucursal del correo' + (destino.point_id ? ' N° ' + destino.point_id : '')
			}

			let calle = [destino.calle, destino.numero, destino.piso_depto].filter(parte => !!parte).join(' ')
			let partes = []
			if (calle) {
				partes.push(calle)
			}
			if (destino.localidad) {
				partes.push(destino.localidad)
			}
			if (destino.provincia) {
				partes.push(destino.provincia)
			}
			let texto = partes.join(', ')
			if (destino.codigo_postal) {
				texto += ' (CP ' + destino.codigo_postal + ')'
			}
			return texto ? texto : '-'
		},
		// La sucursal elegida, buscada por point_id entre las que trajo la cotización
		punto_de_retiro_elegido() {
			let point_id = this.destino && this.destino.point_id ? this.destino.point_id : (this.opcion ? this.opcion.point_id : null)
			if (!point_id || !this.opcion || !this.opcion.puntos_de_retiro) {
				return null
			}
			let punto = this.opcion.puntos_de_retiro.find(item => {
				return item.point_id == point_id
			})
			return punto ? punto : null
		},
		texto_precio_opcion() {
			if (!this.opcion) {
				return ''
			}
			if (this.opcion.envio_gratis || Number(this.opcion.precio) === 0) {
				return 'Gratis (lo absorbe el negocio)'
			}
			return this.price(this.opcion.precio)
		},
		texto_entrega_opcion() {
			if (!this.opcion) {
				return ''
			}
			let min = this.opcion.dias_min
			let max = this.opcion.dias_max
			if (min !== null && typeof min != 'undefined' && max !== null && typeof max != 'undefined') {
				if (min == max) {
					return 'llega en ' + min + ' días hábiles'
				}
				return 'llega en ' + min + ' a ' + max + ' días hábiles'
			}
			if (this.opcion.estimated_delivery) {
				return 'llega el ' + moment(this.opcion.estimated_delivery).format('DD/MM')
			}
			return ''
		},
		texto_estado() {
			if (!this.envio) {
				return ''
			}
			if (this.envio.status_name) {
				return this.envio.status_name
			}
			return this.envio.status ? this.envio.status : 'Generado'
		},
		variante_estado() {
			if (!this.envio) {
				return 'secondary'
			}
			if (this.envio.status == 'error') {
				return 'danger'
			}
			if (this.envio.status == 'cancelled' || this.envio.status == 'expired') {
				return 'secondary'
			}
			if (this.envio.status == 'delivered') {
				return 'success'
			}
			return 'primary'
		},
		numero_seguimiento() {
			if (!this.envio) {
				return ''
			}
			if (this.envio.carrier_tracking_id) {
				return this.envio.carrier_tracking_id
			}
			if (this.envio.delivery_id) {
				return this.envio.delivery_id
			}
			return this.envio.proveedor_envio_id ? this.envio.proveedor_envio_id : ''
		},
		// El envío existe en Zipnova y no fue reemplazado: se puede sincronizar e imprimir
		envio_vivo() {
			return !!(this.envio
				&& this.envio.proveedor_envio_id
				&& this.estados_reemplazables.indexOf(this.envio.status) == -1)
		},
		// Sin envío, o con uno que Zipnova ya cerró sin viajar / que nunca se pudo crear
		puede_generar() {
			if (!this.envio) {
				return true
			}
			return this.estados_reemplazables.indexOf(this.envio.status) != -1
		},
		puede_cancelar() {
			return this.envio_vivo && this.estados_finales.indexOf(this.envio.status) == -1
		},
	},
	methods: {
		/**
		 * Devuelve el objeto de un json del pedido, venga como objeto (cast de la API) o como
		 * string (API sin el cast). Null si no hay nada.
		 *
		 * @param {Object|String|null} valor
		 * @returns {Object|null}
		 */
		json_de(valor) {
			if (!valor) {
				return null
			}
			if (typeof valor == 'string') {
				try {
					return JSON.parse(valor)
				} catch (e) {
					return null
				}
			}
			return valor
		},
		/**
		 * Fecha legible (dd/mm/yyyy, con hora si se pide).
		 *
		 * @param {String} valor Fecha ISO del backend.
		 * @param {Boolean} con_hora
		 * @returns {String}
		 */
		fecha(valor, con_hora = false) {
			if (!valor) {
				return ''
			}
			return moment(valor).format(con_hora ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY')
		},
		/**
		 * Mensaje legible de un error de axios: el `message` del 422 del backend o un texto
		 * genérico.
		 *
		 * @param {Object} err
		 * @param {String} fallback
		 * @returns {String}
		 */
		mensaje_de_error(err, fallback) {
			if (err && err.response && err.response.data && err.response.data.message) {
				return err.response.data.message
			}
			return fallback
		},
		/**
		 * Reemplaza el pedido en el store: en el listado (`add` hace upsert en models y filtered)
		 * y, si el modal de edición está abierto sobre este mismo pedido, también el model actual.
		 *
		 * @param {Object} order Pedido completo devuelto por la API.
		 * @returns {void}
		 */
		actualizar_pedido_en_store(order) {
			this.$store.commit('order/add', order)
			let actual = this.$store.state.order.model
			if (actual && actual.id == order.id) {
				this.$store.commit('order/setModel', { model: order, properties: [] })
			}
		},
		/**
		 * Reemplaza solo el envío del pedido (respuesta de sincronizar / cancelar) y lo vuelve a
		 * guardar en el store.
		 *
		 * @param {Object} envio Envío devuelto por la API.
		 * @returns {void}
		 */
		actualizar_envio_en_store(envio) {
			let order = Object.assign({}, this.order, { envio: envio })
			this.actualizar_pedido_en_store(order)
		},
		/**
		 * Genera (o vuelve a generar) el envío en Zipnova para este pedido.
		 *
		 * @returns {void}
		 */
		generar() {
			let self = this
			self.loading_generar = true

			this.$api.post('envio/generar/' + this.order.id)
			.then(res => {
				self.loading_generar = false
				if (res.data && res.data.model) {
					self.actualizar_pedido_en_store(res.data.model)
				}
				self.$toast.success('Envío generado en Zipnova')
			})
			.catch(err => {
				self.loading_generar = false
				console.log(err)
				self.$toast.error(self.mensaje_de_error(err, 'No se pudo generar el envío'))
				// El backend deja igual un envío con status 'error' y el mensaje: se refresca el
				// pedido para mostrarlo en el modal.
				self.refrescar_pedido()
			})
		},
		/**
		 * Vuelve a pedir el pedido completo (con su `envio`) después de un fallo, para que el
		 * modal muestre el intento con su error.
		 *
		 * @returns {void}
		 */
		refrescar_pedido() {
			let self = this
			this.$api.get('order/' + this.order.id)
			.then(res => {
				if (res.data && res.data.model) {
					self.actualizar_pedido_en_store(res.data.model)
				}
			})
			.catch(err => {
				console.log(err)
			})
		},
		/**
		 * Pide a Zipnova el estado actual del envío.
		 *
		 * @returns {void}
		 */
		sincronizar() {
			let self = this
			self.loading_sincronizar = true

			this.$api.post('envio/' + this.envio.id + '/sincronizar')
			.then(res => {
				self.loading_sincronizar = false
				if (res.data && res.data.model) {
					self.actualizar_envio_en_store(res.data.model)
				}
				self.$toast.success('Estado del envío actualizado')
			})
			.catch(err => {
				self.loading_sincronizar = false
				console.log(err)
				self.$toast.error(self.mensaje_de_error(err, 'No se pudo actualizar el estado del envío'))
			})
		},
		/**
		 * Cancela el envío en Zipnova, previa confirmación.
		 *
		 * @returns {void}
		 */
		cancelar() {
			if (!confirm('¿Seguro que querés cancelar el envío en Zipnova? Si el correo ya lo tiene, Zipnova va a pedir el rescate del paquete.')) {
				return
			}

			let self = this
			self.loading_cancelar = true

			this.$api.post('envio/' + this.envio.id + '/cancelar')
			.then(res => {
				self.loading_cancelar = false
				if (res.data && res.data.model) {
					self.actualizar_envio_en_store(res.data.model)
				}
				self.$toast.success('Envío cancelado')
			})
			.catch(err => {
				self.loading_cancelar = false
				console.log(err)
				self.$toast.error(self.mensaje_de_error(err, 'No se pudo cancelar el envío'))
			})
		},
		/**
		 * Abre la etiqueta PDF en otra pestaña. La ruta vive en el grupo autenticado de
		 * routes/api.php (por eso el `/api`); el navegador manda la cookie de sesión solo, igual
		 * que con `sale/etiqueta-envio/pdf` en ventas.
		 *
		 * @returns {void}
		 */
		abrir_etiqueta() {
			window.open(env('VUE_APP_API_URL') + '/api/envio/' + this.envio.id + '/etiqueta')
		},
	},
}
</script>
<style lang="sass">
// Los modales de bootstrap-vue cuelgan de `body`, fuera de `#app`: todos los colores salen de
// tokens (`var(--color-...)`) y no de hexadecimales, si no el modal queda blanco en modo oscuro.
// Mismo criterio que online/modals/orders/LimiteCreditoPedido.vue.
.envio-modal
	.envio-modal__seccion
		margin-bottom: 16px

	.envio-modal__titulo
		margin: 0 0 8px
		font-size: 13px
		font-weight: 600
		text-transform: uppercase
		letter-spacing: .3px
		color: var(--color-text-secondary)

	.envio-modal__grilla
		display: flex
		flex-direction: column
		gap: 6px
		padding: 12px 15px
		background: var(--bg-section)
		border: 1px solid var(--color-border)
		border-radius: 8px

	.envio-modal__fila
		display: flex
		flex-wrap: wrap
		justify-content: space-between
		gap: 8px

	.envio-modal__etiqueta
		color: var(--color-text-secondary)
		flex-shrink: 0

	.envio-modal__valor
		font-weight: 600
		text-align: right
		color: var(--color-text-primary)
		word-break: break-word

	.envio-modal__substatus
		font-weight: 400
		color: var(--color-text-secondary)

	.envio-modal__vacio
		margin: 0
		font-size: 0.875rem
		color: var(--color-text-secondary)

	.envio-modal__opcion
		display: flex
		align-items: center
		gap: 12px
		padding: 12px 15px
		background: var(--bg-section)
		border: 1px solid var(--color-border)
		border-radius: 8px

	.envio-modal__opcion-logo
		width: 40px
		height: 40px
		object-fit: contain
		flex-shrink: 0
		border-radius: 6px

	.envio-modal__opcion-texto
		flex: 1
		min-width: 0
		color: var(--color-text-primary)

	.envio-modal__opcion-servicio
		color: var(--color-text-secondary)

	.envio-modal__opcion-detalle
		font-size: 0.875rem
		color: var(--color-text-secondary)

	.envio-modal__error
		font-size: 0.875rem

	.envio-modal__acciones
		display: flex
		flex-wrap: wrap
		gap: 10px
		padding-top: 12px
		border-top: 1px solid var(--color-border-secondary)

// En telefono las filas etiqueta/valor se apilan y los botones ocupan todo el ancho: a 360px
// "N° de seguimiento" y un codigo largo no entran en la misma linea.
@media (max-width: 575px)
	.envio-modal
		.envio-modal__fila
			flex-direction: column
			gap: 2px
		.envio-modal__valor
			text-align: left
		.envio-modal__acciones
			.btn
				width: 100%
</style>
