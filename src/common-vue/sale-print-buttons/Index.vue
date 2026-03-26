<template>
	<div>
		<b-dropdown
		variant="danger"
		right
		menu-class="sale-print-dropdown-menu"
		v-if="sale">
			<template #button-content>
				<i class="icon-print"></i>
				Imprimir
			</template>

			<section-tickets
			:afip_tickets_with_cae="afip_tickets_with_cae"
			@ticket_pdf="ticketPdf(sale)"
			@factura_ticket_pdf="facturaTicketPdf"
			@ticket_2="nuevo_ticket(sale)"
			@set_ancho_impresora="set_ancho_impresora"></section-tickets>

			<section-remitos-a4
			:remitos_a4_profiles="remitos_a4_profiles"
			@print_with_profile="print_with_profile"
			@open_profile_modal="open_pdf_columns_modal"></section-remitos-a4>

			<section-facturas-a4
			:afip_a4_print_options="afip_a4_print_options"
			@factura_pdf_with_profile="facturaPdfWithProfile"
			@open_profile_modal="open_pdf_columns_modal"></section-facturas-a4>
		</b-dropdown>

		<modal-pdf-columns-profile
		:sale="sale"
		:modal_id="pdf_columns_modal_id"
		:pdf_config_rows="pdf_config_rows"
		:paper_width_mm.sync="paper_width_mm"
		:printable_width_mm.sync="printable_width_mm"
		:margin_mm.sync="margin_mm"
		:profile_name.sync="profile_name"
		:sheet_type_id.sync="sheet_type_id"
		:is_afip_ticket.sync="is_afip_ticket"
		:show_totals_on_each_page.sync="show_totals_on_each_page"
		:sheet_type_options="sheet_type_options"
		:remaining_width_mm="remaining_width_mm"
		@save_profile="save_pdf_profile"></modal-pdf-columns-profile>
	</div>
</template>

<script>
import print_ticket from '@/mixins/sale/print_ticket/index'
import ModalPdfColumnsProfile from './ModalPdfColumnsProfile.vue'
import SectionTickets from './SectionTickets.vue'
import SectionRemitosA4 from './SectionRemitosA4.vue'
import SectionFacturasA4 from './SectionFacturasA4.vue'

export default {
	components: {
		ModalPdfColumnsProfile,
		SectionTickets,
		SectionRemitosA4,
		SectionFacturasA4,
	},
	mixins: [print_ticket],
	props: {
		sale: Object,
		/**
		 * Model name para cargar opciones/perfiles reutilizables.
		 */
		model_name: {
			type: String,
			default: 'sale',
		},
	},
	data() {
		return {
			/**
			 * Catálogo de opciones de columnas para el model_name activo.
			 */
			pdf_column_options_catalog: [],
			/**
			 * Perfil seleccionado para impresión directa.
			 */
			selected_profile_id: null,
			/**
			 * Perfil seleccionado para edición en modal.
			 */
			selected_profile_id_for_edit: null,
			/**
			 * Filas configurables del modal (visible, order, width, wrap_content).
			 */
			pdf_config_rows: [],
			/**
			 * Ancho de hoja en milímetros para validación visual del modal.
			 */
			paper_width_mm: 297,
			/**
			 * Ancho imprimible en milímetros para validación visual del modal.
			 */
			printable_width_mm: 277,
			/**
			 * Margen horizontal por lado (left/right) en mm.
			 */
			margin_mm: 5,
			/**
			 * Nombre editable del perfil seleccionado.
			 */
			profile_name: '',
			/**
			 * Tipo de hoja editable del perfil seleccionado.
			 */
			sheet_type_id: null,
			/**
			 * Flag editable para perfil AFIP.
			 */
			is_afip_ticket: false,
			/**
			 * Flag editable para mostrar totales en cada hoja.
			 */
			show_totals_on_each_page: false,
		}
	},
	async created() {
		await this.load_pdf_column_options_catalog()
	},
	computed: {
		/**
		 * Id estable del modal, protegido contra sale null.
		 */
		pdf_columns_modal_id() {
			return this.sale ? ('pdf-columns-config-sale-' + this.sale.id) : 'pdf-columns-config-sale-null'
		},
		/**
		 * Perfiles del modelo actual.
		 */
		model_profiles() {
			const models = this.$store.state.pdf_column_profile.models || []
			return models.filter(profile => profile.model_name == this.model_name)
		},
		/**
		 * Solo perfiles A4 no fiscales para remitos.
		 */
		remitos_a4_profiles() {
			return this.model_profiles.filter(profile => this.is_profile_a4(profile) && !this.normalize_boolean(profile.is_afip_ticket))
		},
		/**
		 * Solo perfiles A4 fiscales para facturas AFIP.
		 */
		facturas_a4_profiles() {
			return this.model_profiles.filter(profile => this.is_profile_a4(profile) && this.normalize_boolean(profile.is_afip_ticket))
		},
		/**
		 * Tickets AFIP emitidos con CAE.
		 */
		afip_tickets_with_cae() {
			const afip_tickets = this.sale && this.sale.afip_tickets ? this.sale.afip_tickets : []
			return afip_tickets.filter(afip_ticket => !!afip_ticket.cae)
		},
		/**
		 * Opciones de impresión A4 fiscal (ticket x perfil AFIP).
		 */
		afip_a4_print_options() {
			/**
			 * Si no hay tickets o perfiles, no hay opciones.
			 */
			if (!this.afip_tickets_with_cae.length || !this.facturas_a4_profiles.length) {
				return []
			}
			const options = []
			this.afip_tickets_with_cae.forEach(afip_ticket => {
				this.facturas_a4_profiles.forEach(profile => {
					options.push({
						afip_ticket_id: afip_ticket.id,
						cbte_numero: afip_ticket.cbte_numero,
						profile,
					})
				})
			})
			return options
		},
		/**
		 * Opciones de perfiles A4 para selector del modal.
		 */
		a4_profile_options() {
			return this.model_profiles
				.filter(profile => this.is_profile_a4(profile))
				.map(profile => ({
					value: profile.id,
					text: profile.name,
				}))
		},
		/**
		 * Opciones de tipos de hoja para selector del modal.
		 */
		sheet_type_options() {
			/**
			 * Se prioriza catálogo global en store si está disponible.
			 */
			const store_sheet_types = this.$store.state.sheet_type && this.$store.state.sheet_type.models
				? this.$store.state.sheet_type.models
				: []
			let models = Array.isArray(store_sheet_types) ? store_sheet_types : []
			/**
			 * Fallback con tipos detectados en perfiles cargados.
			 */
			if (!models.length) {
				models = this.model_profiles
					.map(profile => profile.sheet_type)
					.filter(sheet_type => !!sheet_type && !!sheet_type.id)
			}
			const unique = []
			const used_ids = {}
			models.forEach(model => {
				if (!used_ids[model.id]) {
					used_ids[model.id] = true
					unique.push(model)
				}
			})
			return unique.map(model => ({
				value: model.id,
				text: model.name,
			}))
		},
		/**
		 * Perfil activo en edición dentro del modal.
		 */
		selected_profile_for_edit() {
			return this.model_profiles.find(profile => profile.id == this.selected_profile_id_for_edit)
		},
		/**
		 * Suma de anchos utilizados solo por columnas visibles.
		 */
		used_width_mm() {
			return this.pdf_config_rows
				.filter(row => this.normalize_boolean(row.visible))
				.reduce((sum, row) => sum + Number(row.width || 0), 0)
		},
		/**
		 * Ancho restante disponible para evitar desbordes.
		 */
		remaining_width_mm() {
			/**
			 * El ancho disponible descuenta ambos márgenes laterales.
			 */
			const printable_width_mm = Number(this.printable_width_mm || 0)
			const margin_mm = Number(this.margin_mm || 0)
			const available_width_mm = printable_width_mm - (margin_mm * 2)
			return available_width_mm - this.used_width_mm
		},
	},
	watch: {
		/**
		 * Al cambiar perfil en modal, recarga filas desde catálogo + pivot.
		 */
		selected_profile_id_for_edit() {
			this.load_rows_from_selected_profile()
		},
	},
	methods: {
		/**
		 * Normaliza booleanos provenientes de API/pivots.
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
		 * Determina si un perfil corresponde a hoja A4.
		 *
		 * @param {Object} profile
		 * @returns {boolean}
		 */
		is_profile_a4(profile) {
			const sheet_type_name = profile && profile.sheet_type ? profile.sheet_type.name : null
			return sheet_type_name == 'A4'
		},
		/**
		 * Descarga catálogo completo de opciones PDF para model_name.
		 */
		async load_pdf_column_options_catalog() {
			try {
				const res = await this.$api.get('pdf-column-options', {
					params: {
						model_name: this.model_name,
					},
				})
				this.pdf_column_options_catalog = (res.data && res.data.models) || []
			} catch (error) {
				this.pdf_column_options_catalog = []
			}
		},
		/**
		 * Imprime remito A4 con perfil elegido.
		 *
		 * @param {number} profile_id
		 */
		print_with_profile(profile_id) {
			this.salePdf(this.sale.id, 0, 0, 0, profile_id)
		},
		/**
		 * Abre modal de configuración con perfil destino.
		 *
		 * @param {number|null} profile_id
		 */
		async open_pdf_columns_modal(profile_id = null) {
			await this.load_pdf_column_options_catalog()
			/**
			 * El perfil a editar se define solo desde botón de configuración.
			 */
			if (profile_id == null) {
				this.$toast.error('Seleccione un perfil desde el boton de configuración')
				return
			}
			const chosen_id = this.model_profiles.some(p => p.id == profile_id) ? profile_id : null
			if (chosen_id == null) {
				this.$toast.error('No se encontro el perfil seleccionado')
				return
			}
			this.selected_profile_id_for_edit = chosen_id
			this.load_rows_from_selected_profile()
			this.$bvModal.show(this.pdf_columns_modal_id)
		},
		/**
		 * Mezcla catálogo completo + pivots del perfil para editar visible/width.
		 */
		load_rows_from_selected_profile() {
			/**
			 * Perfil editado actualmente.
			 */
			const profile = this.selected_profile_for_edit
			/**
			 * Índice por option id con configuración pivot existente.
			 */
			const profile_columns_by_key = {}
			if (profile && Array.isArray(profile.pdf_column_options)) {
				profile.pdf_column_options.forEach(option => {
					profile_columns_by_key[option.id] = {
						key: option.id,
						visible: this.normalize_boolean(option.pivot && option.pivot.visible),
						order: option.pivot ? Number(option.pivot.order || 0) : 0,
						width: option.pivot ? Number(option.pivot.width || option.default_width || 80) : Number(option.default_width || 80),
						wrap_content: this.normalize_boolean(option.pivot && option.pivot.wrap_content),
					}
				})
			}
			/**
			 * Defaults por cada option disponible en catálogo.
			 */
			const defaults_by_key = {}
			this.pdf_column_options_catalog.forEach((option, index) => {
				defaults_by_key[option.id] = {
					key: option.id,
					name: option.name || option.label,
					label: option.label,
					visible: true,
					order: index,
					width: Number(option.default_width || 80),
					wrap_content: false,
				}
			})
			/**
			 * Se generan filas sobre TODO el catálogo para que el usuario active visible.
			 */
			let rows = Object.values(defaults_by_key).map(default_row => {
				const current = profile_columns_by_key[default_row.key] || {}
				return {
					key: default_row.key,
					name: default_row.name,
					label: default_row.label,
					visible: typeof current.visible == 'undefined' ? default_row.visible : this.normalize_boolean(current.visible),
					order: typeof current.order == 'undefined' ? default_row.order : Number(current.order),
					width: Number(current.width || default_row.width),
					wrap_content: typeof current.wrap_content == 'undefined'
						? default_row.wrap_content
						: this.normalize_boolean(current.wrap_content),
				}
			})
			rows = rows.sort((a, b) => Number(a.order) - Number(b.order))
			this.pdf_config_rows = rows
			if (profile) {
				this.paper_width_mm = Number(profile.paper_width_mm || 297)
				this.printable_width_mm = Number(profile.printable_width_mm || 277)
				this.margin_mm = Number(profile.margin_mm || 5)
				this.profile_name = profile.name || ''
				this.sheet_type_id = profile.sheet_type_id || (profile.sheet_type ? profile.sheet_type.id : null)
				this.is_afip_ticket = this.normalize_boolean(profile.is_afip_ticket)
				this.show_totals_on_each_page = this.normalize_boolean(profile.show_totals_on_each_page)
			}
		},
		/**
		 * Crea perfil nuevo base en A4 no fiscal.
		 *
		 * @param {boolean} open_modal_after
		 */
		async create_new_profile(open_modal_after = true) {
			/**
			 * Nombre visible solicitado al usuario.
			 */
			const name = prompt('Nombre del perfil de impresion')
			if (!name) return
			/**
			 * Pivots por defecto sobre catálogo completo.
			 */
			const pdf_column_options = this.pdf_column_options_catalog.map((option, index) => ({
				id: option.id,
				pivot: {
					visible: true,
					order: index,
					width: Number(option.default_width || 80),
					wrap_content: false,
				},
			}))
			try {
				const res = await this.$api.post('pdf-column-profiles', {
					model_name: this.model_name,
					name,
					is_default: this.model_profiles.length == 0,
					paper_width_mm: 297,
					printable_width_mm: 277,
					margin_mm: 5,
					sheet_type_id: this.sheet_type_options.length ? this.sheet_type_options[0].value : null,
					is_afip_ticket: false,
					show_totals_on_each_page: false,
					pdf_column_options,
				})
				this.$store.state.pdf_column_profile.models.push(res.data.model)
				this.selected_profile_id = res.data.model.id
				this.selected_profile_id_for_edit = res.data.model.id
				if (open_modal_after) {
					this.load_rows_from_selected_profile()
				}
			} catch (error) {
				this.$toast.error('No se pudo crear el perfil')
			}
		},
		/**
		 * Guarda perfil actual con filas configuradas.
		 */
		async save_pdf_profile() {
			if (!this.selected_profile_for_edit) {
				this.$toast.error('Seleccione un perfil')
				return
			}
			if (this.remaining_width_mm < 0) {
				this.$toast.error('El ancho usado supera el ancho disponible')
				return
			}
			/**
			 * Payload normalizado solo con opciones válidas del catálogo.
			 */
			const pdf_column_options = this.pdf_config_rows
				.filter(row => row && row.key)
				.map((row, index) => {
					const option = this.pdf_column_options_catalog.find(item => item.id == row.key)
					return {
						id: option ? option.id : null,
						pivot: {
							visible: this.normalize_boolean(row.visible),
							order: index,
							width: Number(row.width || 0),
							wrap_content: this.normalize_boolean(row.wrap_content),
						},
					}
				})
				.filter(row => !!row.id)
			try {
				const res = await this.$api.put('pdf-column-profiles/' + this.selected_profile_for_edit.id, {
					name: this.profile_name,
					paper_width_mm: Number(this.paper_width_mm || 297),
					printable_width_mm: Number(this.printable_width_mm || 277),
					margin_mm: Number(this.margin_mm || 0),
					sheet_type_id: this.sheet_type_id,
					is_afip_ticket: this.normalize_boolean(this.is_afip_ticket),
					show_totals_on_each_page: this.normalize_boolean(this.show_totals_on_each_page),
					pdf_column_options,
				})
				const store_models = this.$store.state.pdf_column_profile.models
				const index = store_models.findIndex(profile => profile.id == res.data.model.id)
				if (index != -1) {
					store_models.splice(index, 1, res.data.model)
				}
				this.selected_profile_id = this.selected_profile_for_edit.id
				this.$toast.success('Perfil de PDF guardado')
				this.$bvModal.hide(this.pdf_columns_modal_id)
			} catch (error) {
				this.$toast.error('No se pudo guardar el perfil')
			}
		},
		/**
		 * Configura el ancho de impresora para ticket 2.0.
		 */
		set_ancho_impresora() {
			let ancho = this.$cookies.get('ancho_impresora')
			let _prompt = 'Ingrese el ancho en milimetros de su impresora'
			if (ancho != 'null') {
				_prompt += '. Valor actual: ' + ancho + 'mm'
			}
			let valor = prompt(_prompt)
			if (valor) {
				this.$cookies.set('ancho_impresora', valor, -1)
				alert('Ancho de ' + this.$cookies.get('ancho_impresora') + 'mm configurado correctamente')
			}
		},
		/**
		 * Construye URL de impresión remito/factura A4 para venta.
		 *
		 * @param {number} sale_id
		 * @param {number} with_prices
		 * @param {number} with_costs
		 * @param {number} precios_netos
		 * @param {number|null} profile_id
		 * @param {number|null} afip_ticket_id
		 */
		salePdf(sale_id, with_prices, with_costs, precios_netos, profile_id = null, afip_ticket_id = null) {
			let link = process.env.VUE_APP_API_URL + '/sale/pdf/' + sale_id + '/' + with_prices + '/' + with_costs + '/' + precios_netos
			const _profile_id = profile_id || this.selected_profile_id
			const query_params = []
			if (_profile_id) {
				query_params.push('pdf_column_profile_id=' + _profile_id)
			}
			if (afip_ticket_id) {
				query_params.push('afip_ticket_id=' + afip_ticket_id)
			}
			if (query_params.length) {
				link += '?' + query_params.join('&')
			}
			window.open(link)
		},
		/**
		 * Imprime ticket 2.0.
		 */
		nuevo_ticket(sale) {
			this.printTicket(sale)
		},
		/**
		 * Imprime ticket venta no AFIP.
		 */
		ticketPdf(sale) {
			let link = process.env.VUE_APP_API_URL + '/sale/sale-ticket-pdf/' + sale.id
			window.open(link)
		},
		/**
		 * Imprime ticket AFIP (formato ticket).
		 */
		facturaTicketPdf(afip_ticket_id) {
			let link = process.env.VUE_APP_API_URL + '/sale/afip-ticket-pdf/' + afip_ticket_id
			window.open(link)
		},
		/**
		 * Imprime factura A4 usando perfil fiscal y afip_ticket_id.
		 */
		facturaPdfWithProfile(afip_ticket_id, profile_id) {
			this.salePdf(this.sale.id, 0, 0, 0, profile_id, afip_ticket_id)
		},
	},
}
</script>

<style lang="sass">
.b-dropdown-text
	font-weight: bold !important

.sale-print-dropdown-menu
	width: 200px
	.b-dropdown-text
		text-align: center

.sale-print-remito-profile-row
	display: flex
	flex-direction: row
	align-items: center
	justify-content: space-between
	width: 100%
	min-width: 0
	padding: 5px 0

.sale-print-remito-profile-label
	flex: 0 1 auto
	min-width: 0
	text-align: center
	white-space: normal
	word-break: break-word

.sale-print-remito-profile-config
	flex: 0 0 auto
	line-height: 1
	opacity: 0.85
	&:hover
		opacity: 1
</style>
