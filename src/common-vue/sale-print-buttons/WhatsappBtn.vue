<template>

	<div

	v-if="force_show || (sale.client && sale.client.phone)">

		<b-button
		size="sm"
		class="m-l-10"
		variant="success"
		:disabled="disabled"
		@click="whatsapp">
			<i class="bi bi-whatsapp"></i>
		</b-button>

	</div>

</template>

<script>

export default {

	props: {

		sale: Object,

		from_budget: {

			type: Boolean,

			default: false

		},

		/**

		 * Modelo de perfiles PDF (mismo criterio que sale-print-buttons).

		 */

		model_name: {

			type: String,

			default: 'sale',

		},

		/**

		 * Override del telefono a usar. Si no se pasa (null), se usa sale.client.phone

		 * como siempre. Lo usa Vender para permitir un numero editado a mano.

		 *

		 * NO renombrar a `phone`: `common-vue/mixins/dates.js` es un mixin GLOBAL

		 * (main.js -> Vue.mixin(app) -> app.js -> mixins: [dates]) y declaraba un metodo

		 * `phone()`. En Vue 2, initState corre initProps() y despues initMethods(), y

		 * initMethods hace vm[key] = bind(methods[key], vm): el metodo pisa la prop y

		 * this.phone pasa a valer la funcion bindeada, que concatenada da

		 * "function () { [native code] }". Eso es lo que se colaba en el link de WhatsApp

		 * hasta el 7/8/2026. Vue solo avisa con un warning de desarrollo en consola.

		 */

		phone_override: {

			type: String,

			default: null,

		},

		/**

		 * Si es true, el componente se muestra SIEMPRE (ignora el chequeo historico de

		 * sale.client && sale.client.phone). Default false: mantiene el comportamiento

		 * historico en los demas usos (ClientBtn.vue, SaleInfo.vue, sale-print-buttons

		 * interno, etc.)

		 */

		force_show: {

			type: Boolean,

			default: false,

		},

		/**

		 * Deshabilita el boton de envio (lo usa Vender mientras el input de telefono

		 * esta vacio).

		 */

		disabled: {

			type: Boolean,

			default: false,

		},

	},

	computed: {

		/**

		 * Telefono efectivo para el link de WhatsApp: el prop `phone_override` tiene

		 * prioridad; si no vino, cae al telefono del cliente de la venta, igual que el

		 * comportamiento historico.

		 *

		 * Se devuelve solo con digitos porque api.whatsapp.com no acepta espacios,

		 * guiones, parentesis ni el simbolo +. Es el mismo criterio que ya aplica el

		 * backend en WhatsappPhoneHelper::normalize() (empresa-api), para que los dos

		 * caminos de envio interpreten igual un mismo `clients.phone`.

		 */

		effective_phone() {

			const raw = this.phone_override || (this.sale.client && this.sale.client.phone) || ''

			return String(raw).replace(/\D/g, '')

		},

	},

	methods: {

		/**

		 * Abre WhatsApp con el mensaje y el enlace al PDF del comprobante.

		 */

		whatsapp() {

			/* Sin digitos no hay chat posible: mejor avisar que abrir una pestaña que no lleva a ningun lado */

			if (!this.effective_phone) {

				this.$toast.error('El telefono no tiene un numero valido para WhatsApp')

				return

			}

			/* Saludo generico si no hay cliente asignado (Vender permite enviar sin cliente) */

			const saludo = this.client_name() ? ('Hola ' + this.client_name() + ', ') : 'Hola, '

			let mensaje = saludo + 'te acercamos el comprobante de tu compra N° ' + this.sale.num + ': '

			if (this.from_budget) {

				/* La ruta de empresa-api es budget/pdf/{id}/{with_prices}/{with_images}: los tres

				 * segmentos son obligatorios. Con dos, Laravel devuelve 404. El /1/0 es el mismo

				 * "Con precios" que arma el dropdown de impresion de ModalButtons.vue. */

				mensaje += this.owner.api_url + '/budget/pdf/' + this.sale.id + '/1/0'

			} else {

				mensaje += this.build_sale_pdf_url()

			}

			/* encodeURIComponent NO es defensivo: el mensaje termina con la URL del PDF, que trae

			 * ?pdf_column_profile_id=..&afip_ticket_id=.. Sin codificar, ese & lo lee api.whatsapp.com

			 * como separador de SUS parametros y el texto compartido se corta ahi, dejando al cliente

			 * un link sin afip_ticket_id (o sea, el PDF sin la factura ARCA). El telefono ya es solo

			 * digitos, asi que no necesita codificarse. */

			const link = 'https://api.whatsapp.com/send?phone=' + this.effective_phone +

				'&text=' + encodeURIComponent(mensaje)

			window.open(link)

			/* Avisa al padre el telefono usado -- VenderActionsBar lo escucha para ofrecer actualizar el telefono del cliente */

			this.$emit('sent', this.effective_phone)

		},

		/**

		 * Arma URL de PDF: perfil de factura si hay ticket AFIP; si no, perfil de venta/remito.

		 *

		 * @returns {string}

		 */

		build_sale_pdf_url() {

			let pdf_url = this.owner.api_url + '/sale/pdf/' + this.sale.id

			const query_params = []

			const has_afip_invoice = this.sale_has_afip_invoice()



			if (has_afip_invoice) {

				const afip_ticket_id = this.get_afip_ticket_id_for_pdf()

				const profile_id = this.get_whatsapp_afip_pdf_profile_id()

				if (profile_id) {

					query_params.push('pdf_column_profile_id=' + profile_id)

				}

				if (afip_ticket_id) {

					query_params.push('afip_ticket_id=' + afip_ticket_id)

				}

			} else {

				const profile_id = this.get_whatsapp_remito_pdf_profile_id()

				if (profile_id) {

					query_params.push('pdf_column_profile_id=' + profile_id)

				}

			}



			if (query_params.length) {

				pdf_url += '?' + query_params.join('&')

			}

			return pdf_url

		},

		/**

		 * Indica si la venta tiene factura ARCA con CAE (mismo criterio que impresión A4 fiscal).

		 *

		 * @returns {boolean}

		 */

		sale_has_afip_invoice() {

			return !!this.get_afip_ticket_id_for_pdf()

		},

		/**

		 * Id del perfil fiscal predeterminado para WhatsApp (nunca perfiles de remito/venta).

		 *

		 * @returns {number|null}

		 */

		get_whatsapp_afip_pdf_profile_id() {

			const afip_profiles = this.get_model_profiles().filter(profile => this.normalize_boolean(profile.is_afip_ticket))

			const whatsapp_afip_profile = afip_profiles.find(profile => this.normalize_boolean(profile.is_default_whatsapp_afip))

			if (whatsapp_afip_profile) {

				return whatsapp_afip_profile.id

			}

			const print_default_afip = afip_profiles.find(profile => this.normalize_boolean(profile.is_default))

			return print_default_afip ? print_default_afip.id : null

		},

		/**

		 * Id del perfil remito/venta predeterminado para WhatsApp (solo sin factura ARCA).

		 *

		 * @returns {number|null}

		 */

		get_whatsapp_remito_pdf_profile_id() {

			const remito_profiles = this.get_model_profiles().filter(profile => !this.normalize_boolean(profile.is_afip_ticket))

			const whatsapp_remito_profile = remito_profiles.find(profile => this.normalize_boolean(profile.is_default_whatsapp))

			if (whatsapp_remito_profile) {

				return whatsapp_remito_profile.id

			}

			const print_default_remito = remito_profiles.find(profile => this.normalize_boolean(profile.is_default))

			return print_default_remito ? print_default_remito.id : null

		},

		/**

		 * Perfiles PDF del model_name activo en store.

		 *

		 * @returns {Array}

		 */

		get_model_profiles() {

			const models = this.$store.state.pdf_column_profile.models || []

			return models.filter(profile => profile.model_name == this.model_name)

		},

		/**

		 * Primer ticket AFIP con CAE para PDF fiscal A4.

		 *

		 * @returns {number|null}

		 */

		get_afip_ticket_id_for_pdf() {

			const afip_tickets = this.sale && this.sale.afip_tickets ? this.sale.afip_tickets : []

			const with_cae = afip_tickets.filter(afip_ticket => !!afip_ticket.cae)

			if (!with_cae.length) {

				return null

			}

			return with_cae[0].id

		},

		/**

		 * Normaliza booleanos provenientes de API/store.

		 *

		 * @param {any} value

		 * @returns {boolean}

		 */

		normalize_boolean(value) {

			if (value === true || value === 1 || value === '1') {

				return true

			}

			if (value === false || value === 0 || value === '0' || value === '' || value == null) {

				return false

			}

			return Boolean(value)

		},

		/**

		 * Primer nombre del cliente en mayúsculas para el saludo.

		 *

		 * @returns {string}

		 */

		client_name() {

			/* Sin cliente asignado (o sin nombre), no hay saludo personalizado */

			if (this.sale.client && this.sale.client.name) {

				return this.sale.client.name.split(' ')[0].toUpperCase()

			}

			return ''

		}

	}

}

</script>

