<template>
	<b-modal
	id="header-designer-modal"
	size="xl"
	title="Diseñar header del comprobante"
	:visible="visible"
	@hide="on_hide"
	hide-footer>
		<div class="header-designer">
			<p class="small text-muted m-b-15">
				Arrastrá los campos entre los cuadrantes y la paleta para armar el header a tu gusto.
				<span v-if="is_afip">
					Los campos con <span title="Obligatorio (fiscal)">🔒</span> son obligatorios en perfiles fiscales: se pueden mover de cuadrante pero no quitar.
				</span>
			</p>

			<b-row>
				<b-col cols="12" md="8" class="m-b-15">
					<header-preview
					:layout="layout"
					:is_afip="is_afip"
					:locked_emisor_keys="locked_emisor_keys"
					:logo_size_mm="logo_size_mm"
					@update:logo_size_mm="logo_size_mm = $event"
					:paper_width_mm="model.paper_width_mm"></header-preview>
				</b-col>

				<b-col cols="12" md="4">
					<chip-palette
					:emisor_palette="emisor_palette"
					:receptor_palette="receptor_palette"
					:show_receptor="show_receptor"
					:locked_keys="locked_emisor_keys"></chip-palette>
				</b-col>
			</b-row>

			<div class="d-flex justify-content-between align-items-center m-t-15">
				<b-button
				variant="outline-secondary"
				size="sm"
				@click="restore_default">
					Restaurar diseño por defecto
				</b-button>

				<div>
					<b-button
					variant="secondary"
					class="m-r-10"
					@click="close">
						Cancelar
					</b-button>
					<b-button
					variant="primary"
					:disabled="saving"
					@click="save">
						Guardar diseño
					</b-button>
				</div>
			</div>
		</div>
	</b-modal>
</template>

<script>
import HeaderPreview from '@/common-vue/components/pdf/header-designer/HeaderPreview.vue'
import ChipPalette from '@/common-vue/components/pdf/header-designer/ChipPalette.vue'
import {
	emisor_chip_keys,
	RECEPTOR_CHIP_LABELS,
	FISCAL_REQUIRED_EMISOR_KEYS,
	default_header_layout,
	LOGO_SIZE_MM_DEFAULT,
} from '@/common-vue/components/pdf/header-designer/header_designer_catalog'

/**
 * Diseñador visual del header del PDF (prompt 441): modal con previsualización en
 * forma de header A4, drag & drop de campos por cuadrante (emisor izquierda/derecha,
 * receptor izquierda) y manija de redimensionado del logo.
 *
 * Recibe el `pdf_column_profile` en edición (mismo objeto que maneja el ABM,
 * PdfColumnProfileEditor.vue) y persiste `header_layout` + `logo_size_mm`:
 * - Si el perfil ya tiene id: guarda inmediatamente vía PUT (el payload ya
 *   transporta ambos campos, prompts 437 y 440).
 * - Si el perfil todavía no fue creado (sin id): solo actualiza el modelo en
 *   memoria; se persiste cuando el usuario guarde el ABM completo.
 *
 * Se abre programáticamente desde el padre vía `this.$refs.header_designer.open()`.
 */
export default {
	name: 'HeaderDesignerIndex',
	components: {
		HeaderPreview,
		ChipPalette,
	},
	props: {
		/**
		 * Modelo del perfil de PDF en edición (pdf_column_profile). Se usa is_afip_ticket
		 * para saber si el perfil es fiscal, y model.id para decidir si se persiste
		 * inmediatamente o solo en memoria.
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/**
			 * Controla la visibilidad del modal (se abre/cierra vía open()/close()).
			 */
			visible: false,
			/**
			 * Estado editable del layout, copia de trabajo de model.header_layout
			 * (o del default si no tiene). Se serializa a model.header_layout al guardar.
			 */
			layout: {
				emisor: { izquierda: [], derecha: [] },
				receptor: { izquierda: [] },
			},
			/**
			 * Claves de chips de emisor que todavía no están colocados en ningún cuadrante.
			 */
			emisor_palette: [],
			/**
			 * Claves de chips de receptor que todavía no están colocados (remito negro).
			 */
			receptor_palette: [],
			/**
			 * Tamaño del logo en mm, copia de trabajo de model.logo_size_mm.
			 */
			logo_size_mm: LOGO_SIZE_MM_DEFAULT,
			/**
			 * true mientras se persiste el diseño vía API (deshabilita "Guardar diseño").
			 */
			saving: false,
		}
	},
	computed: {
		/**
		 * Si el perfil en edición es fiscal (factura ARCA). Determina campos
		 * obligatorios de emisor y si se muestra el bloque receptor editable.
		 *
		 * @return {boolean}
		 */
		is_afip() {
			return !!(this.model && this.model.is_afip_ticket)
		},
		/**
		 * Muestra el bloque receptor (y su paleta) solo en perfiles no fiscales.
		 *
		 * @return {boolean}
		 */
		show_receptor() {
			return !this.is_afip
		},
		/**
		 * Claves de emisor obligatorias en el perfil actual (solo si es fiscal).
		 *
		 * @return {Array<string>}
		 */
		locked_emisor_keys() {
			return this.is_afip ? FISCAL_REQUIRED_EMISOR_KEYS : []
		},
	},
	methods: {
		/**
		 * Abre el diseñador: reconstruye el estado editable a partir de
		 * model.header_layout (o el default si no tiene) y muestra el modal.
		 * Se llama desde el padre (PdfColumnProfileEditor.vue) vía $refs.
		 *
		 * @return {void}
		 */
		open() {
			this.build_state_from_model()
			this.visible = true
		},
		/**
		 * Cierra el modal sin persistir cambios adicionales.
		 *
		 * @return {void}
		 */
		close() {
			this.visible = false
		},
		/**
		 * Handler del evento `hide` del b-modal (click afuera, ESC, botón cerrar).
		 *
		 * @return {void}
		 */
		on_hide() {
			this.visible = false
		},
		/**
		 * Reconstruye layout/paletas/logo_size_mm de trabajo a partir del modelo:
		 * usa model.header_layout si existe, o el default del catálogo si no.
		 *
		 * @return {void}
		 */
		build_state_from_model() {
			const saved_layout = this.model && this.model.header_layout
			const base_layout = (saved_layout && typeof saved_layout === 'object')
				? saved_layout
				: default_header_layout(this.is_afip)

			/* Copia defensiva para no mutar el objeto original hasta guardar */
			this.layout = {
				emisor: {
					izquierda: (base_layout.emisor && base_layout.emisor.izquierda) ? base_layout.emisor.izquierda.slice() : [],
					derecha: (base_layout.emisor && base_layout.emisor.derecha) ? base_layout.emisor.derecha.slice() : [],
				},
				receptor: {
					izquierda: (base_layout.receptor && base_layout.receptor.izquierda) ? base_layout.receptor.izquierda.slice() : [],
				},
			}

			const saved_logo_size_mm = this.model && this.model.logo_size_mm
			this.logo_size_mm = saved_logo_size_mm ? Number(saved_logo_size_mm) : LOGO_SIZE_MM_DEFAULT

			this.rebuild_palettes()
		},
		/**
		 * Restaura el layout por defecto (mismo esquema que
		 * PdfColumnProfile::default_header_layout del backend) sin cerrar el modal.
		 *
		 * @return {void}
		 */
		restore_default() {
			const base_layout = default_header_layout(this.is_afip)
			this.layout = {
				emisor: {
					izquierda: base_layout.emisor.izquierda.slice(),
					derecha: base_layout.emisor.derecha.slice(),
				},
				receptor: {
					izquierda: base_layout.receptor.izquierda.slice(),
				},
			}
			this.rebuild_palettes()
		},
		/**
		 * Recalcula las paletas (campos sin colocar) según los chips que ya están
		 * en algún cuadrante del layout actual.
		 *
		 * @return {void}
		 */
		rebuild_palettes() {
			const placed_emisor = this.layout.emisor.izquierda.concat(this.layout.emisor.derecha)
			this.emisor_palette = emisor_chip_keys(this.is_afip).filter(function (key) {
				return placed_emisor.indexOf(key) === -1
			})

			const placed_receptor = this.layout.receptor.izquierda
			this.receptor_palette = Object.keys(RECEPTOR_CHIP_LABELS).filter(function (key) {
				return placed_receptor.indexOf(key) === -1
			})
		},
		/**
		 * Garantiza que, antes de guardar, los campos fiscales obligatorios estén
		 * presentes en algún cuadrante del emisor (red de seguridad: en uso normal
		 * el drag & drop ya lo impide, pero cubre layouts previos incompletos).
		 * Los agrega al final de "derecha" si faltan, sin reordenar los existentes.
		 *
		 * @return {void}
		 */
		ensure_fiscal_required_present() {
			if (!this.is_afip) {
				return
			}
			const placed = this.layout.emisor.izquierda.concat(this.layout.emisor.derecha)
			FISCAL_REQUIRED_EMISOR_KEYS.forEach((key) => {
				if (placed.indexOf(key) === -1) {
					this.layout.emisor.derecha.push(key)
				}
			})
		},
		/**
		 * Persiste el diseño: serializa el layout actual (respetando el orden visual
		 * de cada cuadrante) y logo_size_mm. Si el perfil ya tiene id, guarda
		 * inmediatamente vía API; si es un perfil nuevo (sin id todavía), solo
		 * actualiza el modelo en memoria para que viaje con el guardado del ABM.
		 *
		 * @return {void}
		 */
		save() {
			this.ensure_fiscal_required_present()

			/* Layout final a persistir, con el orden visual actual de cada cuadrante */
			const header_layout = {
				emisor: {
					izquierda: this.layout.emisor.izquierda.slice(),
					derecha: this.layout.emisor.derecha.slice(),
				},
				receptor: {
					izquierda: this.layout.receptor.izquierda.slice(),
				},
			}

			if (!this.model.id) {
				/* Perfil todavía no creado: solo se actualiza en memoria, se persiste con el guardado del ABM */
				this.$set(this.model, 'header_layout', header_layout)
				this.$set(this.model, 'logo_size_mm', this.logo_size_mm)
				this.$toast.success('Diseño aplicado. Guardá el perfil para persistirlo.')
				this.close()
				return
			}

			this.saving = true
			this.$store.commit('auth/setMessage', 'Guardando diseño de header')
			this.$store.commit('auth/setLoading', true)

			this.$api.put('pdf-column-profiles/' + this.model.id, {
				header_layout: header_layout,
				logo_size_mm: this.logo_size_mm,
			})
				.then((res) => {
					const saved_model = res.data && res.data.model
					if (saved_model) {
						this.$set(this.model, 'header_layout', saved_model.header_layout)
						this.$set(this.model, 'logo_size_mm', saved_model.logo_size_mm)
						this.$store.commit('pdf_column_profile/add', saved_model)
					}
					this.$toast.success('Diseño de header guardado')
					this.close()
				})
				.catch((err) => {
					const message = (err.response && err.response.data && err.response.data.message)
						? err.response.data.message
						: 'No se pudo guardar el diseño de header'
					this.$toast.error(message)
				})
				.finally(() => {
					this.saving = false
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
				})
		},
	},
}
</script>

<style lang="sass" scoped>
.header-designer
	width: 100%
</style>
