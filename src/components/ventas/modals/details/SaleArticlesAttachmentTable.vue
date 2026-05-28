<template>
<div class="sale-articles-attachment-table m-t-10">

	<b-spinner
	v-if="loading_attachments"
	small
	class="m-r-5"></b-spinner>

	<!-- Tabla configurable (mismo sistema que pedidos a proveedor) + adjuntos en columna izquierda -->
	<belongs-to-many-table
	v-if="sale && articles_prop"
	:prop="articles_prop"
	:model="sale"
	parent_model_name="sale"
	:show_btn_remove_belongs_to_many="false">
		<template #table_left_options="{ model }">
			<item-attachments
			v-if="hasExtencion('adjuntar_archivos_en_vantas')"
			:item="model"
			:sale-id="sale.id"
			:all-sale-attachments="all_sale_attachments"
			@attachment-added="onAttachmentAdded"
			@attachment-removed="onAttachmentRemoved"></item-attachments>
		</template>
	</belongs-to-many-table>

	<p
	v-else-if="!sale || !sale.articles || !sale.articles.length"
	class="text-muted">
		Sin artículos.
	</p>

</div>
</template>
<script>
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

export default {
	components: {
		BelongsToManyTable: () => import('@/common-vue/components/model/form/BelongsToManyTable'),
		ItemAttachments: () => import('@/components/vender/components/remito/table-slots/ItemAttachments'),
	},
	props: {
		sale: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			all_sale_attachments: [],
			loading_attachments: false,
		}
	},
	computed: {
		/*
		 * Propiedad articles del modelo sale (belongs_to_many) para BelongsToManyTable.
		 */
		articles_prop() {
			const props = this.modelPropertiesFromName('sale')
			let articles_prop = null
			props.forEach(prop => {
				if (prop.key == 'articles') {
					articles_prop = prop
				}
			})
			return articles_prop
		},
	},
	watch: {
		'sale.id': {
			immediate: true,
			handler(sale_id) {
				if (sale_id) {
					this.loadAttachments(sale_id)
				}
			},
		},
	},
	methods: {
		loadAttachments(sale_id) {
			this.loading_attachments = true
			axios.get('/api/sale-article-attachment/by-sale/' + sale_id)
				.then(res => {
					this.all_sale_attachments = res.data.models
					this.loading_attachments = false
				})
				.catch(() => {
					this.loading_attachments = false
				})
		},
		onAttachmentAdded(att) {
			this.all_sale_attachments.push(att)
		},
		onAttachmentRemoved(id) {
			this.all_sale_attachments = this.all_sale_attachments.filter(a => a.id !== id)
		},
	},
}
</script>
<style lang="sass">
.sale-articles-attachment-table
	overflow-x: auto
</style>
