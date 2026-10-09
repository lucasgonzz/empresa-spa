<template>
	<b-modal
	v-if="sale"
	:id="modal_id"
	title="Configurar columnas de PDF (Remito)"
	size="xl"
	modal-class="props-to-show-modal"
	body-class="props-to-show-body"
	footer-class="props-to-show-footer">
		<b-form-row class="m-b-0">
			<b-col md="6">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Nombre del perfil</strong>
					</label>
					<b-form-input
					placeholder="Ingrese nombre"
					v-model.trim="local_profile_name"></b-form-input>
				</b-form-group>
			</b-col>
			<b-col md="6">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Tipo de hoja</strong>
					</label>
					<b-form-select
					:options="sheet_type_options"
					v-model="local_sheet_type_id"></b-form-select>
				</b-form-group>
			</b-col>
		</b-form-row>

		<!--
			Misión diseno-pdf-configurable (1/10/2026): si el perfil ya está armado con cajas, la hoja,
			el margen, los totales, las comisiones, los costos y el texto del pie se deciden en el
			diseñador de PDF del ABM, no acá (se esconden abajo). Con un perfil de siempre, todo igual.
		-->
		<p
		v-if="con_diseno_de_cajas && !es_de_venta"
		class="modal-pdf-columns-profile__con-cajas">
			<i
			class="bi bi-info-circle"
			aria-hidden="true"></i>
			<span>Las cajas, el pie y la hoja de este diseño se arman en ABM → Diseño de PDF → Diseñar PDF.</span>
		</p>

		<b-form-row
		v-if="!con_diseno_de_cajas"
		class="m-b-0">
			<b-col md="4">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Ancho (mm)</strong>
					</label>
					<b-form-input
					type="number"
					min="40"
					max="2000"
					v-model.number="local_width_mm"></b-form-input>
				</b-form-group>
			</b-col>
			<b-col md="4">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Alto (mm)</strong>
					</label>
					<b-form-input
					type="number"
					min="40"
					max="2000"
					v-model.number="local_height_mm"></b-form-input>
				</b-form-group>
			</b-col>
			<b-col md="4">
				<b-form-group>
					<label class="form-label">
						<i class="icon-right"></i>
						<strong>Margen por lado (mm)</strong>
					</label>
					<b-form-input
					type="number"
					min="0"
					max="500"
					v-model.number="local_margin_mm"></b-form-input>
				</b-form-group>
			</b-col>
		</b-form-row>

	<b-form-row class="m-b-10">
		<b-col md="4" class="d-flex align-items-center">
			<b-form-checkbox
			v-model="local_is_afip_ticket">
				Factura de ARCA
			</b-form-checkbox>
		</b-col>
		<b-col
		v-if="!con_diseno_de_cajas"
		md="4"
		class="d-flex align-items-center">
			<b-form-checkbox
			v-model="local_show_total_in_footer">
				Mostrar Total en el pie de pagina
			</b-form-checkbox>
		</b-col>
		<b-col md="4" class="d-flex align-items-center">
			<b-form-checkbox
			v-model="local_show_totals_on_each_page">
				Mostrar totales en cada pagina
			</b-form-checkbox>
		</b-col>
	</b-form-row>

	<b-form-row class="m-b-10">
		<b-col
		md="4"
		class="d-flex align-items-center"
		v-if="!local_is_afip_ticket">
			<b-form-checkbox
			v-model="local_is_default_whatsapp">
				Predeterminado WhatsApp (remito)
			</b-form-checkbox>
		</b-col>
		<b-col
		md="4"
		class="d-flex align-items-center"
		v-if="local_is_afip_ticket">
			<b-form-checkbox
			v-model="local_is_default_whatsapp_afip">
				Predeterminado WhatsApp (factura)
			</b-form-checkbox>
		</b-col>
		<b-col md="4" class="d-flex align-items-center">
			<b-form-checkbox
			v-model="local_is_default_tienda">
				Predeterminado Tienda (ecommerce)
			</b-form-checkbox>
		</b-col>
		<b-col md="4" class="d-flex align-items-center">
			<!-- Cuando está activo, el PDF imprime la fecha del día en lugar de la fecha del comprobante -->
			<b-form-checkbox
			v-model="local_use_current_date">
				Imprimir con fecha actual
			</b-form-checkbox>
		</b-col>
		<b-col
		v-if="!con_diseno_de_cajas"
		md="4"
		class="d-flex align-items-center">
			<b-form-checkbox
			v-model="local_show_comissions">
				Mostrar comisiones
			</b-form-checkbox>
		</b-col>
		<b-col
		v-if="!con_diseno_de_cajas"
		md="4"
		class="d-flex align-items-center">
			<b-form-checkbox
			v-model="local_show_total_costs">
				Mostrar total costos
			</b-form-checkbox>
		</b-col>
	</b-form-row>

	<b-form-row
	v-if="!con_diseno_de_cajas"
	class="m-b-0">
		<b-col md="12">
			<b-form-group>
				<label class="form-label">
					<i class="icon-right"></i>
					<strong>Pie de página</strong>
				</label>
				<!-- Texto libre que aparece debajo de los totales en el PDF; soporta múltiples líneas -->
				<b-form-textarea
				placeholder="Texto que aparecerá en el pie de cada página del PDF..."
				rows="3"
				v-model="local_footer_text"></b-form-textarea>
			</b-form-group>
		</b-col>
	</b-form-row>

		<!--
			Misión diseno-ticket-comandera (pedido 5 de Lucas: la tabla se maneja adentro del modal del
			diseño): en un perfil de VENTA la tabla de columnas en milímetros ya no se edita acá. Se
			abre el mismo diseñador que en ABM -> Diseño de PDF, sobre el perfil del store; ahí se arman
			las columnas (en la grilla de 24 medias columnas), la hoja y las cajas. El resto del modal
			queda como estaba.
		-->
		<div
		v-if="es_de_venta"
		class="modal-pdf-columns-profile__disenar"
		data-testid="modal-columnas-pdf-disenar">
			<p class="modal-pdf-columns-profile__con-cajas">
				<i
				class="bi bi-info-circle"
				aria-hidden="true"></i>
				<span>Las columnas de la tabla, la hoja y las cajas de este diseño se arman en el diseñador.</span>
			</p>
			<b-button
			variant="primary"
			size="sm"
			data-testid="modal-columnas-pdf-abrir-disenador"
			@click="abrir_disenador">
				Diseñar PDF
			</b-button>
		</div>

		<pdf-columns-preferences-config-modal
		v-else
		:config_rows="pdf_config_rows"
		:paper_width_mm.sync="local_paper_width_mm"
		:printable_width_mm.sync="local_printable_width_mm"
		:margin_mm="local_margin_mm"
		:show_size_controls="false"></pdf-columns-preferences-config-modal>

		<!--
			El diseñador (modal propio, se apila sobre este). Se monta recién la primera vez que se lo
			pide: es pesado y el menú Imprimir está en cada venta. Al guardar hace
			commit('pdf_column_profile/add', ...) y el menú y este modal leen el perfil nuevo del store
			(Index.vue refresca la hoja y las columnas: ver selected_profile_for_edit).
		-->
		<disenador-pdf
		v-if="disenador_montado && perfil_del_disenador"
		ref="disenador"
		:model="perfil_del_disenador"
		@hook:mounted="al_montarse_el_disenador"></disenador-pdf>

		<template #modal-footer>
			<b-button
			variant="secondary"
			@click="$bvModal.hide(modal_id)">
				Cancelar
			</b-button>
			<b-button
			variant="primary"
			:disabled="!es_de_venta && remaining_width_mm < 0"
			@click="$emit('save_profile')">
				Guardar perfil
			</b-button>
		</template>
	</b-modal>
</template>

<script>
import { tiene_diseno } from '@/common-vue/components/pdf/disenador-pdf/estado_del_disenador'

export default {
	components: {
		PdfColumnsPreferencesConfigModal: () => import('@/common-vue/components/pdf/PdfColumnsPreferencesConfigModal.vue'),
		DisenadorPdf: () => import('@/common-vue/components/pdf/disenador-pdf/Index.vue'),
	},
	props: {
		sale: Object,
		modal_id: String,
		/**
		 * El perfil que se está editando (misión diseno-pdf-configurable). Solo se lee su
		 * `page_layout`: si está armado con cajas, el modal esconde lo que ahora se decide en el
		 * diseñador de PDF. Sin pasarlo (null), el modal se ve como siempre.
		 */
		perfil: {
			type: Object,
			default: null,
		},
		pdf_config_rows: {
			type: Array,
			default() {
				return []
			},
		},
		paper_width_mm: {
			type: Number,
			default: 297,
		},
		printable_width_mm: {
			type: Number,
			default: 277,
		},
		margin_mm: {
			type: Number,
			default: 5,
		},
		remaining_width_mm: {
			type: Number,
			default: 0,
		},
		profile_name: {
			type: String,
			default: '',
		},
		sheet_type_id: {
			type: [Number, String, null],
			default: null,
		},
		is_afip_ticket: {
			type: [Boolean, Number, String],
			default: false,
		},
		/**
		 * Marca el perfil como predeterminado para enlaces enviados por WhatsApp.
		 */
		is_default_whatsapp: {
			type: [Boolean, Number, String],
			default: false,
		},
		/**
		 * Predeterminado para WhatsApp en ventas con factura ARCA.
		 */
		is_default_whatsapp_afip: {
			type: [Boolean, Number, String],
			default: false,
		},
		/**
		 * Marca el perfil como predeterminado para PDF de ventas en la tienda (ecommerce).
		 */
		is_default_tienda: {
			type: [Boolean, Number, String],
			default: false,
		},
		show_totals_on_each_page: {
			type: [Boolean, Number, String],
			default: false,
		},
		/**
		 * Flag para controlar visibilidad del total general en el pie del PDF.
		 */
		show_total_in_footer: {
			type: [Boolean, Number, String],
			default: true,
		},
		/**
		 * Texto libre del pie de página del perfil.
		 */
		footer_text: {
			type: String,
			default: '',
		},
		/**
		 * Cuando está activo, el PDF imprime la fecha actual del servidor
		 * en lugar de la fecha en que se creó el comprobante.
		 */
		use_current_date: {
			type: [Boolean, Number, String],
			default: false,
		},
		show_comissions: {
			type: [Boolean, Number, String],
			default: false,
		},
		show_total_costs: {
			type: [Boolean, Number, String],
			default: false,
		},
		sheet_type_options: {
			type: Array,
			default() {
				return []
			},
		},
	},
	data() {
		return {
			/**
			 * El diseñador ya se montó (se monta recién la primera vez que se toca "Diseñar PDF").
			 */
			disenador_montado: false,
			/**
			 * El perfil que se le pasa al diseñador: el del store en el momento de abrirlo. Se fija al
			 * abrir y no se sigue a `perfil`, porque al guardar el diseñador reemplaza el objeto del
			 * store (commit 'add') y no conviene cambiarle el modelo mientras está abierto.
			 */
			perfil_del_disenador: null,
			/**
			 * Hay que abrir el diseñador apenas termine de montarse (la primera vez llega asincrónico).
			 */
			abrir_al_montarse: false,
		}
	},
	computed: {
		/**
		 * Si el perfil es de VENTA: la tabla de columnas se arma en el diseñador y no acá (misión
		 * diseno-ticket-comandera).
		 *
		 * @returns {boolean}
		 */
		es_de_venta() {
			return !!(this.perfil && this.perfil.model_name === 'sale')
		},
		/**
		 * Si el perfil que se edita tiene un diseño armado con cajas (page_layout). En ese caso la
		 * hoja, el margen, el total en el pie, las comisiones, los costos y el texto del pie no se
		 * muestran: se deciden en ABM → Diseño de PDF → Diseñar PDF (decisión 9 del plan de la misión).
		 * Sus valores igual viajan al guardar, tal cual los tiene el perfil.
		 *
		 * @returns {boolean}
		 */
		con_diseno_de_cajas() {
			return !!(this.perfil && tiene_diseno(this.perfil.page_layout))
		},
		/**
		 * Proxy local para ancho de hoja.
		 */
		local_paper_width_mm: {
			get() {
				return this.paper_width_mm
			},
			set(value) {
				this.$emit('update:paper_width_mm', Number(value || 0))
			},
		},
		/**
		 * Proxy local para ancho imprimible.
		 */
		local_printable_width_mm: {
			get() {
				return this.printable_width_mm
			},
			set(value) {
				this.$emit('update:printable_width_mm', Number(value || 0))
			},
		},
		/**
		 * Alias width solicitado por UI para paper_width_mm.
		 */
		local_width_mm: {
			get() {
				return this.local_paper_width_mm
			},
			set(value) {
				this.local_paper_width_mm = Number(value || 0)
			},
		},
		/**
		 * Alias height solicitado por UI para printable_width_mm.
		 */
		local_height_mm: {
			get() {
				return this.local_printable_width_mm
			},
			set(value) {
				this.local_printable_width_mm = Number(value || 0)
			},
		},
		/**
		 * Proxy local para margen lateral por lado.
		 */
		local_margin_mm: {
			get() {
				return this.margin_mm
			},
			set(value) {
				this.$emit('update:margin_mm', Number(value || 0))
			},
		},
		/**
		 * Proxy local del nombre editable del perfil.
		 */
		local_profile_name: {
			get() {
				return this.profile_name
			},
			set(value) {
				this.$emit('update:profile_name', value || '')
			},
		},
		/**
		 * Proxy local del tipo de hoja seleccionado.
		 */
		local_sheet_type_id: {
			get() {
				return this.sheet_type_id
			},
			set(value) {
				this.$emit('update:sheet_type_id', value ? Number(value) : null)
			},
		},
		/**
		 * Proxy local del flag AFIP del perfil.
		 */
		local_is_afip_ticket: {
			get() {
				return this.is_afip_ticket === true || this.is_afip_ticket === 1 || this.is_afip_ticket === '1'
			},
			set(value) {
				this.$emit('update:is_afip_ticket', !!value)
			},
		},
		/**
		 * Proxy local del flag predeterminado para WhatsApp.
		 */
		local_is_default_whatsapp: {
			get() {
				return this.is_default_whatsapp === true
					|| this.is_default_whatsapp === 1
					|| this.is_default_whatsapp === '1'
			},
			set(value) {
				this.$emit('update:is_default_whatsapp', !!value)
			},
		},
		/**
		 * Proxy local del flag predeterminado WhatsApp para facturas ARCA.
		 */
		local_is_default_whatsapp_afip: {
			get() {
				return this.is_default_whatsapp_afip === true
					|| this.is_default_whatsapp_afip === 1
					|| this.is_default_whatsapp_afip === '1'
			},
			set(value) {
				this.$emit('update:is_default_whatsapp_afip', !!value)
			},
		},
		/**
		 * Proxy local del flag predeterminado para PDF de ventas en tienda (ecommerce).
		 */
		local_is_default_tienda: {
			get() {
				return this.is_default_tienda === true
					|| this.is_default_tienda === 1
					|| this.is_default_tienda === '1'
			},
			set(value) {
				this.$emit('update:is_default_tienda', !!value)
			},
		},
		/**
		 * Proxy local del flag para mostrar totales en cada hoja.
		 */
		local_show_totals_on_each_page: {
			get() {
				return this.show_totals_on_each_page === true
					|| this.show_totals_on_each_page === 1
					|| this.show_totals_on_each_page === '1'
			},
			set(value) {
				this.$emit('update:show_totals_on_each_page', !!value)
			},
		},
		/**
		 * Proxy local del flag para mostrar/ocultar el total en el pie.
		 */
		local_show_total_in_footer: {
			get() {
				return this.show_total_in_footer === true
					|| this.show_total_in_footer === 1
					|| this.show_total_in_footer === '1'
			},
			set(value) {
				this.$emit('update:show_total_in_footer', !!value)
			},
		},
		/**
		 * Proxy local del texto del pie de página del perfil.
		 */
		local_footer_text: {
			get() {
				return this.footer_text
			},
			set(value) {
				this.$emit('update:footer_text', value || '')
			},
		},
		/**
		 * Proxy local del flag para imprimir con fecha actual.
		 */
		local_use_current_date: {
			get() {
				return this.use_current_date === true
					|| this.use_current_date === 1
					|| this.use_current_date === '1'
			},
			set(value) {
				this.$emit('update:use_current_date', !!value)
			},
		},
		local_show_comissions: {
			get() {
				return this.show_comissions === true
					|| this.show_comissions === 1
					|| this.show_comissions === '1'
			},
			set(value) {
				this.$emit('update:show_comissions', !!value)
			},
		},
		local_show_total_costs: {
			get() {
				return this.show_total_costs === true
					|| this.show_total_costs === 1
					|| this.show_total_costs === '1'
			},
			set(value) {
				this.$emit('update:show_total_costs', !!value)
			},
		},
	},
	methods: {
		/**
		 * "Diseñar PDF": abre el diseñador sobre el perfil del store (el mismo objeto que edita el
		 * ABM). La primera vez lo monta y lo abre cuando termina de montarse.
		 */
		abrir_disenador() {
			let self = this

			if (!self.perfil) {
				return
			}

			self.perfil_del_disenador = self.perfil

			if (self.disenador_montado && self.$refs.disenador) {
				self.$nextTick(function () {
					self.$refs.disenador.abrir()
				})
				return
			}

			self.abrir_al_montarse = true
			self.disenador_montado = true
		},
		/**
		 * El diseñador terminó de montarse (la primera vez llega asincrónico): se abre si se pidió.
		 */
		al_montarse_el_disenador() {
			let self = this

			if (!self.abrir_al_montarse) {
				return
			}

			self.abrir_al_montarse = false
			self.$nextTick(function () {
				if (self.$refs.disenador) {
					self.$refs.disenador.abrir()
				}
			})
		},
	},
}
</script>
<style lang="sass">
// La línea que avisa que el perfil se diseña con cajas (misión diseno-pdf-configurable). Sin
// `scoped`: el b-modal se monta colgando de <body>. Colores solo por token.
.modal-pdf-columns-profile__con-cajas
	display: flex
	align-items: flex-start
	gap: 8px
	margin: 0 0 12px
	padding: 10px 12px
	border: 1px solid var(--color-border)
	border-radius: 8px
	background: var(--bg-section)
	color: var(--color-text-primary)
	font-size: 0.85rem
	line-height: 1.4

	i
		flex: 0 0 auto
		margin-top: 2px
		color: var(--color-primary)

// El bloque "Diseñar PDF" de un perfil de venta, en el lugar de la tabla de columnas.
.modal-pdf-columns-profile__disenar
	margin: 4px 0 8px

	.modal-pdf-columns-profile__con-cajas
		margin-bottom: 8px
</style>
