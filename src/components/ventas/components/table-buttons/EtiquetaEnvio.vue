<template>
	<div
	v-if="sale.client">
		<!-- Grupo: PDF de etiqueta (elige remitente), edición destinatario (SaleDeliveryInfo) -->
		<b-button-group
		class="m-l-5"
		size="sm">
			<b-button
			variant="primary"
			@click.stop="abrir_modal_remitente">
				<i class="icon-tag"></i>
			</b-button>
			<b-button
			variant="outline-primary"
			@click.stop="abrir_modal_envio">
				<i class="icon-edit"></i>
			</b-button>
		</b-button-group>

		<!-- Modal: elige remitente (SaleSenderInfo) y abre el PDF con query string -->
		<b-modal
		:id="modal_remitente_id"
		title="Remitente para la etiqueta"
		hide-footer
		centered
		@show="sincronizar_seleccion_remitente">
			<template
			v-if="remitentes.length === 0">
				<p class="text-muted">
					No hay remitentes configurados. Creá al menos uno en ABM → Ventas → Remitentes.
				</p>
				<router-link
				class="btn btn-sm btn-primary"
				:to="ruta_abm_remitentes">
					Ir a ABM Remitentes
				</router-link>
			</template>
			<template
			v-else>
				<b-form-group
				label="Remitente (datos del negocio en el PDF)">
					<b-form-select
					v-model="selected_sender_id"
					:options="opciones_remitentes"
					value-field="value"
					text-field="text"></b-form-select>
				</b-form-group>
				<p class="text-muted small m-t-5">
					Elegí qué datos del negocio mostrar arriba a la derecha en la etiqueta (nombre, mail, CUIT, CP, localidad, provincia).
				</p>
				<router-link
				class="btn btn-sm btn-outline-secondary m-r-10 m-t-10"
				:to="ruta_abm_remitentes">
					Administrar remitentes
				</router-link>
				<btn-loader
				class="m-t-10"
				text="Generar etiqueta"
				:loader="generando_pdf"
				:disabled="!selected_sender_id"
				@clicked="generar_etiqueta_pdf"></btn-loader>
			</template>
		</b-modal>

		<b-modal
		:id="modal_id"
		title="Datos de envío (etiqueta)"
		@show="sincronizar_formulario"
		hide-footer
		centered
		size="lg">
			<b-form>
				<b-form-row>
					<b-col
					md="6">
						<!-- Nombre: primer segmento o override -->
						<b-form-group
						label="Nombre">
							<b-form-input
							v-model="form.first_name"
							placeholder="Nombre"></b-form-input>
						</b-form-group>
					</b-col>
					<b-col
					md="6">
						<b-form-group
						label="Apellido">
							<b-form-input
							v-model="form.last_name"
							placeholder="Apellido"></b-form-input>
						</b-form-group>
					</b-col>
				</b-form-row>
				<b-form-row>
					<b-col
					md="6">
						<b-form-group
						label="Tel / Cel">
							<b-form-input
							v-model="form.phone"
							placeholder="Teléfono"></b-form-input>
						</b-form-group>
					</b-col>
					<b-col
					md="6">
						<b-form-group
						label="Email">
							<b-form-input
							v-model="form.email"
							placeholder="Email"
							type="email"></b-form-input>
						</b-form-group>
					</b-col>
				</b-form-row>
				<b-form-row>
					<b-col
					md="6">
						<b-form-group
						label="DNI">
							<b-form-input
							v-model="form.dni"
							placeholder="DNI"></b-form-input>
						</b-form-group>
					</b-col>
					<b-col
					md="6">
						<b-form-group
						label="CUIT">
							<b-form-input
							v-model="form.cuit"
							placeholder="CUIT"></b-form-input>
						</b-form-group>
					</b-col>
				</b-form-row>
				<b-form-row>
					<b-col
					md="4">
						<b-form-group
						label="Localidad">
							<b-form-input
							v-model="form.locality"
							placeholder="Localidad"></b-form-input>
						</b-form-group>
					</b-col>
					<b-col
					md="4">
						<b-form-group
						label="Provincia">
							<b-form-input
							v-model="form.province"
							placeholder="Provincia"></b-form-input>
						</b-form-group>
					</b-col>
					<b-col
					md="4">
						<b-form-group
						label="Código postal">
							<b-form-input
							v-model="form.postal_code"
							placeholder="CP"></b-form-input>
						</b-form-group>
					</b-col>
				</b-form-row>
			</b-form>

			<btn-loader
			class="m-t-10"
			text="Guardar"
			:loader="guardando"
			@clicked="guardar"></btn-loader>
		</b-modal>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'

/**
 * Formulario en memoria: alineado con sale_delivery_infos y con el merge cliente + overrides.
 */
function form_vacio() {
	return {
		first_name: '',
		last_name: '',
		phone: '',
		dni: '',
		cuit: '',
		locality: '',
		province: '',
		postal_code: '',
		email: '',
	}
}

export default {
	components: {
		BtnLoader,
	},
	props: {
		/** Venta de la fila: incluye client, sale_delivery_info cuando vienen del listado. */
		sale: {
			type: Object,
			required: true,
		},
	},
	data() {
		/** Indicador de request en curso al guardar SaleDeliveryInfo. */
		return {
			guardando: false,
			/** Valores del modal; se rellenan al abrir con merge cliente / sale_delivery_info. */
			form: form_vacio(),
			/** Id del remitente elegido para este PDF. */
			selected_sender_id: null,
			/** Indicador al guardar remitente elegido y abrir PDF. */
			generando_pdf: false,
		}
	},
	computed: {
		/** Remitentes ya cargados en el store (call_methods al inicio). */
		remitentes() {
			var state = this.$store.state.sale_sender_info
			return state && state.models ? state.models : []
		},
		/** Enlace al ABM sección Ventas, modelo Remitentes (sale_sender_info). */
		ruta_abm_remitentes() {
			return {
				name: 'abm',
				params: {
					view: 'ventas',
					sub_view: 'remitentes',
				},
			}
		},
		/** Id único del modal por venta (varias filas en tabla). */
		modal_id() {
			return 'etiqueta-envio-delivery-' + this.sale.id
		},
		/** Modal de selección de remitente. */
		modal_remitente_id() {
			return 'etiqueta-envio-sender-' + this.sale.id
		},
		/** Opciones del select: valor numérico para b-form-select. */
		opciones_remitentes() {
			var opts = []
			var self = this
			self.remitentes.forEach(function (r) {
				opts.push({
					value: r.id,
					text: r.name,
				})
			})
			return opts
		},
	},
	methods: {
		/**
		 * Abre el modal de remitente (antes de generar el PDF).
		 */
		abrir_modal_remitente() {
			this.$bvModal.show(this.modal_remitente_id)
		},

		/**
		 * Al abrir el modal: usa los sale_sender_info del store y preselecciona según la venta.
		 */
		sincronizar_seleccion_remitente() {
			var models = this.remitentes
			this.selected_sender_id = null
			if (this.sale.sale_sender_info_id) {
				this.selected_sender_id = this.sale.sale_sender_info_id
			} else if (models.length === 1) {
				this.selected_sender_id = models[0].id
			}
		},

		/**
		 * Persiste el remitente elegido en la venta y abre el PDF con sale_sender_info_id.
		 */
		generar_etiqueta_pdf() {
			var self = this
			if (!self.selected_sender_id) {
				self.$toast.warning('Elegí un remitente')
				return
			}
			self.generando_pdf = true
			self.$api.put('sale/' + self.sale.id + '/etiqueta-sender', {
				sale_sender_info_id: self.selected_sender_id,
			})
				.then(function (res) {
					self.generando_pdf = false
					self.$store.commit('sale/add', res.data.model)
					var url = process.env.VUE_APP_API_URL + '/sale/etiqueta-envio/pdf/' + self.sale.id
						+ '?sale_sender_info_id=' + self.selected_sender_id
					window.open(url)
					self.$bvModal.hide(self.modal_remitente_id)
				})
				.catch(function (err) {
					self.generando_pdf = false
					console.log(err)
				})
		},

		abrir_modal_envio() {
			this.$bvModal.show(this.modal_id)
		},

		/**
		 * Al mostrar el modal, vuelve a mezclar overrides con datos del cliente.
		 */
		sincronizar_formulario() {
			this.form = this.merge_campos_envio(this.sale)
		},

		/**
		 * Construye los campos iniciales: prioriza sale_delivery_info si el campo guardado no está vacío.
		 *
		 * @param {Object} sale Modelo de venta con client y opcional sale_delivery_info.
		 * @returns {Object} Copia de form_vacio rellenada.
		 */
		merge_campos_envio(sale) {
			var o = sale.sale_delivery_info
			var c = sale.client
			var out = form_vacio()
			/** Nombre y apellido por defecto desde el nombre completo del cliente. */
			var partes = this.dividir_nombre(c && c.name)
			/** Localidad y CP por defecto desde la ubicación del cliente. */
			var loc = c && c.location
			var prov = loc && loc.provincia

			/**
			 * Toma el valor guardado en overrides si es texto no vacío; si no, el fallback.
			 * @param {string} key Campo en sale_delivery_info.
			 * @param {string} fallback Valor deducido del cliente.
			 */
			function pick(key, fallback) {
				if (!o || o[key] === undefined || o[key] === null) {
					return fallback
				}
				var t = String(o[key]).trim()
				return t !== '' ? t : fallback
			}

			out.first_name = pick('first_name', partes[0])
			out.last_name = pick('last_name', partes[1])
			out.phone = pick('phone', c && c.phone ? String(c.phone) : '')
			out.locality = pick('locality', loc && loc.name ? String(loc.name) : '')
			out.province = pick('province', prov && prov.name ? String(prov.name) : '')
			out.postal_code = pick('postal_code', loc && loc.codigo_postal != null ? String(loc.codigo_postal) : '')
			out.email = pick('email', c && c.email ? String(c.email) : '')

			// DNI / CUIT: si en overrides hay alguno, se usan; si no, se toma del cliente.
			var dni_o = o && o.dni != null && String(o.dni).trim() !== '' ? String(o.dni).trim() : ''
			var cuit_o = o && o.cuit != null && String(o.cuit).trim() !== '' ? String(o.cuit).trim() : ''
			if (dni_o || cuit_o) {
				out.dni = dni_o
				out.cuit = cuit_o
			} else if (c) {
				if (c.dni) {
					out.dni = String(c.dni)
				} else if (c.cuit) {
					out.cuit = String(c.cuit)
				}
			}

			return out
		},

		/**
		 * Divide el nombre completo en primer token y resto (apellidos).
		 *
		 * @param {string|undefined} nombre_completo Campo name del cliente.
		 * @returns {Array<string>} [nombre, apellidos].
		 */
		dividir_nombre(nombre_completo) {
			if (!nombre_completo) {
				return ['', '']
			}
			var t = String(nombre_completo).trim().replace(/\s+/g, ' ')
			if (!t) {
				return ['', '']
			}
			var i = t.indexOf(' ')
			if (i === -1) {
				return [t, '']
			}
			return [t.substring(0, i), t.substring(i + 1).trim()]
		},

		/**
		 * Persiste SaleDeliveryInfo vía API y actualiza el modelo en el store de ventas.
		 */
		guardar() {
			var self = this
			self.guardando = true
			self.$api.put('sale/' + self.sale.id + '/delivery-info', {
				first_name: self.form.first_name,
				last_name: self.form.last_name,
				phone: self.form.phone,
				dni: self.form.dni,
				cuit: self.form.cuit,
				locality: self.form.locality,
				province: self.form.province,
				postal_code: self.form.postal_code,
				email: self.form.email,
			})
				.then(function (res) {
					self.guardando = false
					self.$store.commit('sale/add', res.data.model)
					self.$toast.success('Datos de envío guardados')
					self.$bvModal.hide(self.modal_id)
				})
				.catch(function (err) {
					self.guardando = false
					console.log(err)
				})
		},
	},
}
</script>
