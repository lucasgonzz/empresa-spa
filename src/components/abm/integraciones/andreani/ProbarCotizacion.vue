<template>
	<div class="andreani-card__prueba">
		<label
		for="andreani-prueba-zipcode"
		class="andreani-card__label m-b-5">Probá cómo lo ve tu cliente</label>
		<div class="andreani-card__prueba-fila">
			<b-form-input
			id="andreani-prueba-zipcode"
			data-testid="andreani-prueba-zipcode"
			type="text"
			inputmode="numeric"
			maxlength="8"
			placeholder="Código postal"
			v-model.trim="zipcode"
			@keyup.enter="cotizar"></b-form-input>
			<btn-loader
			:block="false"
			:loader="cotizando"
			:disabled="!zipcode"
			text="Cotizar"
			variant="outline-primary"
			@clicked="cotizar"></btn-loader>
		</div>

		<p
		v-if="error"
		class="andreani-card__prueba-error text-danger m-t-10 m-b-0">
			{{ error }}
		</p>

		<!-- Sin opciones: el motivo que mandó el backend, en castellano -->
		<div
		v-if="cotizado && !opciones.length && !error"
		class="andreani-card__prueba-vacio m-t-10"
		data-testid="andreani-prueba-vacio">
			{{ texto_sin_opciones }}
		</div>

		<ul
		v-if="opciones.length"
		class="andreani-card__opciones m-t-10">
			<li
			v-for="opcion in opciones"
			:key="opcion.key"
			class="andreani-card__opcion">
				<div class="andreani-card__opcion-texto">
					<strong>{{ opcion.carrier_name || 'Andreani' }}</strong>
					<span class="andreani-card__opcion-servicio"> · {{ opcion.service_name }}</span>
					<div
					v-if="textoDetalle(opcion)"
					class="andreani-card__opcion-detalle">{{ textoDetalle(opcion) }}</div>
				</div>
				<div class="andreani-card__opcion-precio">
					{{ textoPrecio(opcion) }}
				</div>
			</li>
		</ul>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Sub-componente "Probá cómo lo ve tu cliente" de la tarjeta de Andreani (misión envios-andreani,
 * 25/11/2026): cotiza un envío de prueba a un código postal con el paquete por defecto y muestra lo
 * mismo que va a ver el comprador en la tienda.
 *
 * `POST integraciones/andreani/cotizar-prueba` responde `{cotizacion: {zipcode, opciones, motivo}}`.
 * Cuando no hay opciones, `motivo` explica por qué (PLAN §2.3): `excede_medidas` (el paquete supera
 * lo que Andreani cotiza), `demasiados_bultos`, `sin_tarifa`, `no_conectado` o `error`. Un 422
 * (`sin_andreani`, `validacion`) o un 502 (`andreani`) llega con su `message`.
 *
 * No emite nada: es sólo una prueba, no cambia el estado de la integración.
 */
export default {
	name: 'AndreaniProbarCotizacion',
	mixins: [IntegrationConnector],
	components: {
		BtnLoader,
	},
	props: {
		// Item de la integración (conectada)
		integracion: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Indicador de carga del botón Cotizar
			cotizando: false,
			// Código postal que escribe el dueño
			zipcode: '',
			// Opciones que devolvió la cotización de prueba
			opciones: [],
			// Motivo por el que no hubo opciones (null si hubo)
			motivo: null,
			// Mensaje de error de la última prueba
			error: null,
			// true una vez que volvió una cotización (aunque venga vacía)
			cotizado: false,
		}
	},
	computed: {
		// El código postal argentino tiene entre 4 y 8 caracteres (mismo rango que valida la API)
		zipcode_valido() {
			let largo = this.zipcode ? this.zipcode.length : 0
			return largo >= 4 && largo <= 8
		},
		/**
		 * Texto para una cotización vacía, según el `motivo` del backend. El de medidas es el
		 * mismo aviso que ve el dueño en la tienda: Andreani no cotiza lo que supera 50 kg o 165 cm
		 * por lado.
		 */
		texto_sin_opciones() {
			if (this.motivo == 'excede_medidas') {
				return 'Andreani no cotiza ese paquete: supera 50 kg o 165 cm por lado.'
			}
			if (this.motivo == 'demasiados_bultos') {
				return 'Andreani no cotiza ese paquete: son demasiados bultos para un solo envío.'
			}
			if (this.motivo == 'sin_tarifa') {
				return 'Andreani no tiene tarifa para ese código postal con tu contrato.'
			}
			return 'Andreani no devolvió ninguna opción para ese código postal con el paquete por defecto.'
		},
	},
	methods: {
		/**
		 * Cotiza un envío de prueba al código postal escrito, con el paquete por defecto.
		 *
		 * @returns {void}
		 */
		cotizar() {
			if (!this.zipcode_valido) {
				this.error = 'Escribí un código postal de 4 a 8 caracteres.'
				return
			}

			let self = this
			self.cotizando = true
			self.error = null
			self.opciones = []
			self.motivo = null
			self.cotizado = false
			this.$store.commit('auth/setMessage', 'Cotizando con Andreani')
			this.$store.commit('auth/setLoading', true)

			this.requestAndreaniCotizarPrueba(this.zipcode)
			.then(res => {
				self.cotizando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.cotizado = true
				let cotizacion = res.data && res.data.cotizacion ? res.data.cotizacion : null
				self.opciones = cotizacion && cotizacion.opciones ? cotizacion.opciones : []
				self.motivo = cotizacion && cotizacion.motivo ? cotizacion.motivo : null
			})
			.catch(err => {
				self.cotizando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.error = self.mensajeDeErrorDeIntegracion(err, 'No pudimos cotizar en este momento. Probá de nuevo en un rato.')
			})
		},
		/**
		 * Línea de detalle de una opción: cuántas sucursales hay para retirar (si es retiro) y el
		 * plazo si Andreani lo informó. Sin plazo no se escribe nada: nunca "null" ni "0 días".
		 *
		 * @param {Object} opcion Opción normalizada (PLAN §2.2).
		 * @returns {String}
		 */
		textoDetalle(opcion) {
			let partes = []
			let puntos = opcion.puntos_de_retiro ? opcion.puntos_de_retiro.length : 0
			if (opcion.es_punto_de_retiro && puntos) {
				partes.push(puntos == 1 ? '1 sucursal para retirar' : puntos + ' sucursales para retirar')
			}
			let min = opcion.dias_min
			let max = opcion.dias_max
			if (min !== null && typeof min != 'undefined' && Number(min) > 0) {
				if (max !== null && typeof max != 'undefined' && Number(max) > Number(min)) {
					partes.push('Llega en ' + min + ' a ' + max + ' días hábiles')
				} else {
					partes.push('Llega en ' + min + ' días hábiles')
				}
			}
			return partes.join(' · ')
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
