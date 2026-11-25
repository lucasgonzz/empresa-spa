<template>
	<b-row class="andreani-card__cuerpo">
		<b-col
		lg="6"
		class="m-b-15">
			<b-alert
			:show="!!error_conexion"
			variant="danger"
			class="andreani-card__alerta">
				{{ error_conexion }}
			</b-alert>

			<div class="andreani-card__campo">
				<label
				for="andreani-cliente"
				class="andreani-card__label">Número de cliente de Andreani</label>
				<b-form-input
				id="andreani-cliente"
				type="text"
				autocomplete="off"
				spellcheck="false"
				placeholder="Por ejemplo CL0003750"
				data-testid="andreani-cliente"
				v-model.trim="cliente"></b-form-input>
			</div>

			<div class="andreani-card__campo">
				<label
				for="andreani-contrato-domicilio"
				class="andreani-card__label">Contrato de envío a domicilio</label>
				<b-form-input
				id="andreani-contrato-domicilio"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				spellcheck="false"
				placeholder="Por ejemplo 400006709"
				data-testid="andreani-contrato-domicilio"
				v-model.trim="contrato_domicilio"></b-form-input>
			</div>

			<div class="andreani-card__campo">
				<label
				for="andreani-contrato-sucursal"
				class="andreani-card__label">Contrato de retiro en sucursal (opcional)</label>
				<b-form-input
				id="andreani-contrato-sucursal"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				spellcheck="false"
				placeholder="Dejalo vacío si no ofrecés retiro en sucursal"
				data-testid="andreani-contrato-sucursal"
				v-model.trim="contrato_sucursal"></b-form-input>
			</div>

			<div class="andreani-card__campo">
				<label
				for="andreani-sucursal-origen"
				class="andreani-card__label">Sucursal de origen (opcional)</label>
				<b-form-input
				id="andreani-sucursal-origen"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				spellcheck="false"
				placeholder="N° de la sucursal de Andreani donde dejás tus paquetes"
				data-testid="andreani-sucursal-origen"
				v-model.trim="sucursal_origen"></b-form-input>
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
			class="andreani-card__toggle"
			data-testid="andreani-toggle-paso-a-paso"
			@click="mostrar_paso_a_paso = !mostrar_paso_a_paso">
				<i :class="mostrar_paso_a_paso ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
				¿Dónde encuentro mi número de cliente y mi contrato? (paso a paso)
			</b-link>

			<b-collapse v-model="mostrar_paso_a_paso">
				<div class="andreani-card__ayuda">
					<p>
						<strong>¿Qué necesito?</strong> Tener un contrato comercial con Andreani. Con él, tu tienda
						online cotiza los envíos con tus propias tarifas y vos despachás cada pedido desde tu cuenta
						de Andreani.
					</p>
					<ol class="andreani-card__pasos">
						<li>
							Tené a mano tu contrato comercial con Andreani (o el último mail del ejecutivo de cuentas
							que te lo dio): ahí figuran tu <strong>número de cliente</strong> y el
							<strong>número de contrato</strong> de cada servicio.
						</li>
						<li>
							Si no los tenés, pedíselos a tu ejecutivo de cuentas o a la atención a clientes de
							Andreani. Decile que son para "cotizar tarifas por API".
						</li>
						<li>
							Hay un contrato para el envío <strong>a domicilio</strong> y otro para el
							<strong>retiro en sucursal</strong>. El de domicilio es obligatorio; el de sucursal sólo
							si querés ofrecer retiro en una sucursal de Andreani.
						</li>
						<li>
							Si querés, cargá también el número de la sucursal de Andreani donde dejás los paquetes
							(sucursal de origen). Si no la sabés, dejalo vacío.
						</li>
						<li>
							Pegá los datos en los casilleros de la izquierda y tocá "Conectar". Probamos una tarifa
							con tus datos: si Andreani los reconoce, la tarjeta queda conectada.
						</li>
						<li>
							Una vez conectado, probá con un código postal en "Probá cómo lo ve tu cliente": tienen que
							aparecer el envío a domicilio y su precio.
						</li>
					</ol>
					<p class="m-b-0">
						Por ahora los envíos con Andreani los cargás vos en el portal de Andreani: en cada pedido, el
						botón "Envío" te deja los datos listos para copiar. ¿Algo no funciona? Escribinos por WhatsApp
						y lo vemos juntos.
					</p>
				</div>
			</b-collapse>
		</b-col>
	</b-row>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Sub-componente "Conexión" de la tarjeta de Andreani (misión envios-andreani, 25/11/2026): el
 * formulario para conectar la cuenta cuando todavía no está conectada.
 *
 * Campos: número de cliente y contrato de domicilio (obligatorios), contrato de sucursal y
 * sucursal de origen (opcionales). `POST integraciones/andreani/conectar` los valida contra
 * Andreani con una tarifa de prueba antes de guardarlos: un 422 `credenciales` (Andreani no los
 * reconoce) o `validacion` (falta un dato) y un 502 `andreani` (Andreani no responde) se muestran
 * en el alert rojo con el mensaje del backend.
 *
 * Emite `actualizado` con el item `{integracion}` que devuelve el backend (lo reemplaza el padre
 * en su lista).
 */
export default {
	name: 'AndreaniConexion',
	mixins: [IntegrationConnector],
	components: {
		BtnLoader,
	},
	props: {
		// Item de la integración (desconectada)
		integracion: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Indicador de carga del botón Conectar
			loading: false,
			// Número de cliente que escribe el dueño
			cliente: '',
			// Contrato de envío a domicilio (obligatorio)
			contrato_domicilio: '',
			// Contrato de retiro en sucursal (opcional)
			contrato_sucursal: '',
			// Número de la sucursal de origen (opcional)
			sucursal_origen: '',
			// Mensaje del 422/502 del conectar, para el alert rojo
			error_conexion: null,
			// El paso a paso viene ABIERTO: es la primera vez que el dueño ve esto y sin él no sabe de
			// dónde sacar los datos.
			mostrar_paso_a_paso: true,
		}
	},
	computed: {
		// Hacen falta el número de cliente y el contrato de domicilio; Andreani valida el resto.
		puede_conectar() {
			return this.cliente.length > 0 && this.contrato_domicilio.length > 0
		},
	},
	methods: {
		/**
		 * Arma el cuerpo del conectar: los dos datos obligatorios y, sólo si el dueño los escribió,
		 * el contrato de sucursal y la sucursal de origen (como número entero).
		 *
		 * @returns {Object} `{cliente, contrato_domicilio, contrato_sucursal?, sucursal_origen?}`
		 */
		armarPayload() {
			let payload = {
				cliente: this.cliente,
				contrato_domicilio: this.contrato_domicilio,
			}
			if (this.contrato_sucursal) {
				payload.contrato_sucursal = this.contrato_sucursal
			}
			if (this.sucursal_origen) {
				payload.sucursal_origen = Number(this.sucursal_origen)
			}
			return payload
		},
		/**
		 * Conecta la cuenta. Un 422/502 se muestra en el alert rojo con el mensaje del backend.
		 *
		 * @returns {void}
		 */
		conectar() {
			if (!this.puede_conectar) {
				this.error_conexion = 'Completá el número de cliente y el contrato de envío a domicilio.'
				return
			}
			if (this.sucursal_origen && !(Number(this.sucursal_origen) > 0)) {
				this.error_conexion = 'La sucursal de origen tiene que ser un número.'
				return
			}

			let self = this
			self.loading = true
			self.error_conexion = null
			this.$store.commit('auth/setMessage', 'Conectando con Andreani')
			this.$store.commit('auth/setLoading', true)

			this.requestAndreaniConectar(this.armarPayload())
			.then(res => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.success('Andreani conectado')
				if (res && res.data && res.data.integracion) {
					self.$emit('actualizado', res.data.integracion)
				} else {
					self.$emit('actualizar')
				}
			})
			.catch(err => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.error_conexion = self.mensajeDeErrorDeIntegracion(err, 'No se pudo conectar con Andreani. Probá de nuevo en un rato.')
			})
		},
	},
}
</script>
