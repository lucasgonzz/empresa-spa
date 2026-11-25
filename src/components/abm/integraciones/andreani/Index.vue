<template>
	<b-card
	no-body
	class="integration-card andreani-card">
		<div class="integration-card__body">
			<div class="integration-card__header">
				<div>
					<h6 class="integration-card__title">Envíos (Andreani)</h6>
					<p class="integration-card__description">
						Ofrecé Andreani en tu tienda online con tu propio contrato: el comprador ve el costo del
						envío a domicilio y el retiro en una sucursal de Andreani. Sirve también para los
						paquetes grandes que el resto de los correos no cotizan.
					</p>
					<p
					v-if="connected"
					class="integration-card__cuenta">
						Cliente de Andreani: <strong>{{ config.cliente || integracion.platform_user_id || 'sin número' }}</strong>
						<!-- El &nbsp; es el espacio: el compilador condensa el salto de línea entre los dos tags -->
						<span v-if="config.contrato_domicilio">&nbsp;(contrato {{ config.contrato_domicilio }})</span>
					</p>
				</div>
				<b-badge :variant="status.variant">{{ status.text }}</b-badge>
			</div>

			<!-- ============================== DESCONECTADO ============================== -->
			<conexion
			v-if="!connected"
			:integracion="integracion"
			@actualizado="reemitirActualizado"
			@actualizar="$emit('actualizar')"></conexion>

			<!-- ============================== CONECTADO ============================== -->
			<div
			v-else
			class="andreani-card__cuerpo">
				<b-row>
					<!-- Columna izquierda: configuración y desconectar -->
					<b-col
					lg="6"
					class="m-b-15">
						<configuracion
						:integracion="integracion"
						@actualizado="reemitirActualizado"
						@actualizar="$emit('actualizar')"></configuracion>
					</b-col>

					<!-- Columna derecha: prueba de cotización y ayuda -->
					<b-col lg="6">
						<probar-cotizacion
						:integracion="integracion"></probar-cotizacion>

						<div class="m-t-15">
							<b-link
							class="andreani-card__toggle"
							data-testid="andreani-toggle-como-funciona"
							@click="mostrar_como_funciona = !mostrar_como_funciona">
								<i :class="mostrar_como_funciona ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
								¿Cómo funciona una vez conectado?
							</b-link>
							<b-collapse v-model="mostrar_como_funciona">
								<div class="andreani-card__ayuda">
									<ul class="andreani-card__pasos m-b-0">
										<li>
											En tu tienda online, el cliente escribe su código postal y ve al instante
											cuánto sale el envío con Andreani, a domicilio o retirando en una sucursal.
										</li>
										<li>
											Si un paquete es demasiado grande para los otros correos, la tienda ofrece
											Andreani, que lo cotiza hasta 50 kg y 165 cm por lado.
										</li>
										<li>
											Los pedidos con Andreani los despachás vos: en Tienda online → Pedidos, el
											botón "Envío" de cada pedido muestra "A despachar en Andreani" y el botón
											"Copiar datos" te deja todo listo para pegarlo en el portal de Andreani.
										</li>
										<li>
											El costo del envío se lo cobrás al cliente en el mismo pedido, salvo que
											marques "Envío gratis" en el artículo o pongas un monto de "envío gratis a
											partir de $".
										</li>
									</ul>
								</div>
							</b-collapse>
						</div>
					</b-col>
				</b-row>
			</div>
		</div>
	</b-card>
</template>
<script>
import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Tarjeta "Envíos (Andreani)" de la solapa "Tienda online" del ABM de Integraciones (misión
 * envios-andreani, 25/11/2026). Es el ORQUESTADOR: sólo arma el encabezado, el estado y el layout, y
 * registra los tres sub-componentes (regla de carpeta con 2 o más sub-componentes propios):
 *
 * - `Conexion.vue`: número de cliente y contratos para conectar (con el paso a paso).
 * - `Configuracion.vue`: paquete por defecto, envío gratis, declarar valor, ofrecer en la tienda,
 *   guardar y desconectar.
 * - `ProbarCotizacion.vue`: "Probá cómo lo ve tu cliente" por código postal.
 *
 * Mismo estilo y misma mecánica que `ZipnovaCard.vue`: todos los endpoints responden `{integracion}`
 * con el item ya actualizado; el sub-componente lo emite con `actualizado` y esta tarjeta lo reenvía
 * a `TiendaOnline.vue`, que lo reemplaza en su lista sin volver a pedir el listado (así la tarjeta
 * no se desmonta y no se pierde, por ejemplo, la cotización de prueba que el dueño acaba de hacer).
 *
 * 🔴 La tarjeta nunca ve una credencial guardada: `GET /api/integraciones` devuelve `config` con el
 * cliente, los contratos y la configuración, nunca el `access_token`.
 *
 * 🔴 Los estilos de TODA la carpeta (prefijo `andreani-card__`) viven acá, en un único bloque, y se
 * usan desde los sub-componentes: como la tarjeta de Zipnova, no son `scoped`.
 */
export default {
	name: 'AndreaniCard',
	mixins: [IntegrationConnector],
	components: {
		Conexion: () => import('@/components/abm/integraciones/andreani/Conexion'),
		Configuracion: () => import('@/components/abm/integraciones/andreani/Configuracion'),
		ProbarCotizacion: () => import('@/components/abm/integraciones/andreani/ProbarCotizacion'),
	},
	props: {
		// Item del listado de GET /api/integraciones:
		// { slug, name, grupo, connected, expires_at, platform_user_id, config? }
		integracion: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// La explicación de "una vez conectado" viene cerrada: ya conectó, es de consulta.
			mostrar_como_funciona: false,
		}
	},
	computed: {
		// true si el comercio ya conectó su cuenta de Andreani
		connected() {
			return !!this.integracion.connected
		},
		// Configuración que manda el backend (siempre un objeto)
		config() {
			return this.integracion.config ? this.integracion.config : {}
		},
		// Texto y variante de color a mostrar en el badge de estado
		status() {
			return this.integrationStatusInfo(this.integracion.connected, this.integracion.expires_at)
		},
	},
	methods: {
		/**
		 * Reenvía al padre (TiendaOnline.vue) el item actualizado que emitió un sub-componente.
		 *
		 * @param {Object} integracion Item con la misma forma que los de GET /api/integraciones.
		 * @returns {void}
		 */
		reemitirActualizado(integracion) {
			this.$emit('actualizado', integracion)
		},
	},
}
</script>
<style lang="sass">
// Estilos de la tarjeta de Andreani y de sus tres sub-componentes. Los de .integration-card (marco,
// encabezado, badge, acciones) viven en TiendaOnline.vue y se reutilizan tal cual; acá van sólo los
// bloques que esta tarjeta agrega, con su propio prefijo para no pisar nada. Mismo aspecto que la
// tarjeta de Zipnova.
//
// 🔴 Colores sólo desde los tokens de _dark_theme.sass, nunca literales: la tarjeta tiene que
// verse bien en los dos temas sin un bloque aparte.
.andreani-card
	// El ABM centra el texto de toda la pantalla y las tarjetas lo heredan: un formulario y un paso
	// a paso centrados no se leen. La tarjeta entera vuelve a alinear a la izquierda.
	text-align: left

	.andreani-card__cuerpo
		margin-top: 18px

	.andreani-card__alerta
		font-size: 13px
		margin-bottom: 14px

	.andreani-card__campo
		margin-bottom: 14px

	.andreani-card__label
		display: block
		margin-bottom: 4px
		font-size: 13px
		font-weight: 600
		color: var(--color-text-primary)

	.andreani-card__sublabel
		display: block
		margin-bottom: 2px
		font-size: 12px
		color: var(--color-text-secondary)

	// Los cuatro inputs del bulto van apretados: son cuatro números chicos, no cuatro campos.
	.andreani-card__bulto
		margin-left: -4px
		margin-right: -4px
		> [class*="col-"]
			padding-left: 4px
			padding-right: 4px
			margin-bottom: 6px

	.andreani-card__ayuda-corta
		font-size: 12px
		line-height: 1.45
		color: var(--color-text-secondary)
		margin-bottom: 0

	.andreani-card__toggle
		font-size: 13px
		font-weight: 600

	// Mismo fondo y radio que la ayuda de la tarjeta de Zipnova y el asesor de Mercado Pago.
	.andreani-card__ayuda
		margin-top: 10px
		padding: 12px 14px
		font-size: 13px
		line-height: 1.55
		color: var(--color-text-secondary)
		background: var(--bg-section)
		border-radius: 10px

	.andreani-card__pasos
		padding-left: 20px
		margin-bottom: 10px
		li
			margin-bottom: 6px

	.andreani-card__prueba
		padding: 12px 14px
		border: 1px solid var(--color-border-secondary)
		border-radius: 10px

	.andreani-card__prueba-fila
		display: flex
		gap: 8px
		align-items: stretch
		input
			flex: 1
			min-width: 0
		.btn
			flex-shrink: 0

	.andreani-card__prueba-error
		font-size: 13px

	.andreani-card__prueba-vacio
		font-size: 13px
		color: var(--color-text-secondary)

	.andreani-card__opciones
		list-style: none
		padding: 0
		margin: 0

	.andreani-card__opcion
		display: flex
		align-items: center
		gap: 10px
		padding: 8px 0
		border-top: 1px solid var(--color-border-secondary)
		font-size: 13px
		&:first-child
			border-top: 0

	.andreani-card__opcion-texto
		flex: 1
		min-width: 0
		color: var(--color-text-primary)

	.andreani-card__opcion-servicio
		color: var(--color-text-secondary)

	.andreani-card__opcion-detalle
		font-size: 12px
		color: var(--color-text-secondary)

	.andreani-card__opcion-precio
		flex-shrink: 0
		font-weight: 600
		white-space: nowrap
		color: var(--color-text-primary)

// En teléfono la fila "código postal + Cotizar" se apila: a 360px el input y el botón juntos no
// dejan lugar para escribir. El precio baja debajo del texto para que el servicio largo no se corte.
@media (max-width: 575px)
	.andreani-card
		.andreani-card__prueba-fila
			flex-direction: column
			.btn
				width: 100%
		.andreani-card__opcion
			flex-wrap: wrap
		.andreani-card__opcion-precio
			margin-left: auto
</style>
