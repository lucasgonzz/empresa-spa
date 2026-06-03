<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<dropdown-section-title
		title="PDF tabla (plantillas)"
		icon="icon-pdf"></dropdown-section-title>

		<template v-if="!owner_uses_listas_de_precio">
			<dropdown-option-item
			v-for="profile in article_table_pdf_profiles"
			:key="profile.id"
			icon="icon-pdf"
			@click="open_table_pdf(profile, null)">
				{{ profile.name }}
			</dropdown-option-item>
		</template>
		<template v-else>
			<template v-for="profile in article_table_pdf_profiles">
				<dropdown-option-item
				v-for="price_type in price_types"
				:key="profile.id + '-' + price_type.id"
				icon="icon-pdf"
				@click="open_table_pdf(profile, price_type.id)">
					{{ profile.name }} — {{ price_type.name }}
				</dropdown-option-item>
			</template>
		</template>

		<p
		v-if="!article_table_pdf_profiles.length && !loading_profiles"
		class="article-dropdown-section-header text-muted small px-3 py-2 mb-0">
			Sin plantillas (Configuración → Generales)
		</p>
	</div>
</template>
<script>
import generals from '@/mixins/generals'

/**
 * Lista plantillas PdfColumnProfile (model_name article) y abre PDF tabular.
 * Con listas de precio activas, una opción por plantilla y por price_type.
 */
export default {
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	mixins: [generals],
	data() {
		return {
			loading_profiles: false,
		}
	},
	computed: {
		/**
		 * Indica si el dueño trabaja con listas de precios (`user.listas_de_precio`).
		 *
		 * @returns {boolean}
		 */
		owner_uses_listas_de_precio() {
			return this.ownerUsesListasDePrecio()
		},
		/**
		 * Listas de precios cargadas en store (una opción de PDF por cada una).
		 *
		 * @returns {Array}
		 */
		price_types() {
			return this.$store.state.price_type ? this.$store.state.price_type.models : []
		},
		selected() {
			return this.$store.state.article.selected
		},
		filters() {
			return this.$store.state.article.filters
		},
		is_filtered() {
			return this.$store.state.article.is_filtered
		},
		article_table_pdf_profiles() {
			const models = this.$store.state.pdf_column_profile.models || []
			const filtered = []
			models.forEach(function (profile) {
				if (profile.model_name === 'article') {
					filtered.push(profile)
				}
			})
			return filtered
		},
	},
	created() {
		const self = this
		self.loading_profiles = true
		self.$store.dispatch('pdf_column_profile/getModels', { model_name: 'article' })
			.then(function () {
				self.loading_profiles = false
			})
			.catch(function () {
				self.loading_profiles = false
			})
		if (self.owner_uses_listas_de_precio && !self.price_types.length) {
			self.$store.dispatch('price_type/getModels')
				.then(function () {})
				.catch(function () {})
		}
	},
	methods: {
		/**
		 * Arma URL del PDF y abre en nueva pestaña.
		 *
		 * @param {Object}      profile        Perfil con id y name.
		 * @param {number|null} price_type_id  Lista de precios; query `price_type_id` si aplica.
		 * @return {void}
		 */
		open_table_pdf(profile, price_type_id) {
			if (!profile || !profile.id) {
				return
			}

			let has_selection = this.selected && this.selected.length > 0
			let has_filters = this.is_filtered && this.filters && this.filters.length > 0

			if (!has_selection && !has_filters) {
				this.$toast.error('Seleccioná artículos o aplicá un filtro en el listado', { duration: 4000 })
				return
			}

			let link = process.env.VUE_APP_API_URL + '/article/table-pdf?pdf_column_profile_id=' + profile.id
			let query = ''

			if (price_type_id) {
				query += '&price_type_id=' + price_type_id
			}

			if (has_selection) {
				let ids = []
				this.selected.forEach(function (article) {
					ids.push(article.id)
				})
				query += '&articles_id=' + ids.join('-')
			} else {
				let json_data = JSON.stringify(this.filters)
				query += '&filters=' + encodeURIComponent(json_data)
			}

			window.open(link + query)
		},
	},
}
</script>
