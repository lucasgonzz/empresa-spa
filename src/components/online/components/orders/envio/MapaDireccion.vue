<template>
	<!--
		Sin `static` a propósito: un b-modal que no es estático no dibuja su contenido mientras está
		cerrado, así que el iframe de Google Maps recién se pide al abrirlo (y se descarta al
		cerrarlo). Importa porque cada fila de Pedidos online monta su propio modal de envío.
	-->
	<b-modal
	:id="id"
	:title="titulo"
	size="lg"
	hide-footer>
		<div
		v-if="direccion"
		class="mapa-direccion">
			<div class="mapa-direccion__marco">
				<iframe
				:src="url_embebida"
				:title="'Mapa de ' + direccion.texto"
				class="mapa-direccion__iframe"
				data-testid="mapa-direccion-iframe"
				loading="lazy"
				referrerpolicy="no-referrer-when-downgrade"
				allowfullscreen></iframe>
			</div>

			<p class="mapa-direccion__texto">
				<i class="bi bi-geo-alt-fill"></i>
				{{ direccion.texto }}
			</p>
			<p
			v-if="direccion.referencia"
			class="mapa-direccion__detalle">
				Referencia: {{ direccion.referencia }}
			</p>
			<!-- Sin coordenadas el mapa ubica la dirección por el texto: el marcador puede no ser exacto -->
			<p
			v-if="!tiene_coordenadas"
			class="mapa-direccion__detalle">
				La ubicación es aproximada: se buscó por la dirección escrita.
			</p>

			<div class="mapa-direccion__acciones">
				<b-button
				variant="primary"
				:href="url_externa"
				target="_blank"
				rel="noopener"
				data-testid="mapa-direccion-abrir-en-google-maps">
					<i class="bi bi-box-arrow-up-right"></i>
					Abrir en Google Maps
				</b-button>
			</div>
		</div>
	</b-modal>
</template>
<script>
import { env } from '@/runtime_config'

/**
 * Modal con la dirección de entrega de un pedido en un mapa de Google Maps, con un marcador
 * (misión formas-envio-direcciones-maps, 19/10/2026). Lo abren la dirección clickeable del modal
 * de envío (`EnvioModal`) y el botón "Ver en el mapa" del formulario del pedido (`BtnVerEnMapa`).
 *
 * 🔴 Es un `<iframe>` y no la librería JS de Google Maps a propósito: el ERP no la carga en ningún
 * lado, y para mostrar un punto alcanza con el mapa embebido.
 *
 * Qué mapa se pide:
 *  - Si `config.js` trae `VUE_APP_GOOGLE_MAPS_API_KEY`, la Maps Embed API oficial
 *    (`/maps/embed/v1/place`), que es la forma que Google documenta.
 *  - Si no (es lo que pasa hoy: el admin no escribe esa clave en el config.js de empresa), el mapa
 *    embebido clásico `maps.google.com/maps?...&output=embed`, que no necesita clave ni
 *    facturación.
 *  - Con coordenadas, el marcador va en `lat,lng`; sin coordenadas (un pedido viejo que solo trae
 *    la dirección en texto), se busca por el texto y se avisa que puede no ser exacto.
 *
 * Debajo del mapa, la dirección en texto y "Abrir en Google Maps" en una pestaña nueva (para
 * sacar el recorrido o mandársela al repartidor).
 */
export default {
	props: {
		// Id del b-modal. Tiene que ser único en la pantalla: el modal de envío y el formulario del
		// pedido montan cada uno el suyo, y con el mismo id `$bvModal.show()` abriría los dos.
		id: {
			type: String,
			required: true,
		},
		// Dirección resuelta por utils/direccion_de_envio.js: { texto, texto_para_buscar,
		// referencia, lat, lng }. Null si el pedido no trae ninguna (el modal queda vacío).
		direccion: {
			type: Object,
			default: null,
		},
		titulo: {
			type: String,
			default: 'Dirección de entrega',
		},
	},
	computed: {
		tiene_coordenadas() {
			return !!(this.direccion && this.direccion.lat !== null && this.direccion.lng !== null
				&& typeof this.direccion.lat != 'undefined' && typeof this.direccion.lng != 'undefined')
		},
		/**
		 * Lo que se le pide al mapa: "lat,lng" si hay coordenadas (números, no hace falta
		 * codificarlos), o el texto de la dirección codificado para la URL.
		 */
		consulta() {
			if (!this.direccion) {
				return ''
			}
			if (this.tiene_coordenadas) {
				return Number(this.direccion.lat) + ',' + Number(this.direccion.lng)
			}
			let texto = this.direccion.texto_para_buscar ? this.direccion.texto_para_buscar : this.direccion.texto
			return encodeURIComponent(texto ? texto : '')
		},
		// Clave de la Maps Embed API, si el frente la tiene configurada en config.js
		api_key() {
			let valor = env('VUE_APP_GOOGLE_MAPS_API_KEY', '')
			return valor ? String(valor).trim() : ''
		},
		url_embebida() {
			if (this.api_key) {
				return 'https://www.google.com/maps/embed/v1/place?key=' + encodeURIComponent(this.api_key)
					+ '&q=' + this.consulta + '&zoom=16&language=es'
			}
			return 'https://maps.google.com/maps?q=' + this.consulta + '&z=16&hl=es&output=embed'
		},
		// Link universal de Google Maps: abre la app en el teléfono y la web en la computadora
		url_externa() {
			return 'https://www.google.com/maps/search/?api=1&query=' + this.consulta
		},
	},
}
</script>
<style lang="sass">
// Los modales de bootstrap-vue cuelgan de `body`, fuera de `#app`: los colores salen de tokens
// (`var(--color-...)`), igual que en EnvioModal, para que el modal no quede blanco en modo oscuro.
.mapa-direccion
	.mapa-direccion__marco
		width: 100%
		height: 420px
		overflow: hidden
		border: 1px solid var(--color-border)
		border-radius: 8px
		background: var(--bg-section)

	.mapa-direccion__iframe
		display: block
		width: 100%
		height: 100%
		border: 0

	.mapa-direccion__texto
		margin: 12px 0 4px
		font-weight: 600
		color: var(--color-text-primary)
		word-break: break-word

		i
			margin-right: 4px
			color: var(--color-text-secondary)

	.mapa-direccion__detalle
		margin: 0 0 4px
		font-size: 0.875rem
		color: var(--color-text-secondary)

	.mapa-direccion__acciones
		display: flex
		flex-wrap: wrap
		gap: 10px
		padding-top: 12px

		i
			margin-right: 4px

// En teléfono el mapa ocupa el 60 % del alto de la pantalla y el botón todo el ancho
@media (max-width: 575px)
	.mapa-direccion
		.mapa-direccion__marco
			height: 60vh
		.mapa-direccion__acciones
			.btn
				width: 100%
</style>
