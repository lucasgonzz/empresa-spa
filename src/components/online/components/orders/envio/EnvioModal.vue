<template>
	<b-modal
	:id="modal_id"
	:title="titulo"
	size="lg"
	hide-footer>
		<div class="envio-modal">
			<!--
				Destinatario: nombre y teléfono del comprador (del destino de Zipnova si lo hay, si no
				del comprador del pedido) y la dirección de entrega, que es un botón: abre el mapa.
			-->
			<div class="envio-modal__seccion">
				<p class="envio-modal__titulo">Destinatario</p>
				<div
				v-if="hay_datos_del_destinatario"
				class="envio-modal__grilla">
					<div
					v-if="nombre_destinatario"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Nombre</span>
						<span class="envio-modal__valor">{{ nombre_destinatario }}</span>
					</div>
					<div
					v-if="destino && destino.documento"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">DNI</span>
						<span class="envio-modal__valor">{{ destino.documento }}</span>
					</div>
					<div
					v-if="telefono_destinatario"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Teléfono</span>
						<span class="envio-modal__valor">{{ telefono_destinatario }}</span>
					</div>
					<div
					v-if="email_destinatario"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Email</span>
						<span class="envio-modal__valor">{{ email_destinatario }}</span>
					</div>
					<div
					v-if="es_punto_de_retiro"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Retiro</span>
						<span class="envio-modal__valor">{{ texto_punto_de_retiro }}</span>
					</div>
					<div
					v-if="direccion_de_entrega"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">{{ es_punto_de_retiro ? 'Domicilio' : 'Dirección' }}</span>
						<span class="envio-modal__valor">
							<b-button
							variant="link"
							class="envio-modal__direccion"
							title="Ver la dirección en el mapa"
							:data-testid="'direccion-envio-mapa-' + order.id"
							@click="abrir_mapa">
								<i class="bi bi-geo-alt-fill"></i>
								{{ direccion_de_entrega.texto }}
							</b-button>
						</span>
					</div>
					<div
					v-if="referencia_de_entrega"
					class="envio-modal__fila">
						<span class="envio-modal__etiqueta">Referencia</span>
						<span class="envio-modal__valor">{{ referencia_de_entrega }}</span>
					</div>
				</div>
				<p
				v-else
				class="envio-modal__vacio">
					El pedido no trae los datos del destinatario ni la dirección de entrega.
				</p>
			</div>

			<!--
				Forma de envío elegida en la tienda: el correo de Zipnova, una forma de envío propia del
				comercio (con su costo, o "A convenir") o, si el comprador no eligió ninguna, el envío a
				domicilio a secas.
			-->
			<div class="envio-modal__seccion">
				<p class="envio-modal__titulo">Forma de envío elegida</p>
				<div
				v-if="va_por_zipnova"
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
				<div
				v-else-if="forma_propia"
				class="envio-modal__opcion"
				:data-testid="'forma-envio-propia-' + order.id">
					<span class="envio-modal__opcion-icono">
						<i class="bi bi-shop"></i>
					</span>
					<div class="envio-modal__opcion-texto">
						<strong>{{ forma_propia.name }}</strong>
						<span class="envio-modal__opcion-servicio"> · Forma de envío propia</span>
						<div class="envio-modal__opcion-detalle">{{ texto_costo_forma_propia }}</div>
						<div
						v-if="forma_propia.description"
						class="envio-modal__opcion-detalle">{{ forma_propia.description }}</div>
					</div>
				</div>
				<div
				v-else
				class="envio-modal__opcion">
					<span class="envio-modal__opcion-icono">
						<i class="bi bi-house-door"></i>
					</span>
					<div class="envio-modal__opcion-texto">
						<strong>Envío a domicilio (sin forma elegida)</strong>
					</div>
				</div>
				<p
				v-if="!va_por_zipnova"
				class="envio-modal__ayuda">
					Coordiná la entrega (y el costo, si corresponde) con el comprador por WhatsApp o
					teléfono.
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

				<!-- Un intento que ya no cuenta, sobre un pedido que no se puede generar (sin confirmar o cancelado) -->
				<p
				v-if="puede_generar && texto_generacion_frenada"
				class="envio-modal__vacio m-t-10">
					{{ texto_generacion_frenada }}
				</p>
			</div>

			<!--
				Zipnova elegido y todavía sin generar. 🔴 El envío se crea en Zipnova (y se le cobra al
				comercio) recién cuando el comercio confirma el pedido: con el pedido sin confirmar no se
				ofrece generarlo (la API también lo rechaza con un 422, EnvioController@generar).
			-->
			<div
			v-else-if="va_por_zipnova"
			class="envio-modal__seccion">
				<p class="envio-modal__titulo">Envío en Zipnova</p>
				<p
				class="envio-modal__vacio"
				:data-testid="'envio-zipnova-sin-generar-' + order.id">
					{{ texto_sin_generar }}
				</p>
			</div>

			<!--
				Fila en `generando` dentro de la ventana: hay un request a Zipnova en curso (o que
				acaba de salir). No hay nada que operar todavía; se ofrece volver a leer el pedido.
			-->
			<b-alert
			:show="generando_vigente"
			variant="info"
			class="envio-modal__generando m-b-10">
				El envío se está generando en Zipnova en este momento. Esperá unos segundos y tocá
				<strong>Actualizar</strong>.
			</b-alert>

			<!-- Acciones (solo las de Zipnova: una forma propia no tiene nada que operar acá) -->
			<div
			v-if="hay_acciones"
			class="envio-modal__acciones">
				<btn-loader
				v-if="mostrar_generar"
				:block="false"
				:loader="loading_generar"
				:disabled="!opcion || !destino"
				:text="envio ? 'Volver a generar el envío' : 'Generar envío'"
				variant="primary"
				:data-testid="'order-envio-generar-' + order.id"
				@clicked="generar"></btn-loader>

				<btn-loader
				v-if="generando_vigente"
				:block="false"
				:loader="loading_refrescar"
				text="Actualizar"
				variant="outline-primary"
				:data-testid="'order-envio-refrescar-' + order.id"
				@clicked="refrescar_pedido"></btn-loader>

				<btn-loader
				v-if="puede_operar"
				:block="false"
				:loader="loading_sincronizar"
				text="Actualizar estado"
				variant="outline-primary"
				@clicked="sincronizar"></btn-loader>

				<btn-loader
				v-if="puede_operar"
				:block="false"
				:loader="loading_etiqueta"
				icon_class="bi bi-tag"
				text="Etiqueta PDF"
				variant="outline-primary"
				:data-testid="'order-envio-etiqueta-' + order.id"
				@clicked="abrir_etiqueta"></btn-loader>

				<btn-loader
				v-if="puede_cancelar"
				:block="false"
				:loader="loading_cancelar"
				text="Cancelar envío"
				variant="outline-danger"
				@clicked="cancelar"></btn-loader>
			</div>

			<!--
				El mapa de la dirección de entrega. Va adentro del contenido del modal de envío: se
				monta solo mientras este está abierto, y se apila arriba de él al abrirse.
			-->
			<mapa-direccion
			:id="mapa_id"
			:direccion="direccion_de_entrega"></mapa-direccion>
		</div>
	</b-modal>
</template>
<script>
import moment from 'moment'
import BtnLoader from '@/common-vue/components/BtnLoader'
import MapaDireccion from '@/components/online/components/orders/envio/MapaDireccion'
import { collect_laravel_validation_messages } from '@/utils/laravel_validation_toast'
import { envio_va_por_zipnova, es_forma_propia_a_convenir } from '@/utils/formas_de_envio'
import { direccion_de_envio_del_pedido, direccion_desde_envio_direccion } from '@/utils/direccion_de_envio'

/**
 * Modal "Envío" de un pedido de la tienda (misión zipnova-envios, 14/9/2026; ampliado en la misión
 * formas-envio-direcciones-maps, 19/10/2026).
 *
 * Se abre para TODO pedido con envío a domicilio, salga por Zipnova o por una forma de envío propia
 * del comercio (`order.delivery_zone`, p. ej. "Acordar con el vendedor"). Muestra:
 *
 * - El destinatario: nombre y teléfono (del destino de Zipnova, `orders.envio_destino`, o si no
 *   del comprador del pedido) y la dirección de entrega, clickeable: abre `MapaDireccion` con un
 *   marcador. La dirección sale de `orders.envio_direccion` (la que el comprador eligió con el
 *   buscador de Google en la tienda nueva), si no de `envio_destino`, si no de `orders.address`
 *   (ver utils/direccion_de_envio.js).
 * - La forma de envío que eligió: el correo de Zipnova (`orders.envio_opcion`), la forma propia
 *   con su costo o "A convenir", o "Envío a domicilio (sin forma elegida)". Para lo que no es
 *   Zipnova, una ayuda: la entrega se coordina con el comprador.
 * - Solo si el envío va por Zipnova: el envío en Zipnova (`order.envio`: estado, correo, número de
 *   seguimiento, fecha estimada, link de seguimiento, último error) y sus acciones.
 *
 * 🔴 "Va por Zipnova" se decide igual que en la API (`envio_va_por_zipnova`, espejo de
 * `Order::envio_va_por_zipnova()`): `envio_opcion` con algo y `envio_proveedor` vacío o 'zipnova'.
 *
 * 🔴 "Generar envío" aparece solo con el pedido confirmado (estado distinto de "Sin confirmar" y de
 * "Cancelado", comparado por NOMBRE como `OrderStatusHelper`): crear el envío en Zipnova es lo que
 * le cobra el envío al comercio, y desde esta misión la API lo rechaza (422) sobre un pedido sin
 * confirmar o cancelado. En su lugar se explica que se genera al confirmar.
 *
 * Acciones, todas contra `EnvioController` de empresa-api:
 * - Generar envío  → `POST envio/generar/{order_id}` responde `{model}` = el PEDIDO completo con
 *   `envio`; se reemplaza en el store (`order/add`) y, si el modal de edición está abierto sobre
 *   este mismo pedido, también `order/setModel`.
 * - Actualizar estado → `POST envio/{id}/sincronizar` responde `{model}` = el envío.
 * - Cancelar envío → `POST envio/{id}/cancelar` responde `{model}` = el envío.
 * - Etiqueta PDF → `GET envio/{id}/etiqueta` por XHR con `responseType: 'blob'`, y el PDF se
 *   abre como blob en una pestaña que se abre DENTRO del click (si se abriera después de la
 *   respuesta, el bloqueador de ventanas emergentes la frenaría). Un `window.open` directo a la
 *   ruta no sirve: un 422 ("la etiqueta todavía no está lista") dejaba una pestaña con JSON
 *   crudo, y la ruta vive en `auth:sanctum`, que con una navegación depende del Referer.
 *
 * El pedido normalmente genera el envío solo al confirmarse (OrderController@update); este modal
 * es para ver el estado y para los casos donde eso falló (Zipnova caído, credenciales vencidas):
 * el error queda en `envio.error_message` y el botón permite reintentar.
 */
export default {
	components: {
		BtnLoader,
		MapaDireccion,
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
			loading_etiqueta: false,
			loading_refrescar: false,
			// Espejo de Envio::MINUTOS_GENERANDO: una fila en `generando` más vieja que esto quedó
			// abandonada (el PHP murió a mitad del request) y se puede volver a generar.
			minutos_generando: 2,
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
			// `not_found` es Zipnova respondiendo 404 al sincronizar (lo borraron desde el panel):
			// el backend pide "generá uno nuevo desde acá", así que acá tiene que aparecer Generar.
			estados_reemplazables: ['error', 'not_found', 'cancelled', 'expired'],
			// Espejo de OrderStatusHelper::SIN_CONFIRMAR y ::CANCELADO: con el pedido en uno de estos
			// estados el envío no se genera en Zipnova. Por NOMBRE, nunca por id: los ids de
			// `order_statuses` cambian entre instalaciones.
			estado_sin_confirmar: 'Sin confirmar',
			estado_cancelado: 'Cancelado',
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
		// El envío sale por Zipnova (espejo de Order::envio_va_por_zipnova(), ver utils/formas_de_envio.js)
		va_por_zipnova() {
			return envio_va_por_zipnova(this.order)
		},
		// La forma de envío propia que eligió el comprador (una `delivery_zone`), o null
		forma_propia() {
			let zona = this.order.delivery_zone
			return zona && zona.name ? zona : null
		},
		/**
		 * Costo de la forma propia, para el renglón de "Forma de envío elegida". 🔴 Una forma a
		 * convenir dice "A convenir", nunca "Gratis" ni "$ 0": el costo lo arregla el vendedor.
		 */
		texto_costo_forma_propia() {
			if (!this.forma_propia) {
				return ''
			}
			if (es_forma_propia_a_convenir(this.forma_propia)) {
				return 'A convenir (no se cobró en la tienda)'
			}
			if (Number(this.forma_propia.price) > 0) {
				return this.price(this.forma_propia.price)
			}
			return 'Sin costo para el comprador'
		},
		es_punto_de_retiro() {
			return !!(this.va_por_zipnova && this.opcion && this.opcion.es_punto_de_retiro)
		},
		// Nombre y apellido: del destino de Zipnova si lo hay, si no del comprador del pedido
		nombre_destinatario() {
			let partes = []
			if (this.destino && (this.destino.nombre || this.destino.apellido)) {
				partes = [this.destino.nombre, this.destino.apellido]
			} else if (this.order.buyer) {
				partes = [this.order.buyer.name, this.order.buyer.surname]
			}
			return partes.filter(parte => !!parte).join(' ')
		},
		telefono_destinatario() {
			if (this.destino && this.destino.telefono) {
				return this.destino.telefono
			}
			return this.order.buyer && this.order.buyer.phone ? this.order.buyer.phone : ''
		},
		email_destinatario() {
			if (this.destino && this.destino.email) {
				return this.destino.email
			}
			return this.order.buyer && this.order.buyer.email ? this.order.buyer.email : ''
		},
		/**
		 * Para un retiro en una sucursal del correo: la sucursal elegida ("{descripción} · {calle}
		 * {altura}, {localidad}"), o al menos su número.
		 */
		texto_punto_de_retiro() {
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
			return 'Sucursal del correo' + (this.destino && this.destino.point_id ? ' N° ' + this.destino.point_id : '')
		},
		/**
		 * La dirección de entrega, lista para mostrar y para el mapa (utils/direccion_de_envio.js):
		 * `envio_direccion` → `envio_destino` → `address`. En un retiro en una sucursal del correo el
		 * paquete no va al domicilio: solo se muestra el domicilio que el comprador cargó con el
		 * buscador (`envio_direccion`), si lo hay, y la sucursal va en su propia fila.
		 */
		direccion_de_entrega() {
			if (this.es_punto_de_retiro) {
				return direccion_desde_envio_direccion(this.order.envio_direccion)
			}
			return direccion_de_envio_del_pedido(this.order)
		},
		referencia_de_entrega() {
			if (this.direccion_de_entrega && this.direccion_de_entrega.referencia) {
				return this.direccion_de_entrega.referencia
			}
			return this.destino && this.destino.referencia ? this.destino.referencia : ''
		},
		hay_datos_del_destinatario() {
			return !!(this.nombre_destinatario
				|| this.telefono_destinatario
				|| this.email_destinatario
				|| this.direccion_de_entrega
				|| this.es_punto_de_retiro
				|| (this.destino && this.destino.documento))
		},
		// Id del modal del mapa: propio de este modal (el formulario del pedido monta otro)
		mapa_id() {
			return 'mapa-envio-pedido-' + this.order.id
		},
		/**
		 * Nombre del estado del pedido. Se prefiere la relación embebida si es la del
		 * `order_status_id` actual; si no, se busca el id en el store de estados (se descarga al
		 * iniciar sesión). Null si no se puede resolver.
		 */
		nombre_estado() {
			let estado_id = Number(this.order.order_status_id)
			let embebido = this.order.order_status
			if (embebido && embebido.name && (!estado_id || Number(embebido.id) === estado_id)) {
				return embebido.name
			}
			let store = this.$store.state.order_status
			let estados = store && Array.isArray(store.models) ? store.models : []
			let estado = estados.find(item => Number(item.id) === estado_id)
			return estado && estado.name ? estado.name : null
		},
		/**
		 * Por qué no se puede generar el envío en Zipnova ahora, o '' si se puede. Mismo criterio
		 * que EnvioController@generar: un estado que no se puede resolver no frena.
		 */
		texto_generacion_frenada() {
			if (this.nombre_estado == this.estado_sin_confirmar) {
				return 'El envío se genera en Zipnova cuando confirmás el pedido. Hasta entonces no se te cobra nada.'
			}
			if (this.nombre_estado == this.estado_cancelado) {
				return 'El pedido está cancelado: el envío no se genera en Zipnova.'
			}
			return ''
		},
		texto_sin_generar() {
			if (this.texto_generacion_frenada) {
				return this.texto_generacion_frenada
			}
			return 'Todavía no se generó. Se genera solo al confirmar el pedido; si eso falló (por ejemplo, porque Zipnova no respondió), generalo desde el botón de acá abajo.'
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
			if (this.envio.status == 'error' || this.envio.status == 'not_found') {
				return 'danger'
			}
			if (this.envio.status == 'generando') {
				return 'warning'
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
		/**
		 * Fila en `generando` dentro de la ventana (espejo de Envio::generando_vigente()): hay un
		 * request a Zipnova que salió hace menos de `minutos_generando` y no volvió. Pasada la
		 * ventana, el proceso murió y la fila se puede volver a generar. La fecha viaja en ISO
		 * UTC (Laravel serializa con toJSON), así que la diferencia no depende del huso.
		 */
		generando_vigente() {
			if (!this.envio || this.envio.status != 'generando') {
				return false
			}
			let desde = this.envio.updated_at ? this.envio.updated_at : this.envio.created_at
			if (!desde) {
				return false
			}
			let minutos = moment().diff(moment(desde), 'minutes')
			return !isNaN(minutos) && minutos < this.minutos_generando
		},
		/**
		 * El envío todavía cuenta para el pedido (espejo de Envio::esta_vivo()): se está generando
		 * ahora mismo, o existe en Zipnova y no está en un estado reemplazable. Con uno vivo no se
		 * genera otro.
		 */
		envio_vivo() {
			if (!this.envio) {
				return false
			}
			if (this.envio.status == 'generando') {
				return this.generando_vigente
			}
			return !!(this.envio.proveedor_envio_id
				&& this.estados_reemplazables.indexOf(this.envio.status) == -1)
		},
		// Existe en Zipnova (tiene id) y está vivo: se puede sincronizar e imprimir la etiqueta
		puede_operar() {
			return this.envio_vivo && !this.generando_vigente && !!this.envio.proveedor_envio_id
		},
		// Sin envío, o con uno que ya no cuenta (error, no encontrado, cerrado sin viajar,
		// `generando` abandonado). Es exactamente lo contrario de tener uno vivo: si no, un
		// `generando` abandonado dejaba el modal sin ningún botón.
		puede_generar() {
			return !this.envio || !this.envio_vivo
		},
		puede_cancelar() {
			return this.puede_operar && this.estados_finales.indexOf(this.envio.status) == -1
		},
		/**
		 * "Generar envío" (o "Volver a generar"): el envío va por Zipnova, no hay uno vivo y el
		 * pedido está confirmado. Sin confirmar o cancelado no se ofrece: en su lugar se lee
		 * `texto_generacion_frenada`.
		 */
		mostrar_generar() {
			return this.va_por_zipnova && this.puede_generar && !this.texto_generacion_frenada
		},
		// Si hay algún botón para dibujar: sin ninguno no se dibuja la franja de acciones vacía
		hay_acciones() {
			return this.mostrar_generar || this.generando_vigente || this.puede_operar || this.puede_cancelar
		},
	},
	methods: {
		/**
		 * Abre el mapa con la dirección de entrega (se apila arriba de este modal).
		 *
		 * @returns {void}
		 */
		abrir_mapa() {
			this.$bvModal.show(this.mapa_id)
		},
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
		 * Mensaje legible de un error de axios: los mensajes de validación de Laravel si vienen
		 * (`errors: {campo: [...]}`, ya traducidos por el servidor; el `message` de esos 422 es
		 * "The given data was invalid." y no sirve), si no el `message` del backend, si no un
		 * texto genérico.
		 *
		 * @param {Object} err
		 * @param {String} fallback
		 * @returns {String}
		 */
		mensaje_de_error(err, fallback) {
			let data = err && err.response && err.response.data ? err.response.data : null
			return this.mensaje_desde_data(data, fallback)
		},
		/**
		 * Misma lógica que mensaje_de_error() pero a partir del cuerpo ya parseado (lo usa la
		 * etiqueta, que recibe el error como blob).
		 *
		 * @param {Object|null} data
		 * @param {String} fallback
		 * @returns {String}
		 */
		mensaje_desde_data(data, fallback) {
			if (!data || typeof data != 'object') {
				return fallback
			}
			let mensajes = collect_laravel_validation_messages(data)
			if (mensajes.length) {
				return mensajes.join(' ')
			}
			if (data.message) {
				return data.message
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

			// skip_global_error_event: el 422 se muestra acá con su mensaje; sin la bandera el
			// interceptor de main.js sacaría ademas el toast generico (dos avisos del mismo hecho).
			this.$api.post('envio/generar/' + this.order.id, null, { skip_global_error_event: true, skip_global_validation_toast: true })
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
			self.loading_refrescar = true
			this.$api.get('order/' + this.order.id)
			.then(res => {
				self.loading_refrescar = false
				if (res.data && res.data.model) {
					self.actualizar_pedido_en_store(res.data.model)
				}
			})
			.catch(err => {
				self.loading_refrescar = false
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

			this.$api.post('envio/' + this.envio.id + '/sincronizar', null, { skip_global_error_event: true, skip_global_validation_toast: true })
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
				// El backend cambia la fila ANTES de responder el 422 (un 404 de Zipnova la deja en
				// `not_found`): se vuelve a leer el pedido para mostrar ese estado y sus botones.
				self.refrescar_pedido()
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

			this.$api.post('envio/' + this.envio.id + '/cancelar', null, { skip_global_error_event: true, skip_global_validation_toast: true })
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
				// Un 401 de Zipnova al cancelar sincroniza el envío antes de fallar: el estado real
				// ya cambió en la fila y hay que volver a leerlo.
				self.refrescar_pedido()
			})
		},
		/**
		 * Pide la etiqueta PDF por XHR y la abre como blob en otra pestaña.
		 *
		 * La pestaña se abre vacía DENTRO del click: un `window.open` que llega después de la
		 * respuesta (asincrónica) lo frena el bloqueador de ventanas emergentes. Si la API falla
		 * (422 "la etiqueta todavía no está lista", 404, 500) la pestaña se cierra y el mensaje
		 * va a un toast; como el request pide blob, el cuerpo del error también llega como blob y
		 * hay que leerlo como texto antes de parsearlo.
		 *
		 * @returns {void}
		 */
		abrir_etiqueta() {
			let self = this
			let pestania = window.open('', '_blank')
			self.loading_etiqueta = true

			this.$api.get('envio/' + this.envio.id + '/etiqueta', {
				responseType: 'blob',
				skip_global_error_event: true,
				skip_global_validation_toast: true,
			})
			.then(res => {
				self.loading_etiqueta = false
				let url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
				if (pestania) {
					pestania.location.href = url
				} else {
					window.open(url)
				}
			})
			.catch(err => {
				self.loading_etiqueta = false
				if (pestania) {
					pestania.close()
				}
				console.log(err)
				self.leer_error_blob(err)
				.then(data => {
					self.$toast.error(self.mensaje_desde_data(data, 'No se pudo descargar la etiqueta'))
				})
			})
		},
		/**
		 * Cuerpo de un error de axios que se pidió con `responseType: 'blob'`: el JSON viene
		 * adentro de un Blob, se lee como texto y se parsea. Si no es JSON (o no es un blob),
		 * devuelve null y el que llama usa su texto genérico.
		 *
		 * @param {Object} err Error de axios.
		 * @returns {Promise<Object|null>}
		 */
		leer_error_blob(err) {
			let data = err && err.response ? err.response.data : null
			if (!data) {
				return Promise.resolve(null)
			}
			if (typeof data == 'object' && typeof data.text != 'function') {
				// Ya vino parseado (no era blob)
				return Promise.resolve(data)
			}
			if (typeof data.text != 'function') {
				return Promise.resolve(null)
			}
			return data.text()
			.then(texto => {
				try {
					return JSON.parse(texto)
				} catch (e) {
					return null
				}
			})
			.catch(() => {
				return null
			})
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

	// Ícono de una forma propia o del envío sin forma, en el lugar del logo del correo
	.envio-modal__opcion-icono
		display: flex
		align-items: center
		justify-content: center
		width: 40px
		height: 40px
		flex-shrink: 0
		border-radius: 6px
		font-size: 20px
		color: var(--color-text-secondary)
		background: var(--bg-card)
		border: 1px solid var(--color-border)

	.envio-modal__ayuda
		margin: 8px 0 0
		font-size: 0.875rem
		color: var(--color-text-secondary)

	// La dirección es un botón (abre el mapa) que se lee como un link: hereda la alineación del
	// valor (derecha en escritorio, izquierda en teléfono) y el texto largo baja de renglón.
	.envio-modal__direccion
		padding: 0
		border: 0
		font-weight: 600
		text-align: inherit
		white-space: normal
		word-break: break-word
		vertical-align: baseline

		i
			margin-right: 4px

	.envio-modal__error
		font-size: 0.875rem

	.envio-modal__generando
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
