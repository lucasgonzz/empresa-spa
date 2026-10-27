<template>
	<!--
		Con qué método de pago se registran las ventas cobradas por QR. Sin uno guardado, el botón
		"Cobrar con QR" no aparece en Vender.
	-->
	<div class="mercado-pago-qr-metodo">
		<label
		for="mercado-pago-qr-metodo-de-pago"
		class="mercado-pago-qr__label">Método de pago con el que se registran los cobros por QR</label>

		<div class="mercado-pago-qr-metodo__fila">
			<b-form-select
			id="mercado-pago-qr-metodo-de-pago"
			data-testid="mercado-pago-qr-metodo-de-pago"
			:options="opciones"
			v-model="seleccionado"></b-form-select>

			<b-button
			v-if="hay_cambios"
			variant="primary"
			:disabled="guardando || !seleccionado"
			data-testid="mercado-pago-qr-guardar-metodo"
			@click="guardar">
				<b-spinner
				v-if="guardando"
				small></b-spinner>
				Guardar
			</b-button>
		</div>

		<p
		v-if="!metodo_guardado_id"
		class="mercado-pago-qr__aviso m-t-5 m-b-0">
			Todavía no está guardado: elegí el método y tocá Guardar. Hasta entonces, el botón
			"Cobrar con QR" no aparece en Vender.
		</p>
	</div>
</template>
<script>
import mercado_pago_qr from '@/mixins/mercado_pago_qr'

/**
 * Selector del método de pago de los cobros por QR (`PUT /api/mercado-pago/qr/config`).
 *
 * Si todavía no hay uno guardado, viene elegido el que se llame "Mercado Pago" (sin importar
 * mayúsculas ni espacios) o, si no hay, el id 6 si existe; igual hay que tocar Guardar.
 */
export default {
	name: 'MercadoPagoQrMetodoDePago',
	mixins: [mercado_pago_qr],
	props: {
		// Id guardado hoy en la configuración (null si todavía no se eligió)
		metodo_guardado_id: {
			type: [Number, String],
			default: null,
		},
	},
	data() {
		return {
			// Método elegido en el select (puede no estar guardado todavía)
			seleccionado: null,
			guardando: false,
		}
	},
	computed: {
		/**
		 * Métodos de pago del comercio, sin las retenciones (no son una forma de cobrar).
		 *
		 * @returns {Array}
		 */
		metodos_de_pago() {
			let modelos = this.$store.state.current_acount_payment_method.models || []
			return modelos.filter(metodo => {
				return metodo && !(metodo.type && metodo.type.slug == 'retencion')
			})
		},
		/**
		 * Opciones del select.
		 *
		 * @returns {Array}
		 */
		opciones() {
			let opciones = [{ value: null, text: 'Elegí un método de pago' }]
			this.metodos_de_pago.forEach(metodo => {
				opciones.push({ value: metodo.id, text: metodo.name })
			})
			return opciones
		},
		/**
		 * Método que se sugiere cuando no hay uno guardado.
		 *
		 * @returns {Number|null}
		 */
		sugerido() {
			let por_nombre = this.metodos_de_pago.find(metodo => {
				let nombre = String(metodo.name || '').toLowerCase().replace(/\s+/g, '')
				return nombre == 'mercadopago'
			})
			if (por_nombre) {
				return por_nombre.id
			}
			let el_6 = this.metodos_de_pago.find(metodo => {
				return metodo.id == 6
			})
			return el_6 ? el_6.id : null
		},
		/**
		 * true si lo elegido no es lo guardado.
		 *
		 * @returns {Boolean}
		 */
		hay_cambios() {
			return Number(this.seleccionado || 0) != Number(this.metodo_guardado_id || 0)
		},
	},
	watch: {
		/**
		 * Lo guardado manda; sin nada guardado, se precarga la sugerencia.
		 */
		metodo_guardado_id: {
			immediate: true,
			handler(valor) {
				this.seleccionado = valor ? Number(valor) : this.sugerido
			},
		},
		/**
		 * El catálogo puede llegar después de montar: si no hay nada guardado ni elegido, se precarga
		 * la sugerencia apenas aparece.
		 */
		sugerido(valor) {
			if (!this.metodo_guardado_id && !this.seleccionado) {
				this.seleccionado = valor
			}
		},
	},
	methods: {
		/**
		 * Guarda el método elegido.
		 *
		 * @returns {void}
		 */
		guardar() {
			if (!this.seleccionado || this.guardando) {
				return
			}

			let self = this
			self.guardando = true
			this.$store.commit('auth/setMessage', 'Guardando el método de pago del QR')
			this.$store.commit('auth/setLoading', true)

			this.qr_guardar_metodo_de_pago(this.seleccionado)
			.then(res => {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				let guardado = res && res.data && res.data.current_acount_payment_method_id
					? Number(res.data.current_acount_payment_method_id)
					: Number(self.seleccionado)
				self.$toast.success('Método de pago del QR guardado')
				self.$emit('guardado', guardado)
			})
			.catch(err => {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.$toast.error(self.qr_mensaje_de_error(err, 'No se pudo guardar el método de pago'))
			})
		},
	},
}
</script>
<style lang="sass">
.mercado-pago-qr-card
	.mercado-pago-qr-metodo
		margin-top: 16px

	.mercado-pago-qr-metodo__fila
		display: flex
		gap: 8px
		align-items: stretch

		select
			flex: 1
			min-width: 0

		.btn
			flex-shrink: 0
			display: inline-flex
			align-items: center
			gap: 6px

	.mercado-pago-qr__label
		display: block
		margin-bottom: 5px
		font-size: 13px
		font-weight: 600
		color: var(--color-text-primary)

	.mercado-pago-qr__aviso
		font-size: 12px
		color: var(--color-text-secondary)
</style>
