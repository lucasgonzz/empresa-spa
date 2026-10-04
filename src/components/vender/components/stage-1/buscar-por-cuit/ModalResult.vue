<template>
	<b-modal
	:title="title"
	hide-footer
	id="afip-data-modal">

		<div class="vender-afip-modal__data">
			<div
			class="vender-afip-modal__field"
			v-for="(item, index) in props"
			:key="index">
				<span class="vender-afip-modal__field-label">
					{{ format_afip_label(item.key) }}
				</span>
				<span class="vender-afip-modal__field-value">
					{{ item.value }}
				</span>
			</div>
		</div>

		<hr class="vender-client-block__separator">

		<div
		v-if="client_model"
		class="vender-afip-modal__client-summary">
			<p>
				Nombre en el sistema: {{ client_model.name }}
			</p>
			<p>
				Saldo: {{ price(client_model.saldo_pesos) }}
			</p>
		</div>

		<div class="vender-afip-modal__actions">
			<b-button
			v-if="client_model"
			block
			@click="useClient"
			variant="primary">
				Usar cliente para la venta
			</b-button>

			<btn-loader
			v-else
			:loader="loading"
			id="crear_cliente"
			text="Crear cliente y usar para esta venta"
			@clicked="setCreateClient"></btn-loader>
		</div>

	</b-modal>
</template>
<script>
import vender from '@/mixins/vender'
/*
	price_types y ajustes_del_cliente se sacaron el 4/10/2026: los usaba solo useClient(), que ya no
	elige el cliente (ver su docblock). Elegir es de SelectClient.vue, que tiene los dos mixins.
*/
export default {
	mixins: [vender],
	props: {
		title: String,
		afip_data: Object,
		client_model: Object,
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		props() {
			if (this.afip_data) {
				return Object.entries(this.afip_data).map(([key, value]) => ({ key, value }));
			}
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		/**
		 * Formatea la clave de un dato AFIP para mostrarla como etiqueta legible.
		 *
		 * @param {string} key Clave del campo devuelto por AFIP.
		 * @returns {string}
		 */
		format_afip_label(key) {
			return key.replaceAll('_', ' ')
		},
		/**
		 * Abre el formulario de cliente nuevo precargado con lo que devolvio ARCA.
		 *
		 * El formulario lo monta el buscador de cliente de Vender (search/Index.vue, por
		 * `show_btn_create`) y ese buscador tiene `elegir_al_crear`: al guardar, el cliente queda
		 * elegido para la venta sin volver al buscador (ver SelectClient.vue).
		 *
		 * Con promesas encadenadas por .then() y `let self = this`, que es la regla de src/:
		 * localidad y provincia se resuelven juntas con Promise.all.
		 * getLocalidad()/getProvincia() devuelven a veces un id suelto y a veces una promesa, y por
		 * eso cada una va envuelta en Promise.resolve.
		 *
		 * @returns {void}
		 */
		setCreateClient() {
			let self = this
			this.loading = true

			Promise.all([
				Promise.resolve(this.getLocalidad()),
				Promise.resolve(this.getProvincia()),
			])
			.then(function(ids) {
				let location_id = ids[0]
				let provincia_id = ids[1]

				/*
					Nombre sin "undefined" y sin el espacio colgando: en una persona juridica el
					backend manda la razon social en `nombre` y `apellido` en '', y antes el nombre
					se guardaba con un espacio al final.
				*/
				let nombre = self.afip_data.nombre || ''
				let apellido = self.afip_data.apellido || ''

				let properties_to_override = [
					{
						key: 'name',
						value: (nombre + ' ' + apellido).trim(),
					},
					{
						key: 'address',
						value: self.afip_data.direccion,
					},
					{
						key: 'cuit',
						value: self.afip_data.cuit,
					},
					{
						key: 'location_id',
						value: location_id,
					},
					{
						key: 'provincia_id',
						value: provincia_id,
					},
					{
						key: 'iva_condition_id',
						value: self.afip_data.condicion_iva == 'RESPONSABLE INSCRIPTO' ? 1 : self.afip_data.condicion_iva == 'MONOTRIBUTO' ? 2 : 3,
					},
				]

				/*
					🔴 La clave es `razon_social`, en snake_case, porque es la que arma
					AfipConstanciaInscripcionController::get_constancia_inscripcion() de empresa-api
					(no el `razonSocial` crudo de ARCA). Viene solo en personas juridicas: en una
					persona fisica no hay razon social y el campo queda como venga del formulario.
				*/
				if (self.afip_data.razon_social) {
					properties_to_override.push({
						key: 'razon_social',
						value: self.afip_data.razon_social,
					})
				}

				if (self.afip_data.dni) {
					properties_to_override.push({
						key: 'dni',
						value: self.afip_data.dni,
					})
				}
				self.cerrar()

				self.setModel(null, 'client', properties_to_override, true, false)
				self.loading = false
			})
			.catch(function(err) {
				console.log(err)
				self.loading = false
				self.$toast.error('No se pudo abrir el formulario del cliente')
			})
		},
		getProvincia() {
			if (this.afip_data.provincia) {
				let provincia = this.$store.state.provincia.models.find(provincia => {
					return provincia.name == this.afip_data.provincia
				})

				if (typeof provincia != 'undefined') {
					return provincia.id
				} else {
					return new Promise((resolve, reject) => {
						this.$api.post('provincia', {
							'name': this.afip_data.provincia
						})
						.then(res => {
							this.$store.commit('provincia/add', res.data.model)
							resolve(res.data.model.id)
						})
						.catch(err => {
							console.log(err)
							// Sin este resolve la promesa no terminaba nunca y el boton "Crear
							// cliente" quedaba cargando para siempre. Se sigue sin provincia.
							resolve(null)
						})
					})
				}
			}
			return null
		},
		getLocalidad() {

			if (this.afip_data.localidad) {

				let localidad = this.$store.state.location.models.find(location => {
					return location.name == this.afip_data.localidad
				})

				if (typeof localidad != 'undefined') {

					return localidad.id

				} else {

					return new Promise((resolve, reject) => {

						this.$api.post('location', {
							'name': this.afip_data.localidad
						})
						.then(res => {
							this.$store.commit('location/add', res.data.model)
							resolve(res.data.model.id)
						})
						.catch(err => {
							console.log(err)
							// Mismo motivo que en getProvincia(): sin resolve el boton quedaba
							// cargando para siempre. Se sigue sin localidad.
							resolve(null)
						})

					})

				}
			}

			return null
		},
		/**
		 * "Usar cliente para la venta": el CUIT ya era de un cliente cargado.
		 *
		 * 🔴 Este modal NO elige el cliente por su cuenta: avisa con `usar-cliente` y lo elige
		 * SelectClient.vue, haciendolo pasar por su setSelected(), que es la unica puerta para
		 * elegir el cliente de la venta desde la interfaz de Vender. Antes de la mision
		 * cliente-desde-arca-en-vender (4/10/2026) esto hacia a mano `vender/setClient` +
		 * setPriceType() + los ajustes del cliente, y se quedaba corto: no bloqueaba la caja, no
		 * recalculaba el tipo de comprobante (con un Responsable Inscripto podia quedar el anterior)
		 * y en una venta o presupuesto en edicion le cambiaba la lista de precios en vez de avisar y
		 * conservarla. Volver a elegir desde aca es volver a abrir ese hueco.
		 *
		 * @returns {void}
		 */
		useClient() {
			this.$emit('usar-cliente', this.client_model)
			this.cerrar()
		},
		cerrar() {
			this.$bvModal.hide('afip-data-modal')
			let legacy_input = document.getElementById('cuit-para-buscar')
			if (legacy_input) {
				legacy_input.value = ''
			}
		}
	}
}
</script>
<style lang="sass">
@import '@/components/vender/sass/_vender-client-block'
</style>
