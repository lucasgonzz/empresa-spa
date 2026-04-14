<template>
<div class="sale-articles-attachment-table m-t-10">

	<b-spinner
	v-if="loading_attachments"
	small
	class="m-r-5"></b-spinner>

	<b-table
	v-if="sale.articles && sale.articles.length"
	:items="sale.articles"
	:fields="fields"
	responsive
	hover
	head-variant="dark"
	small>

		<template #cell(attachments)="data">
			<item-attachments
			:item="data.item"
			:sale-id="sale.id"
			:all-sale-attachments="all_sale_attachments"
			@attachment-added="onAttachmentAdded"
			@attachment-removed="onAttachmentRemoved"></item-attachments>
		</template>

		<template #cell(name)="data">
			<span>{{ data.item.name }}</span>
			<small
			v-if="data.item.pivot && data.item.pivot.variant_description"
			class="text-muted d-block">{{ data.item.pivot.variant_description }}</small>
		</template>

		<template #cell(amount)="data">
			{{ data.item.pivot ? data.item.pivot.amount : '' }}
		</template>

		<template #cell(price)="data">
			{{ data.item.pivot ? price(data.item.pivot.price) : '' }}
		</template>

		<template #cell(total)="data">
			<strong>{{ total_item(data.item) }}</strong>
		</template>

	</b-table>

	<p
	v-else
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
		fields() {
			const cols = []
			if (this.hasExtencion('adjuntar_archivos_en_vantas')) {
				cols.push({ key: 'attachments', label: 'Adj.' })
			}
			cols.push(
				{ key: 'name', label: 'Nombre' },
				{ key: 'amount', label: 'Cant.' },
				{ key: 'price', label: 'Precio' },
				{ key: 'total', label: 'Total' },
			)
			return cols
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
		price(val) {
			if (!val && val !== 0) return ''
			return '$' + Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2 })
		},
		total_item(item) {
			if (!item.pivot) return ''
			const p = Number(item.pivot.price || 0)
			const a = Number(item.pivot.amount || 0)
			const d = Number(item.pivot.discount || 0)
			const subtotal = p * a
			const total = subtotal - (subtotal * d / 100)
			return this.price(total)
		},
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
