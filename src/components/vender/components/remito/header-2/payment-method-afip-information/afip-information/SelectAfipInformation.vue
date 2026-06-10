<template>

	<div class="select-afip-information w-100">



		<b-input-group

		prepend="Factura">



			<b-form-select

			:disabled="disabled"

			:class="select_state_class"

			v-model="afip_information_id"

			@change="change"

			id="afip_information_id"

			:options="options">

			</b-form-select>

		</b-input-group>

	</div>

</template>

<script>

import vender from '@/mixins/vender'

import set_afip_tipo_comprobante from '@/mixins/vender/set_afip_tipo_comprobante'

export default {

	mixins: [vender, set_afip_tipo_comprobante],

	methods: {

		/**

		 * Recalcula totales y tipo de comprobante al cambiar el punto de venta AFIP.

		 */

		change() {

			this.setTotal()



			this.set_afip_tipo_comprobante()

		},

	},

	computed: {

		afip_information_id: {

			get() {

				return this.$store.state.vender.afip_information_id

			},

			set(value) {

				this.$store.commit('vender/setAfipInformationId', value)

			},

		},

		/**

		 * Deshabilitado al editar venta previa o al guardar como presupuesto.

		 *

		 * @returns {boolean}

		 */

		disabled() {

			if (this.index_previus_sales > 0 || this.guardar_como_presupuesto) {

				return true

			}

			return false

		},

		/**

		 * Indica si hay un punto de venta AFIP seleccionado (id distinto de 0).

		 *

		 * @returns {boolean}

		 */

		facturando() {

			return this.afip_information_id != 0

		},

		/**

		 * Clase visual del select según valor seleccionado o estado disabled.

		 *

		 * @returns {string}

		 */

		select_state_class() {

			if (this.disabled) {

				return 'select-afip-information__select--disabled'

			}



			if (this.facturando) {

				return 'select-afip-information__select--selected'

			}



			return 'select-afip-information__select--empty'

		},

		options() {

			let options = [

				{

					value: 0,

					text: 'Seleccione Punto de Venta',

				},

			]

			let text

			this.afip_information_filtered.forEach(afip_information => {

				if (afip_information.description) {

					text = afip_information.description

				} else {

					text = afip_information.razon_social

				}

				options.push({

					value: afip_information.id,

					text,

				})

			})

			return options

		},

		afip_information_filtered() {

			if (this.address_id == 0) {

				return this.afip_informations

			}



			return this.afip_informations.filter(afip_information => {

				return !afip_information.address_id || afip_information.address_id == this.address_id

			})

		},

		afip_informations() {

			return this.$store.state.afip_information.models

		},

	},

}

</script>

<style scoped lang="sass">

@import '@/sass/_custom'



.select-afip-information
	select 
		height: 36px

	/* Sin selección: fondo oscuro para destacar que falta elegir punto de venta */

	::v-deep select.select-afip-information__select--empty:not(:disabled)

		background-color: #333 !important

		border-color: #333 !important

		color: #fff !important

		font-weight: 700



	/* Con selección: verde para indicar punto de venta activo */

	::v-deep select.select-afip-information__select--selected:not(:disabled)

		background-color: $green !important

		border-color: darken($green, 8%) !important

		color: #fff !important

		font-weight: 700



	/* Disabled: apariencia estándar de select deshabilitado (anula oscuro/verde) */

	::v-deep select.select-afip-information__select--disabled,

	::v-deep select.select-afip-information__select:disabled

		background-color: #e9ecef !important

		border-color: #ced4da !important

		color: #6c757d !important

		font-weight: 400

		opacity: 1

		cursor: not-allowed

		-webkit-text-fill-color: #6c757d



	/* Flecha del select disabled coherente con Bootstrap */

	::v-deep select.select-afip-information__select--disabled,

	::v-deep select.select-afip-information__select:disabled

		background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3e%3cpath fill='%236c757d' d='M2 0L0 2h4zm0 5L0 3h4z'/%3e%3c/svg%3e") !important

</style>


