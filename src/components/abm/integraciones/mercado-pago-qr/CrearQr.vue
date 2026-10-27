<template>
<!--
	Formulario "Crear QR" (misión cobro-qr-mercado-pago). Mercado Pago pide la dirección del local
	para dar de alta el QR: se precarga desde la sucursal elegida y se puede corregir.
-->
<b-modal
id="mercado-pago-qr-crear"
title="Crear QR de Mercado Pago"
hide-footer
:no-close-on-backdrop="creando"
:no-close-on-esc="creando">
	<div class="mercado-pago-qr-crear">
		<b-alert
		:show="!!error"
		variant="danger"
		class="mercado-pago-qr-crear__alerta">
			{{ error }}
		</b-alert>

		<div class="mercado-pago-qr-crear__campo">
			<label
			for="mercado-pago-qr-crear-nombre"
			class="mercado-pago-qr-crear__label">Nombre del QR</label>
			<b-form-input
			id="mercado-pago-qr-crear-nombre"
			data-testid="mercado-pago-qr-crear-nombre"
			maxlength="60"
			placeholder="Por ejemplo: Mostrador"
			v-model.trim="form.name"></b-form-input>
		</div>

		<b-row>
			<b-col
			cols="12"
			sm="6"
			class="mercado-pago-qr-crear__campo">
				<label
				for="mercado-pago-qr-crear-caja"
				class="mercado-pago-qr-crear__label">Caja</label>
				<b-form-select
				id="mercado-pago-qr-crear-caja"
				data-testid="mercado-pago-qr-crear-caja"
				:options="opciones_de_caja"
				v-model="form.caja_id"
				@change="al_elegir_caja"></b-form-select>
			</b-col>
			<b-col
			cols="12"
			sm="6"
			class="mercado-pago-qr-crear__campo">
				<label
				for="mercado-pago-qr-crear-sucursal"
				class="mercado-pago-qr-crear__label">Sucursal</label>
				<b-form-select
				id="mercado-pago-qr-crear-sucursal"
				data-testid="mercado-pago-qr-crear-sucursal"
				:options="opciones_de_sucursal"
				v-model="form.address_id"
				@change="al_elegir_sucursal"></b-form-select>
			</b-col>
		</b-row>

		<p class="mercado-pago-qr-crear__ayuda">
			Un QR con caja cobra las ventas de esa caja. Uno general (sin caja) cobra todo lo demás.
		</p>

		<p class="mercado-pago-qr-crear__subtitulo">Dirección del local (la pide Mercado Pago)</p>

		<b-row>
			<b-col
			cols="8"
			class="mercado-pago-qr-crear__campo">
				<label
				for="mercado-pago-qr-crear-calle"
				class="mercado-pago-qr-crear__label">Calle</label>
				<b-form-input
				id="mercado-pago-qr-crear-calle"
				data-testid="mercado-pago-qr-crear-calle"
				v-model.trim="form.street_name"></b-form-input>
			</b-col>
			<b-col
			cols="4"
			class="mercado-pago-qr-crear__campo">
				<label
				for="mercado-pago-qr-crear-numero"
				class="mercado-pago-qr-crear__label">Número</label>
				<b-form-input
				id="mercado-pago-qr-crear-numero"
				data-testid="mercado-pago-qr-crear-numero"
				inputmode="numeric"
				v-model.trim="form.street_number"></b-form-input>
			</b-col>
			<b-col
			cols="12"
			sm="6"
			class="mercado-pago-qr-crear__campo">
				<label
				for="mercado-pago-qr-crear-ciudad"
				class="mercado-pago-qr-crear__label">Ciudad</label>
				<b-form-input
				id="mercado-pago-qr-crear-ciudad"
				data-testid="mercado-pago-qr-crear-ciudad"
				v-model.trim="form.city_name"></b-form-input>
			</b-col>
			<b-col
			cols="12"
			sm="6"
			class="mercado-pago-qr-crear__campo">
				<label
				for="mercado-pago-qr-crear-provincia"
				class="mercado-pago-qr-crear__label">Provincia</label>
				<b-form-input
				id="mercado-pago-qr-crear-provincia"
				data-testid="mercado-pago-qr-crear-provincia"
				v-model.trim="form.state_name"></b-form-input>
			</b-col>
		</b-row>

		<b-link
		class="mercado-pago-qr-crear__toggle"
		@click="mostrar_ubicacion = !mostrar_ubicacion">
			<i :class="mostrar_ubicacion ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"></i>
			Ubicación exacta en el mapa (opcional)
		</b-link>
		<b-collapse v-model="mostrar_ubicacion">
			<b-row class="m-t-10">
				<b-col
				cols="6"
				class="mercado-pago-qr-crear__campo">
					<label
					for="mercado-pago-qr-crear-latitud"
					class="mercado-pago-qr-crear__label">Latitud</label>
					<b-form-input
					id="mercado-pago-qr-crear-latitud"
					inputmode="decimal"
					placeholder="-34.6037"
					v-model.trim="form.latitude"></b-form-input>
				</b-col>
				<b-col
				cols="6"
				class="mercado-pago-qr-crear__campo">
					<label
					for="mercado-pago-qr-crear-longitud"
					class="mercado-pago-qr-crear__label">Longitud</label>
					<b-form-input
					id="mercado-pago-qr-crear-longitud"
					inputmode="decimal"
					placeholder="-58.3816"
					v-model.trim="form.longitude"></b-form-input>
				</b-col>
			</b-row>
		</b-collapse>

		<div class="mercado-pago-qr-crear__acciones">
			<b-button
			variant="outline-secondary"
			:disabled="creando"
			@click="$bvModal.hide('mercado-pago-qr-crear')">
				Cancelar
			</b-button>
			<b-button
			variant="primary"
			:disabled="creando"
			data-testid="mercado-pago-qr-crear-confirmar"
			@click="crear">
				<b-spinner
				v-if="creando"
				small></b-spinner>
				Crear QR
			</b-button>
		</div>
	</div>
</b-modal>
</template>
<script>
import mercado_pago_qr from '@/mixins/mercado_pago_qr'

/**
 * Devuelve el formulario vacío.
 *
 * @returns {Object}
 */
function formulario_vacio() {
	return {
		name: 'Mostrador',
		caja_id: null,
		address_id: null,
		street_name: '',
		street_number: '',
		city_name: '',
		state_name: '',
		latitude: '',
		longitude: '',
	}
}

/**
 * Formulario para crear un QR (`POST /api/mercado-pago/qr/cajas`).
 *
 * El padre lo abre con `abrir()`; al crearse emite `creado` con el QR (forma `QrCaja`). Si Mercado
 * Pago lo rechaza, la API responde 422 con el texto de Mercado Pago y se muestra arriba del
 * formulario.
 */
export default {
	name: 'MercadoPagoQrCrearQr',
	mixins: [mercado_pago_qr],
	props: {
		// QRs que ya existen: una caja que ya tiene QR (de la cuenta conectada) no se puede repetir
		qrs: {
			type: Array,
			default: () => [],
		},
	},
	data() {
		return {
			form: formulario_vacio(),
			creando: false,
			// Mensaje de error de la API (o de la validación de acá)
			error: '',
			mostrar_ubicacion: false,
		}
	},
	computed: {
		/**
		 * Cajas del comercio.
		 *
		 * @returns {Array}
		 */
		cajas() {
			return this.$store.state.caja.models || []
		},
		/**
		 * Sucursales del comercio (sin los domicilios de compradores de la tienda vieja).
		 *
		 * @returns {Array}
		 */
		sucursales() {
			let modelos = this.$store.state.address.models || []
			return modelos.filter(sucursal => {
				return sucursal && !sucursal.buyer_id
			})
		},
		/**
		 * true si ya hay un QR activo general (sin caja ni sucursal).
		 *
		 * @returns {Boolean}
		 */
		ya_hay_general() {
			return this.qrs.some(qr => {
				return qr && qr.activo && !qr.caja_id && !qr.address_id
			})
		},
		/**
		 * Opciones del select de caja. Las que ya tienen un QR quedan deshabilitadas.
		 *
		 * @returns {Array}
		 */
		opciones_de_caja() {
			let opciones = [{ value: null, text: 'General — sin caja' }]
			this.cajas.forEach(caja => {
				let ya_tiene_qr = this.qrs.some(qr => {
					return qr && qr.activo && qr.caja_id == caja.id
				})
				opciones.push({
					value: caja.id,
					text: caja.name + (ya_tiene_qr ? ' (ya tiene QR)' : ''),
					disabled: ya_tiene_qr,
				})
			})
			return opciones
		},
		/**
		 * Opciones del select de sucursal.
		 *
		 * @returns {Array}
		 */
		opciones_de_sucursal() {
			let opciones = [{ value: null, text: 'Sin sucursal' }]
			this.sucursales.forEach(sucursal => {
				opciones.push({ value: sucursal.id, text: sucursal.street || ('Sucursal ' + sucursal.id) })
			})
			return opciones
		},
	},
	methods: {
		/**
		 * Abre el formulario vacío, con la sucursal principal precargada si el comercio tiene una sola.
		 *
		 * @returns {void}
		 */
		abrir() {
			this.form = formulario_vacio()
			this.error = ''
			this.creando = false
			this.mostrar_ubicacion = false

			if (this.sucursales.length == 1) {
				this.form.address_id = this.sucursales[0].id
				this.al_elegir_sucursal(this.form.address_id)
			}

			this.$bvModal.show('mercado-pago-qr-crear')
		},

		/**
		 * Al elegir una caja que pertenece a una sucursal, se elige esa sucursal (y su dirección) si
		 * todavía no había ninguna elegida.
		 *
		 * @param {Number|null} caja_id
		 * @returns {void}
		 */
		al_elegir_caja(caja_id) {
			let caja = this.cajas.find(item => {
				return item.id == caja_id
			})
			if (caja && caja.address_id && !this.form.address_id) {
				this.form.address_id = caja.address_id
				this.al_elegir_sucursal(caja.address_id)
			}
			if (caja && this.form.name == 'Mostrador') {
				this.form.name = caja.name
			}
		},

		/**
		 * Precarga la dirección desde la sucursal elegida.
		 *
		 * En las sucursales, `street` es el NOMBRE de la sucursal y `street_number` el domicilio
		 * completo ("San Martín 1234"): Mercado Pago pide calle y número por separado, así que el
		 * domicilio se parte en el último número que tenga. Si no se puede partir, va entero a la
		 * calle y el número queda para completar.
		 *
		 * @param {Number|null} address_id
		 * @returns {void}
		 */
		al_elegir_sucursal(address_id) {
			let sucursal = this.sucursales.find(item => {
				return item.id == address_id
			})
			if (!sucursal) {
				return
			}

			let domicilio = String(sucursal.street_number || '').trim()
			let partes = domicilio.match(/^(.*?)[\s,]+(?:n[°º.]?\s*)?(\d+[a-zA-Z]?)\s*$/i)

			if (partes) {
				this.form.street_name = partes[1].trim()
				this.form.street_number = partes[2]
			} else {
				this.form.street_name = domicilio
				this.form.street_number = ''
			}

			this.form.city_name = sucursal.city || ''
			this.form.state_name = sucursal.province || ''
			this.form.latitude = sucursal.lat ? String(sucursal.lat) : ''
			this.form.longitude = sucursal.lng ? String(sucursal.lng) : ''
		},

		/**
		 * Valida lo mínimo que pide Mercado Pago antes de mandar.
		 *
		 * @returns {String|null} El problema, o null si está todo.
		 */
		problema_del_formulario() {
			if (!this.form.name) {
				return 'Ponele un nombre al QR.'
			}
			if (!this.form.caja_id && !this.form.address_id && this.ya_hay_general) {
				return 'Ya tenés un QR general. Elegí una caja o una sucursal para este.'
			}
			if (!this.form.street_name || !this.form.street_number) {
				return 'Completá la calle y el número del local.'
			}
			if (!this.form.city_name || !this.form.state_name) {
				return 'Completá la ciudad y la provincia del local.'
			}
			return null
		},

		/**
		 * Crea el QR.
		 *
		 * @returns {void}
		 */
		crear() {
			if (this.creando) {
				return
			}

			let problema = this.problema_del_formulario()
			if (problema) {
				this.error = problema
				return
			}

			let self = this
			self.creando = true
			self.error = ''

			/* Solo números con punto: la coma decimal se acepta y se convierte */
			let latitud = this.form.latitude ? Number(String(this.form.latitude).replace(',', '.')) : null
			let longitud = this.form.longitude ? Number(String(this.form.longitude).replace(',', '.')) : null

			this.qr_crear_qr({
				name: this.form.name,
				caja_id: this.form.caja_id || null,
				address_id: this.form.address_id || null,
				street_name: this.form.street_name,
				street_number: this.form.street_number,
				city_name: this.form.city_name,
				state_name: this.form.state_name,
				latitude: isNaN(latitud) ? null : latitud,
				longitude: isNaN(longitud) ? null : longitud,
			})
			.then(res => {
				self.creando = false
				let qr = res && res.data ? res.data.qr : null
				self.$toast.success('QR creado. Descargalo e imprimilo para el mostrador.')
				self.$emit('creado', qr)
				self.$bvModal.hide('mercado-pago-qr-crear')
			})
			.catch(err => {
				self.creando = false
				console.log(err)
				self.error = self.qr_mensaje_de_error(err, 'No se pudo crear el QR. Probá de nuevo en un rato.')
			})
		},
	},
}
</script>
<style lang="sass">
#mercado-pago-qr-crear
	.mercado-pago-qr-crear__campo
		margin-bottom: 12px

	.mercado-pago-qr-crear__label
		display: block
		margin-bottom: 4px
		font-size: 13px
		font-weight: 600
		color: var(--color-text-primary)

	.mercado-pago-qr-crear__ayuda
		margin: -4px 0 14px
		font-size: 12px
		color: var(--color-text-secondary)

	.mercado-pago-qr-crear__subtitulo
		margin: 0 0 8px
		font-size: 13px
		font-weight: 600
		color: var(--color-text-secondary)

	.mercado-pago-qr-crear__toggle
		display: inline-flex
		align-items: center
		gap: 4px
		font-size: 13px

	.mercado-pago-qr-crear__alerta
		font-size: 14px

	.mercado-pago-qr-crear__acciones
		display: flex
		justify-content: flex-end
		flex-wrap: wrap
		gap: 10px
		margin-top: 18px

		.btn
			display: inline-flex
			align-items: center
			justify-content: center
			gap: 6px

// En el teléfono los dos botones van a todo el ancho
@media (max-width: 575px)
	#mercado-pago-qr-crear
		.mercado-pago-qr-crear__acciones
			flex-direction: column-reverse

			.btn
				width: 100%
</style>
