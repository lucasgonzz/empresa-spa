<template>
	<b-dropdown
	v-if="model.id && order_profiles.length"
	variant="outline-danger"
	boundary="viewport"
	:popper-opts="dropdown_popper_opts">
		<template #button-content>
			<i class="icon-print"></i>
			Imprimir
		</template>
		<b-dropdown-item
		v-for="profile in order_profiles"
		:key="profile.id"
		link-class="text-wrap"
		@click="print_with_profile(profile)">
			{{ profile.name }}
			<small
			v-if="is_default_profile(profile)"
			class="text-muted">(por defecto)</small>
		</b-dropdown-item>
	</b-dropdown>

	<b-button
	v-else-if="model.id"
	@click="print"
	variant="outline-danger">
		<i class="icon-print"></i>
		Imprimir
	</b-button>
</template>
<script>
import { env } from '@/runtime_config'
/**
 * Botón "Imprimir" genérico de un modelo: abre en otra pestaña el PDF `/<modelo>/pdf/<id>` de la API.
 *
 * Consumidores (todos pasan `model_name` y `model`): common-vue/components/model/Index.vue (con la
 * prop `show_btn_pdf`: pedidos online, compras a proveedores, hojas de ruta), el resumen de caja y
 * el modal de hoja de ruta.
 *
 * Para `model_name === 'order'` (pedido online), si el dueño tiene diseños de PDF de ese modelo
 * (pdf_column_profile con model_name 'order') el botón pasa a ser un menú con un ítem por diseño,
 * y el PDF se abre con `?pdf_column_profile_id=<id>`. Para cualquier otro modelo el comportamiento
 * es exactamente el de antes.
 *
 * El botón simple de siempre también queda para un pedido online sin diseños en el store
 * (API vieja o dueño al que no se le corrió el seeder).
 */
export default {
	props: {
		model_name: String,
		model: Object,
	},
	data() {
		return {
			// Opciones Popper para que el menú no quede recortado dentro de un modal con scroll.
			dropdown_popper_opts: {
				positionFixed: true,
			},
			// Ya se pidieron (o se intentó pedir) los diseños de pedido online en esta instancia.
			order_profiles_requested: false,
		}
	},
	computed: {
		/**
		 * Diseños de PDF (pdf_column_profile) del modelo `order` del dueño: el marcado como por
		 * defecto primero y después por nombre. Vacío para cualquier otro model_name o si el store
		 * no tiene ninguno; en esos casos se muestra el botón simple.
		 *
		 * @returns {Array}
		 */
		order_profiles() {
			if (this.model_name !== 'order') {
				return []
			}

			const models = this.$store.state.pdf_column_profile.models || []
			const profiles = models.filter(profile => profile.model_name === 'order')

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
		// Se chequea cuando se abre un pedido (el modal ya tiene `model.id`): así no se pide nada en
		// las pantallas donde este botón se monta pero nunca se abre un pedido online.
		'model.id': {
			immediate: true,
			handler(model_id) {
				if (model_id && this.model_name === 'order') {
					this.ensure_order_profiles_loaded()
				}
			},
		},
	},
	methods: {
		print() {
            var link = env('VUE_APP_API_URL')+'/'+this.routeString(this.model_name)+'/pdf/'+this.model.id
            window.open(link)
		},
		/**
		 * Asegura que los diseños de pedido online estén en el store. Normalmente ya están: la
		 * descarga inicial (call_methods.js) baja todos los pdf_column_profile. Solo se piden acá
		 * si esa descarga completa todavía no terminó (`all_profiles_loaded` en false). Se pide
		 * filtrado por `order`: el store hace merge por model_name y no pisa los diseños de
		 * venta, presupuesto ni artículo.
		 *
		 * @returns {void}
		 */
		ensure_order_profiles_loaded() {
			if (this.order_profiles_requested || this.$store.state.pdf_column_profile.all_profiles_loaded) {
				return
			}
			this.order_profiles_requested = true

			this.$store.dispatch('pdf_column_profile/getModels', { model_name: 'order' })
			.catch(() => {
				// Si falla el pedido, queda el botón simple de siempre.
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
		 * Abre el PDF del pedido online con el diseño elegido: /order/pdf/<id>?pdf_column_profile_id=<id>.
		 * Sin ese parámetro la API imprime el PDF de siempre.
		 *
		 * @param {Object} profile Diseño de PDF (pdf_column_profile) elegido en el menú.
		 * @returns {void}
		 */
		print_with_profile(profile) {
			var link = env('VUE_APP_API_URL')+'/'+this.routeString(this.model_name)+'/pdf/'+this.model.id+'?pdf_column_profile_id='+profile.id
			window.open(link)
		},
	}
}
</script>
