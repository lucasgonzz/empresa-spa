<template>
	<b-card
	no-body
	class="integration-card zipnova-card">
		<div class="integration-card__body">
			<div class="integration-card__header">
				<div>
					<h6 class="integration-card__title">Envíos (Zipnova)</h6>
					<p class="integration-card__description">
						Cotizá y despachá con Correo Argentino, Andreani y más de 20 transportes desde tu tienda
						online. El comprador ve el costo y el tiempo de entrega con su código postal.
					</p>
					<p
					v-if="connected"
					class="integration-card__cuenta">
						Cuenta de Zipnova: <strong>{{ config.account_name || 'sin nombre' }}</strong>
						<!-- El &nbsp; es el espacio: el compilador condensa el salto de línea entre los dos tags -->
						<span v-if="integracion.platform_user_id">&nbsp;(N° {{ integracion.platform_user_id }})</span>
					</p>
				</div>
				<b-badge :variant="status.variant">{{ status.text }}</b-badge>
			</div>

			<!-- ============================== DESCONECTADO ============================== -->
			<b-row
			v-if="!connected"
			class="zipnova-card__cuerpo">
				<b-col
				lg="6"
				class="m-b-15">
					<b-alert
					:show="!!error_conexion"
					variant="danger"
					class="zipnova-card__alerta">
						{{ error_conexion }}
					</b-alert>

					<div class="zipnova-card__campo">
						<label
						for="zipnova-api-token"
						class="zipnova-card__label">API Token</label>
						<b-form-input
						id="zipnova-api-token"
						type="text"
						autocomplete="off"
						spellcheck="false"
						placeholder="Pegá acá el código que te da Zipnova"
						data-testid="zipnova-api-token"
						v-model.trim="api_token"></b-form-input>
					</div>

					<div class="zipnova-card__campo">
						<label
						for="zipnova-api-secret"
						class="zipnova-card__label">API Secret</label>
						<b-form-input
						id="zipnova-api-secret"
						type="text"
						autocomplete="off"
						spellcheck="false"
						placeholder="Pegá acá el código que te da Zipnova"
						data-testid="zipnova-api-secret"
						v-model.trim="api_secret"></b-form-input>
					</div>

					<btn-loader
					:block="false"
					:loader="loading"
					:disabled="!puede_conectar"
					text="Conectar"
					variant="primary"
					@clicked="conectar"></btn-loader>
				</b-col>

				<b-col lg="6">
					<b-link
					class="zipnova-card__toggle"
					data-testid="zipnova-toggle-paso-a-paso"
					@click="mostrar_paso_a_paso = !mostrar_paso_a_paso">
						<i :class="mostrar_paso_a_paso ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
						¿Cómo consigo estos dos códigos? (paso a paso)
					</b-link>

					<b-collapse v-model="mostrar_paso_a_paso">
						<div class="zipnova-card__ayuda">
							<p>
								<strong>¿Qué es Zipnova?</strong> Es un servicio que junta a todos los correos (Correo
								Argentino, Andreani, OCA y muchos más) en un solo lugar. Vos abrís una cuenta ahí, y
								ComercioCity la usa para cotizar y despachar los pedidos de tu tienda online.
							</p>
							<ol class="zipnova-card__pasos">
								<li>
									Entrá a Zipnova desde la computadora:
									<a
									href="https://app.zipnova.com.ar"
									target="_blank"
									rel="noopener">app.zipnova.com.ar</a>.
									Si todavía no tenés cuenta, tocá "Regístrate", completá los datos de tu negocio y
									seguí los pasos hasta entrar. Crear la cuenta no cuesta nada.
								</li>
								<li>
									Ya adentro, buscá en el menú de la izquierda la opción "Configuración" y entrá.
								</li>
								<li>
									Dentro de Configuración, entrá en "Integraciones".
								</li>
								<li>
									Tocá el botón "Gestionar credenciales y webhooks".
								</li>
								<li>
									Tocá "Crear token". Zipnova te muestra dos códigos largos: uno se llama API Token
									y el otro API Secret. Son como el usuario y la contraseña que ComercioCity va a
									usar para hablar con Zipnova. No se los pases a nadie.
								</li>
								<li>
									Copiá el API Token y pegalo en el primer casillero de acá abajo. Después copiá el
									API Secret y pegalo en el segundo. (Para copiar: pintá el código con el mouse y
									apretá Ctrl + C. Para pegar: hacé clic en el casillero y apretá Ctrl + V.)
								</li>
								<li>
									Tocá "Conectar". Si está todo bien, vas a ver el nombre de tu cuenta de Zipnova y
									el depósito desde donde salen tus envíos.
								</li>
								<li>
									Completá el "paquete por defecto": cuánto pesa y cuánto mide un paquete típico
									tuyo. Se usa para los artículos a los que todavía no les cargaste peso y medidas.
								</li>
								<li>
									Probá: escribí un código postal en "Probá cómo lo ve tu cliente" y fijate que
									aparezcan los correos con su precio y sus días de entrega. Si aparecen, ya está:
									tu tienda online cotiza sola.
								</li>
							</ol>
							<p class="m-b-0">
								¿Algo no funciona? Escribinos por WhatsApp y lo vemos juntos.
							</p>
						</div>
					</b-collapse>
				</b-col>
			</b-row>

			<!-- ============================== CONECTADO ============================== -->
			<div
			v-else
			class="zipnova-card__cuerpo">
				<b-alert
				:show="config.webhook_registrado === false"
				variant="warning"
				class="zipnova-card__alerta">
					Zipnova no pudo avisarnos automáticamente los cambios de estado; el sistema los consulta
					cada 30 minutos igual.
				</b-alert>

				<b-row>
					<!-- Columna izquierda: configuración -->
					<b-col
					lg="6"
					class="m-b-15">
						<!-- Depósito de origen -->
						<div class="zipnova-card__campo">
							<label
							for="zipnova-origin"
							class="zipnova-card__label">Depósito desde donde salen los envíos</label>
							<b-form-select
							id="zipnova-origin"
							data-testid="zipnova-origin"
							:options="opciones_origenes"
							:disabled="!config.origins || !config.origins.length"
							v-model="form.origin_id"></b-form-select>
							<p
							v-if="!config.origins || !config.origins.length"
							class="zipnova-card__aviso m-t-5">
								Zipnova no tiene ningún depósito habilitado para envíos: cargalo en Zipnova →
								Configuración → Orígenes y tocá <em>Actualizar depósitos</em>.
							</p>
							<btn-loader
							:block="false"
							size="sm"
							variant="outline-secondary"
							class="m-t-5"
							:loader="actualizando_origenes"
							text="Actualizar depósitos"
							@clicked="actualizarOrigenes"></btn-loader>
						</div>

						<!-- Paquete por defecto -->
						<div class="zipnova-card__campo">
							<p class="zipnova-card__label m-b-5">Paquete por defecto</p>
							<b-row class="zipnova-card__bulto">
								<b-col
								cols="6"
								md="3">
									<label
									for="zipnova-bulto-peso"
									class="zipnova-card__sublabel">Peso (kg)</label>
									<b-form-input
									id="zipnova-bulto-peso"
									type="number"
									min="0.01"
									step="0.01"
									inputmode="decimal"
									v-model="form.bulto_default.peso"></b-form-input>
								</b-col>
								<b-col
								cols="6"
								md="3">
									<label
									for="zipnova-bulto-alto"
									class="zipnova-card__sublabel">Alto (cm)</label>
									<b-form-input
									id="zipnova-bulto-alto"
									type="number"
									min="1"
									step="1"
									inputmode="numeric"
									v-model="form.bulto_default.alto"></b-form-input>
								</b-col>
								<b-col
								cols="6"
								md="3">
									<label
									for="zipnova-bulto-ancho"
									class="zipnova-card__sublabel">Ancho (cm)</label>
									<b-form-input
									id="zipnova-bulto-ancho"
									type="number"
									min="1"
									step="1"
									inputmode="numeric"
									v-model="form.bulto_default.ancho"></b-form-input>
								</b-col>
								<b-col
								cols="6"
								md="3">
									<label
									for="zipnova-bulto-profundidad"
									class="zipnova-card__sublabel">Largo (cm)</label>
									<b-form-input
									id="zipnova-bulto-profundidad"
									type="number"
									min="1"
									step="1"
									inputmode="numeric"
									v-model="form.bulto_default.profundidad"></b-form-input>
								</b-col>
							</b-row>
							<p class="zipnova-card__ayuda-corta m-t-5">
								Se usa para cotizar los artículos a los que todavía no les cargaste peso y medidas.
								Cargalos en cada artículo (Listado → editar → Envíos) o de a muchos con la edición
								masiva.
							</p>
						</div>

						<!-- Envío gratis desde -->
						<div class="zipnova-card__campo">
							<label
							for="zipnova-envio-gratis-desde"
							class="zipnova-card__label">Envío gratis a partir de $</label>
							<b-form-input
							id="zipnova-envio-gratis-desde"
							type="number"
							min="0"
							step="0.01"
							inputmode="decimal"
							placeholder="Dejalo vacío si no ofrecés envío gratis por monto"
							v-model="form.envio_gratis_desde"></b-form-input>
						</div>

						<!-- Asegurar -->
						<div class="zipnova-card__campo">
							<b-form-checkbox
							id="zipnova-declarar-valor"
							v-model="form.declarar_valor"
							:value="true"
							:unchecked-value="false">
								Asegurar cada envío por el valor de la compra
							</b-form-checkbox>
						</div>

						<btn-loader
						:block="false"
						:loader="guardando"
						text="Guardar"
						variant="primary"
						@clicked="guardarConfig"></btn-loader>
					</b-col>

					<!-- Columna derecha: prueba de cotización y ayuda -->
					<b-col lg="6">
						<div class="zipnova-card__prueba">
							<p class="zipnova-card__label m-b-5">Probá cómo lo ve tu cliente</p>
							<div class="zipnova-card__prueba-fila">
								<b-form-input
								id="zipnova-prueba-zipcode"
								data-testid="zipnova-prueba-zipcode"
								type="text"
								inputmode="numeric"
								maxlength="8"
								placeholder="Código postal"
								v-model.trim="prueba.zipcode"
								@keyup.enter="cotizarPrueba"></b-form-input>
								<btn-loader
								:block="false"
								:loader="cotizando"
								:disabled="!prueba.zipcode"
								text="Cotizar"
								variant="outline-primary"
								@clicked="cotizarPrueba"></btn-loader>
							</div>

							<!-- Zipnova no reconoció el CP solo: pide localidad y provincia -->
							<div
							v-if="prueba.needs_location"
							class="zipnova-card__prueba-ubicacion m-t-10">
								<b-form-input
								type="text"
								placeholder="Localidad"
								v-model.trim="prueba.city"></b-form-input>
								<b-form-input
								type="text"
								placeholder="Provincia"
								v-model.trim="prueba.state"
								@keyup.enter="cotizarPrueba"></b-form-input>
							</div>

							<p
							v-if="prueba.error"
							class="zipnova-card__prueba-error text-danger m-t-10 m-b-0">
								{{ prueba.error }}
							</p>

							<div
							v-if="prueba.cotizado && !prueba.opciones.length && !prueba.error"
							class="zipnova-card__prueba-vacio m-t-10">
								Ningún correo llega a ese código postal con el paquete por defecto.
							</div>

							<ul
							v-if="prueba.opciones.length"
							class="zipnova-card__opciones m-t-10">
								<li
								v-for="opcion in prueba.opciones"
								:key="opcion.key"
								class="zipnova-card__opcion">
									<img
									v-if="opcion.carrier_logo"
									:src="opcion.carrier_logo"
									:alt="opcion.carrier_name"
									class="zipnova-card__opcion-logo">
									<div class="zipnova-card__opcion-texto">
										<strong>{{ opcion.carrier_name }}</strong>
										<span class="zipnova-card__opcion-servicio"> · {{ opcion.service_name }}</span>
										<div class="zipnova-card__opcion-entrega">{{ textoEntrega(opcion) }}</div>
									</div>
									<div class="zipnova-card__opcion-precio">
										{{ textoPrecio(opcion) }}
									</div>
								</li>
							</ul>
						</div>

						<div class="m-t-15">
							<b-link
							class="zipnova-card__toggle"
							data-testid="zipnova-toggle-como-funciona"
							@click="mostrar_como_funciona = !mostrar_como_funciona">
								<i :class="mostrar_como_funciona ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
								¿Cómo funciona una vez conectado?
							</b-link>
							<b-collapse v-model="mostrar_como_funciona">
								<div class="zipnova-card__ayuda">
									<ul class="zipnova-card__pasos m-b-0">
										<li>
											En tu tienda online, el cliente escribe su código postal y ve al instante
											cuánto sale el envío y cuántos días tarda, con cada correo disponible.
										</li>
										<li>
											Al confirmar la compra con envío a domicilio, le pedimos la dirección
											completa y sus datos (nombre, DNI, teléfono y email): es lo que el correo
											necesita para entregar.
										</li>
										<li>
											Cuando confirmás el pedido en ComercioCity (Tienda online → Pedidos), el
											envío se genera solo en Zipnova. Desde el botón "Envío" de cada pedido
											imprimís la etiqueta, ves el estado (en camino, entregado...) y podés
											cancelarlo.
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

				<div class="integration-card__actions">
					<btn-loader
					:block="false"
					size="sm"
					variant="outline-danger"
					:loader="loading"
					text="Desconectar"
					@clicked="desconectar"></btn-loader>
				</div>
			</div>
		</div>
	</b-card>
</template>
<script>
import moment from 'moment'
import BtnLoader from '@/common-vue/components/BtnLoader'
import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Tarjeta de estado, conexión y configuración de Zipnova (envíos), dentro de la solapa
 * "Tienda online" del ABM de Integraciones. Reemplaza a la vieja ZippinCard (OAuth), que se
 * borró: Zipnova (ex Zippin) se conecta pegando el API Token y el API Secret que el comercio
 * genera en su propia cuenta (misión zipnova-envios, 14/9/2026).
 *
 * Está escrita para alguien que no usa computadoras: el paso a paso para conseguir los dos
 * códigos viene abierto por defecto, y una vez conectado se puede probar una cotización con un
 * código postal para ver exactamente lo mismo que ve el comprador en la tienda.
 *
 * 🔴 La tarjeta nunca ve una credencial guardada. Lo único que viaja al backend son el token y
 * el secret en el momento de conectar; después, `GET /api/integraciones` devuelve el item con
 * una clave `config` (cuenta, depósitos, paquete por defecto, envío gratis, si el webhook quedó
 * registrado) y nada más.
 *
 * Todos los endpoints de Zipnova responden `{integracion}` con el item ya actualizado: la
 * tarjeta lo emite con `actualizado` y el padre (TiendaOnline.vue) lo reemplaza en su lista sin
 * volver a pedir el listado, así no se desmonta la tarjeta y no se pierde, por ejemplo, la
 * cotización de prueba que el dueño acaba de hacer.
 */
export default {
	name: 'ZipnovaCard',
	mixins: [IntegrationConnector],
	components: {
		BtnLoader,
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
			// Indicador de carga de Conectar / Desconectar
			loading: false,
			// Indicador de carga del botón Guardar (configuración)
			guardando: false,
			// Indicador de carga de "Actualizar depósitos"
			actualizando_origenes: false,
			// Indicador de carga de la cotización de prueba
			cotizando: false,
			// Credenciales que el dueño pega para conectar. Se vacían apenas conecta.
			api_token: '',
			api_secret: '',
			// Mensaje del 422/502 del conectar, para el alert rojo
			error_conexion: null,
			// El paso a paso viene ABIERTO: es la primera vez que el dueño ve esto y sin él no
			// sabe de dónde sacar los códigos.
			mostrar_paso_a_paso: true,
			// La explicación de "una vez conectado" viene cerrada: ya conectó, es de consulta.
			mostrar_como_funciona: false,
			// Copia editable de `config` (se sincroniza desde la prop en el watcher)
			form: this.formVacio(),
			// Estado de la cotización de prueba
			prueba: {
				zipcode: '',
				city: '',
				state: '',
				needs_location: false,
				opciones: [],
				error: null,
				cotizado: false,
			},
		}
	},
	computed: {
		// true si el comercio ya tiene conectada su cuenta de Zipnova
		connected() {
			return !!this.integracion.connected
		},
		// Configuración que manda el backend cuando está conectado (siempre un objeto)
		config() {
			return this.integracion.config ? this.integracion.config : {}
		},
		// Texto y variante de color a mostrar en el badge de estado
		status() {
			return this.integrationStatusInfo(this.integracion.connected, this.integracion.expires_at)
		},
		// Los dos códigos pegados (Zipnova los valida; acá solo se evita mandar vacío)
		puede_conectar() {
			return this.api_token.length > 0 && this.api_secret.length > 0
		},
		// Opciones del select de depósitos, a partir de `config.origins`
		opciones_origenes() {
			let opciones = [{ value: null, text: 'Elegí el depósito' }]
			if (this.config.origins && this.config.origins.length) {
				this.config.origins.forEach(origen => {
					opciones.push({
						value: origen.id,
						text: origen.label,
					})
				})
			}
			return opciones
		},
	},
	watch: {
		/**
		 * Cada vez que el padre reemplaza el item (conectar, guardar, actualizar depósitos), se
		 * vuelve a copiar la configuración al formulario. `immediate` para la primera carga.
		 */
		integracion: {
			immediate: true,
			deep: true,
			handler() {
				this.sincronizarForm()
			},
		},
	},
	methods: {
		/**
		 * Formulario de configuración con los mismos defaults que usa el backend
		 * (ZipnovaCredentialsHelper::config()).
		 *
		 * @returns {Object}
		 */
		formVacio() {
			return {
				origin_id: null,
				bulto_default: {
					peso: 0.5,
					alto: 10,
					ancho: 10,
					profundidad: 10,
				},
				declarar_valor: true,
				envio_gratis_desde: null,
			}
		},
		/**
		 * Copia `config` de la prop al formulario editable, sin pisar los defaults cuando el
		 * backend manda una clave en null.
		 *
		 * @returns {void}
		 */
		sincronizarForm() {
			let form = this.formVacio()
			let config = this.config

			if (typeof config.origin_id != 'undefined' && config.origin_id !== null) {
				form.origin_id = config.origin_id
			}
			if (config.bulto_default) {
				['peso', 'alto', 'ancho', 'profundidad'].forEach(clave => {
					if (typeof config.bulto_default[clave] != 'undefined' && config.bulto_default[clave] !== null) {
						form.bulto_default[clave] = config.bulto_default[clave]
					}
				})
			}
			if (typeof config.declarar_valor != 'undefined' && config.declarar_valor !== null) {
				form.declarar_valor = !!config.declarar_valor
			}
			if (typeof config.envio_gratis_desde != 'undefined' && config.envio_gratis_desde !== null) {
				form.envio_gratis_desde = config.envio_gratis_desde
			}

			this.form = form
		},
		/**
		 * Mensaje legible de un error de axios: el `message` del 422/502 del backend, o un texto
		 * genérico si no vino nada.
		 *
		 * @param {Object} err Error de axios.
		 * @param {String} fallback Texto si el backend no mandó mensaje.
		 * @returns {String}
		 */
		mensajeDeError(err, fallback) {
			if (err && err.response && err.response.data && err.response.data.message) {
				return err.response.data.message
			}
			return fallback
		},
		/**
		 * Avisa al padre con el item actualizado que devolvió el backend; si por lo que sea no
		 * vino, le pide que vuelva a cargar el listado.
		 *
		 * @param {Object} res Respuesta de axios.
		 * @returns {void}
		 */
		emitirActualizado(res) {
			if (res && res.data && res.data.integracion) {
				this.$emit('actualizado', res.data.integracion)
			} else {
				this.$emit('actualizar')
			}
		},
		/**
		 * Conecta la cuenta con el token y el secret pegados. Un 422 se muestra en el alert rojo
		 * con el mensaje del backend (credenciales rechazadas, cuenta sin datos).
		 *
		 * @returns {void}
		 */
		conectar() {
			if (!this.puede_conectar) {
				this.$toast.error('Pegá los dos códigos: el API Token y el API Secret')
				return
			}

			let self = this
			self.loading = true
			self.error_conexion = null
			this.$store.commit('auth/setMessage', 'Conectando con Zipnova')
			this.$store.commit('auth/setLoading', true)

			this.requestZipnovaConectar(this.api_token, this.api_secret)
			.then(res => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				// Los códigos ya quedaron cifrados en el backend: no se retienen en memoria
				self.api_token = ''
				self.api_secret = ''
				self.$toast.success('Zipnova conectado')
				self.emitirActualizado(res)
			})
			.catch(err => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.error_conexion = self.mensajeDeError(err, 'No se pudo conectar con Zipnova. Probá de nuevo en un rato.')
			})
		},
		/**
		 * Desconecta la cuenta de Zipnova, previa confirmación.
		 *
		 * @returns {void}
		 */
		desconectar() {
			if (!confirm('¿Seguro que querés desconectar tu cuenta de Zipnova? Tu tienda online va a dejar de cotizar y generar envíos hasta que la vuelvas a conectar.')) {
				return
			}

			let self = this
			self.loading = true
			this.$store.commit('auth/setMessage', 'Desconectando Zipnova')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationDisconnect('zipnova', { skip_global_error_event: true })
			.then(res => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.success('Zipnova desconectado')
				self.emitirActualizado(res)
			})
			.catch(err => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.$toast.error(self.mensajeDeError(err, 'No se pudo desconectar Zipnova'))
			})
		},
		/**
		 * Guarda la configuración (depósito, paquete por defecto, envío gratis, asegurar).
		 *
		 * Los números viajan como Number y el "envío gratis desde" vacío viaja como null, que es
		 * lo que el backend entiende como "no ofrece envío gratis por monto".
		 *
		 * @returns {void}
		 */
		guardarConfig() {
			let self = this
			let bulto = this.form.bulto_default
			let payload = {
				origin_id: this.form.origin_id,
				bulto_default: {
					peso: Number(bulto.peso),
					alto: Number(bulto.alto),
					ancho: Number(bulto.ancho),
					profundidad: Number(bulto.profundidad),
				},
				declarar_valor: !!this.form.declarar_valor,
				envio_gratis_desde: (this.form.envio_gratis_desde === '' || this.form.envio_gratis_desde === null)
					? null
					: Number(this.form.envio_gratis_desde),
			}

			if (!(payload.bulto_default.peso > 0) || !(payload.bulto_default.alto > 0) || !(payload.bulto_default.ancho > 0) || !(payload.bulto_default.profundidad > 0)) {
				this.$toast.error('El paquete por defecto necesita peso, alto, ancho y largo mayores a cero')
				return
			}

			self.guardando = true

			this.requestZipnovaConfig(payload)
			.then(res => {
				self.guardando = false
				self.$toast.success('Configuración de Zipnova guardada')
				self.emitirActualizado(res)
			})
			.catch(err => {
				self.guardando = false
				console.log(err)
				self.$toast.error(self.mensajeDeError(err, 'No se pudo guardar la configuración'))
			})
		},
		/**
		 * Vuelve a pedirle a Zipnova los depósitos habilitados para envíos.
		 *
		 * @returns {void}
		 */
		actualizarOrigenes() {
			let self = this
			self.actualizando_origenes = true

			this.requestZipnovaOrigenes()
			.then(res => {
				self.actualizando_origenes = false
				let integracion = res && res.data ? res.data.integracion : null
				if (integracion && integracion.config && integracion.config.origins && integracion.config.origins.length) {
					self.$toast.success('Depósitos actualizados')
				} else {
					self.$toast.warning('Zipnova todavía no tiene ningún depósito habilitado para envíos')
				}
				self.emitirActualizado(res)
			})
			.catch(err => {
				self.actualizando_origenes = false
				console.log(err)
				self.$toast.error(self.mensajeDeError(err, 'No se pudieron actualizar los depósitos'))
			})
		},
		/**
		 * Cotiza un envío de prueba al código postal escrito, con el paquete por defecto.
		 *
		 * Si Zipnova no reconoce el código postal solo (422 con `needs_location`), se muestran
		 * localidad y provincia y se vuelve a intentar con esos datos.
		 *
		 * @returns {void}
		 */
		cotizarPrueba() {
			if (!this.prueba.zipcode) {
				this.$toast.error('Escribí un código postal')
				return
			}

			let self = this
			self.cotizando = true
			self.prueba.error = null
			self.prueba.opciones = []
			self.prueba.cotizado = false

			let city = this.prueba.needs_location && this.prueba.city ? this.prueba.city : null
			let state = this.prueba.needs_location && this.prueba.state ? this.prueba.state : null

			this.requestZipnovaCotizarPrueba(this.prueba.zipcode, city, state)
			.then(res => {
				self.cotizando = false
				self.prueba.cotizado = true
				self.prueba.needs_location = false
				let cotizacion = res.data && res.data.cotizacion ? res.data.cotizacion : null
				self.prueba.opciones = cotizacion && cotizacion.opciones ? cotizacion.opciones : []
			})
			.catch(err => {
				self.cotizando = false
				console.log(err)
				let data = err && err.response && err.response.data ? err.response.data : {}
				if (data.needs_location) {
					// Zipnova necesita localidad y provincia para ubicar ese código postal
					self.prueba.needs_location = true
				}
				self.prueba.error = data.message
					? data.message
					: 'No pudimos cotizar en este momento. Probá de nuevo en un rato.'
			})
		},
		/**
		 * "llega en X a Y días hábiles" (o "en X días hábiles" si son iguales); si no vienen días,
		 * la fecha estimada; si no hay nada, vacío.
		 *
		 * @param {Object} opcion Opción normalizada (§2.4 del plan).
		 * @returns {String}
		 */
		textoEntrega(opcion) {
			let min = opcion.dias_min
			let max = opcion.dias_max
			if (min !== null && typeof min != 'undefined' && max !== null && typeof max != 'undefined') {
				if (min == max) {
					return 'Llega en ' + min + ' días hábiles'
				}
				return 'Llega en ' + min + ' a ' + max + ' días hábiles'
			}
			if (min !== null && typeof min != 'undefined') {
				return 'Llega en ' + min + ' días hábiles'
			}
			if (opcion.estimated_delivery) {
				return 'Llega el ' + moment(opcion.estimated_delivery).format('DD/MM')
			}
			return ''
		},
		/**
		 * Precio de la opción tal como lo ve el comprador: "Gratis" si aplica envío gratis.
		 *
		 * @param {Object} opcion Opción normalizada.
		 * @returns {String}
		 */
		textoPrecio(opcion) {
			if (opcion.envio_gratis || Number(opcion.precio) === 0) {
				return 'Gratis'
			}
			return this.price(opcion.precio)
		},
	},
}
</script>
<style lang="sass">
// Estilos propios de la tarjeta de Zipnova. Los de .integration-card (marco, encabezado,
// badge, acciones) viven en TiendaOnline.vue y se reutilizan tal cual; acá van solo los
// bloques que esta tarjeta agrega (formularios, paso a paso, prueba de cotización), con su
// propio prefijo para no pisar nada.
//
// 🔴 Colores solo desde los tokens de _dark_theme.sass, nunca literales: la tarjeta tiene que
// verse bien en los dos temas sin un bloque aparte.
.zipnova-card
	// El ABM centra el texto de toda la pantalla y las tarjetas lo heredan; para Mercado Pago
	// (dos renglones y un boton) pasa desapercibido, pero un paso a paso de nueve puntos y un
	// formulario centrados no se leen. La tarjeta entera vuelve a alinear a la izquierda.
	text-align: left

	.zipnova-card__cuerpo
		margin-top: 18px

	.zipnova-card__alerta
		font-size: 13px
		margin-bottom: 14px

	.zipnova-card__campo
		margin-bottom: 14px

	.zipnova-card__label
		display: block
		margin-bottom: 4px
		font-size: 13px
		font-weight: 600
		color: var(--color-text-primary)

	.zipnova-card__sublabel
		display: block
		margin-bottom: 2px
		font-size: 12px
		color: var(--color-text-secondary)

	// Los cuatro inputs del bulto van apretados: son cuatro numeros chicos, no cuatro campos.
	.zipnova-card__bulto
		margin-left: -4px
		margin-right: -4px
		> [class*="col-"]
			padding-left: 4px
			padding-right: 4px
			margin-bottom: 6px

	.zipnova-card__aviso
		font-size: 12px
		line-height: 1.45
		color: var(--color-text-secondary)

	.zipnova-card__ayuda-corta
		font-size: 12px
		line-height: 1.45
		color: var(--color-text-secondary)
		margin-bottom: 0

	.zipnova-card__toggle
		font-size: 13px
		font-weight: 600

	// Mismo fondo y radio que el asesor de comision de Mercado Pago, para que las dos ayudas
	// se lean como la misma cosa.
	.zipnova-card__ayuda
		margin-top: 10px
		padding: 12px 14px
		font-size: 13px
		line-height: 1.55
		color: var(--color-text-secondary)
		background: var(--bg-section)
		border-radius: 10px

	.zipnova-card__pasos
		padding-left: 20px
		margin-bottom: 10px
		li
			margin-bottom: 6px

	.zipnova-card__prueba
		padding: 12px 14px
		border: 1px solid var(--color-border-secondary)
		border-radius: 10px

	.zipnova-card__prueba-fila
		display: flex
		gap: 8px
		align-items: stretch
		input
			flex: 1
			min-width: 0
		.btn
			flex-shrink: 0

	.zipnova-card__prueba-ubicacion
		display: flex
		gap: 8px
		input
			flex: 1
			min-width: 0

	.zipnova-card__prueba-error
		font-size: 13px

	.zipnova-card__prueba-vacio
		font-size: 13px
		color: var(--color-text-secondary)

	.zipnova-card__opciones
		list-style: none
		padding: 0
		margin: 0

	.zipnova-card__opcion
		display: flex
		align-items: center
		gap: 10px
		padding: 8px 0
		border-top: 1px solid var(--color-border-secondary)
		font-size: 13px
		&:first-child
			border-top: 0

	.zipnova-card__opcion-logo
		width: 36px
		height: 36px
		object-fit: contain
		flex-shrink: 0
		border-radius: 6px
		background: var(--bg-section)

	.zipnova-card__opcion-texto
		flex: 1
		min-width: 0
		color: var(--color-text-primary)

	.zipnova-card__opcion-servicio
		color: var(--color-text-secondary)

	.zipnova-card__opcion-entrega
		font-size: 12px
		color: var(--color-text-secondary)

	.zipnova-card__opcion-precio
		flex-shrink: 0
		font-weight: 600
		white-space: nowrap
		color: var(--color-text-primary)

// En telefono la fila "codigo postal + Cotizar" y la de "localidad + provincia" se apilan:
// a 360px los dos inputs juntos no dejan lugar para escribir.
@media (max-width: 575px)
	.zipnova-card
		.zipnova-card__prueba-fila,
		.zipnova-card__prueba-ubicacion
			flex-direction: column
			.btn
				width: 100%
</style>
