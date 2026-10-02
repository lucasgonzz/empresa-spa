<template>
	<div v-if="model.id">
		<!-- Barra de acciones del presupuesto, alineada visualmente al header del modal de ventas -->
		<div class="budget-modal-buttons">
			<!-- Grupo: impresion (dropdown) + WhatsApp -->
			<div class="budget-modal-buttons__group budget-modal-buttons__group--print">
				<b-dropdown
				variant="danger"
				left
				size="sm"
				boundary="viewport"
				data-tour="presupuestos.boton_imprimir"
				:popper-opts="dropdown_popper_opts"
				menu-class="budget-print-dropdown-menu">
					<template #button-content>
						<i class="bi bi-printer"></i>
						Imprimir
					</template>
					<!--
						Con diseños de presupuesto cargados (ABM "Diseño de PDF"): un ítem por
						diseño, el marcado como por defecto primero. El link lleva el id del diseño y la API
						arma el PDF con esas columnas y ese pie.
						Sin diseños de presupuesto en el store (API que todavía no los tiene, o dueño al que
						no se le corrió el seeder): los tres botones de siempre, que la API atiende igual
						sin `pdf_column_profile_id`.
					-->
					<template v-if="budget_profiles.length">
						<b-dropdown-item
						v-for="profile in budget_profiles"
						:key="profile.id"
						@click="printWithProfile(profile)">
							{{ profile.name }}
							<small
							v-if="is_default_profile(profile)"
							class="text-muted">(por defecto)</small>
						</b-dropdown-item>
					</template>

					<template v-else>
						<b-dropdown-item @click="printWithoutPrices">Sin precios</b-dropdown-item>
						<b-dropdown-item @click="printWithPrices">Con precios</b-dropdown-item>
						<b-dropdown-item @click="printWithImages">Con imagenes</b-dropdown-item>
					</template>
				</b-dropdown>

				<!-- Reutiliza el boton de WhatsApp de ventas en modo presupuesto: from_budget arma el link a /budget/pdf -->
				<whatsapp-btn
				:sale="model"
				from_budget></whatsapp-btn>
			</div>

			<!-- Separador vertical entre grupos -->
			<span
			class="budget-modal-buttons__divider"
			aria-hidden="true"></span>

			<!-- Grupo: edicion del presupuesto (mismo lugar que 'Actualizar venta' en el modal de ventas) -->
			<div class="budget-modal-buttons__group">
				<btn-actualizar-en-vender></btn-actualizar-en-vender>
				<!--
					🔴 El ancla del tour va aca, en la instancia del MODAL, y no adentro de
					`BtnConfirmarAnular.vue`: ese mismo componente se dibuja tambien una vez por
					fila del listado (`views/Budget.vue:19`), asi que un `data-tour` puesto en su
					plantilla saldria repetido tantas veces como presupuestos haya en pantalla y
					el tour terminaria senalando el boton de la primera fila.

					En Vue 2 el atributo cae en el elemento raiz del hijo, que es el <b-button>.
				-->
				<btn-confirmar-anular
				data-tour="presupuestos.boton_confirmar"
				:model="model"></btn-confirmar-anular>
			</div>
		</div>
		<hr>
	</div>
</template>
<script>
import { env } from '@/runtime_config'
export default {
	components: {
		WhatsappBtn: () => import('@/common-vue/sale-print-buttons/WhatsappBtn'),
		BtnActualizarEnVender: () => import('@/components/budget/components/BtnActualizarEnVender'),
		BtnConfirmarAnular: () => import('@/components/budget/components/BtnConfirmarAnular'),
	},
	data() {
		return {
			// Opciones Popper para que el menu del dropdown no quede recortado dentro del modal scrollable
			dropdown_popper_opts: {
				positionFixed: true,
			},
			// Ya se pidieron (o se intentó pedir) los diseños de presupuesto en esta instancia:
			// evita repetir el pedido cada vez que se abre otro presupuesto.
			budget_profiles_requested: false,
		}
	},
	computed: {
		// Nombre del modelo del store que maneja este modal
		model_name() {
			return 'budget'
		},
		// Presupuesto actualmente abierto en el modal
		model() {
			return this.$store.state[this.model_name].model
		},
		/**
		 * Diseños de PDF (pdf_column_profile) del modelo `budget` que tiene el dueño, para el menú
		 * "Imprimir": el marcado como por defecto primero y después por nombre. Vacío si el store
		 * no tiene ninguno; en ese caso el template cae a los tres botones de siempre.
		 *
		 * @returns {Array}
		 */
		budget_profiles() {
			const models = this.$store.state.pdf_column_profile.models || []
			const profiles = models.filter(profile => profile.model_name === 'budget')

			return profiles.sort((profile_a, profile_b) => {
				const default_a = this.is_default_profile(profile_a)
				const default_b = this.is_default_profile(profile_b)

				if (default_a !== default_b) {
					return default_a ? -1 : 1
				}
				return String(profile_a.name || '').localeCompare(String(profile_b.name || ''), 'es')
			})
		},
	},
	watch: {
		// Se chequea cuando se abre un presupuesto (el modal se arma con el store), no al montar el
		// componente: este modal se monta en ~25 pantallas y no en todas se llega a abrir.
		'model.id': {
			immediate: true,
			handler(model_id) {
				if (model_id) {
					this.ensure_budget_profiles_loaded()
				}
			},
		},
	},
	methods: {
		/**
		 * Asegura que los diseños de presupuesto estén en el store. Normalmente ya están: la
		 * descarga inicial (call_methods.js) baja todos los pdf_column_profile. Solo se piden acá
		 * si esa descarga completa todavía no terminó (`all_profiles_loaded` en false, p. ej. se
		 * abrió el modal muy rápido tras iniciar sesión). Se pide filtrado por `budget`: el store
		 * hace merge por model_name y no pisa los diseños de venta ni de artículo.
		 *
		 * @returns {void}
		 */
		ensure_budget_profiles_loaded() {
			if (this.budget_profiles_requested || this.$store.state.pdf_column_profile.all_profiles_loaded) {
				return
			}
			this.budget_profiles_requested = true

			this.$store.dispatch('pdf_column_profile/getModels', { model_name: 'budget' })
			.catch(() => {
				// Si falla el pedido, el menú queda con los tres botones de siempre.
			})
		},
		/**
		 * Indica si un diseño está marcado como por defecto (el valor puede venir como 1, '1' o true).
		 *
		 * @param {Object} profile Diseño de PDF (pdf_column_profile).
		 * @returns {boolean}
		 */
		is_default_profile(profile) {
			return profile.is_default === true || profile.is_default === 1 || profile.is_default === '1'
		},
		/**
		 * Abre el PDF del presupuesto con el diseño elegido. El diseño manda: sale con sus columnas,
		 * su encabezado y su pie, así que los segmentos de precios/imágenes de la ruta (1/0) no
		 * cambian el resultado; se mandan porque la ruta los exige.
		 *
		 * @param {Object} profile Diseño de PDF (pdf_column_profile) elegido en el menú.
		 * @returns {void}
		 */
		printWithProfile(profile) {
			var link = env('VUE_APP_API_URL')+'/budget/pdf/'+this.model.id+'/1/0?pdf_column_profile_id='+profile.id
			window.open(link)
		},
		// Abre el PDF del presupuesto SIN precios
		printWithoutPrices() {
			var link = env('VUE_APP_API_URL')+'/budget/pdf/'+this.model.id+'/0/0'
			window.open(link)
		},
		// Abre el PDF del presupuesto CON precios
		printWithPrices() {
			var link = env('VUE_APP_API_URL')+'/budget/pdf/'+this.model.id+'/1/0'
			window.open(link)
		},
		// Abre el PDF del presupuesto CON precios e imagenes
		printWithImages() {
			var link = env('VUE_APP_API_URL')+'/budget/pdf/'+this.model.id+'/1/1'
			window.open(link)
		},
	}
}
</script>
<style lang="sass">
.budget-modal-buttons
	display: flex
	// Envuelve en vez de desbordar: con el boton de Confirmar/Anular son cuatro grupos en una
	// sola fila, y en telefono (360-390px) `nowrap` los empujaba fuera del header del modal.
	flex-flow: row wrap
	align-items: center
	gap: 6px 0
	width: 100%
	overflow: visible
	padding: 6px 0

	// Separador vertical entre grupos
	&__divider
		display: inline-block
		width: 1px
		height: 22px
		background: var(--color-border-tertiary, #dee2e6)
		margin: 0 8px
		flex-shrink: 0
		opacity: 0.9

	// Contenedor de cada grupo de la barra
	&__group
		display: inline-flex
		flex: 0 0 auto
		align-items: center
		white-space: nowrap
		gap: 4px

	// Impresion + WhatsApp: crear stacking context propio para que el menu del dropdown quede por encima
	&__group--print
		position: relative
		z-index: 1060
		overflow: visible

	// Botones uniformes dentro de la barra
	::v-deep .btn
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 4px
		white-space: nowrap

	// WhatsApp: anular el margen legacy m-l-10 del componente compartido (el gap ya separa)
	::v-deep .m-l-10
		margin-left: 0 !important

.budget-print-dropdown-menu
	z-index: 3060 !important
	background-color: var(--bg-card, #fff)
	// Con nombres de diseño largos el menú no puede desbordar el modal en teléfono (360-390px):
	// se acota al ancho de la pantalla y el texto de cada ítem baja de renglón en vez de cortarse.
	max-width: calc(100vw - 24px)

	.dropdown-item
		white-space: normal
		word-break: break-word
</style>
