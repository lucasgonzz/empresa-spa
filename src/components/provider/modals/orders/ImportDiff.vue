<template>
<b-modal
id="import-diff-provider-order"
title="Comparación pedido vs recibido"
size="lg"
hide-footer>
	<div v-if="importDiff.length">

		<div class="mb-3 d-flex flex-wrap" style="gap: 8px">
			<b-badge variant="success" class="p-2">
				<i class="icon-check"></i> Completo: {{ count('completo') }}
			</b-badge>
			<b-badge variant="warning" class="p-2">
				<i class="icon-warning"></i> Parcial: {{ count('parcial') }}
			</b-badge>
			<b-badge variant="danger" class="p-2">
				<i class="icon-close"></i> No recibido: {{ count('no_recibido') }}
			</b-badge>
			<b-badge variant="info" class="p-2">
				<i class="icon-arrow-up"></i> Exceso: {{ count('exceso') }}
			</b-badge>
		</div>

		<b-table
		:items="importDiff"
		:fields="fields"
		striped
		hover
		small
		:tbody-tr-class="rowClass">
			<template #cell(diff)="data">
				<span :class="diffClass(data.item)">
					{{ data.item.diff > 0 ? '+' : '' }}{{ data.item.diff }}
				</span>
			</template>
			<template #cell(status)="data">
				<b-badge :variant="badgeVariant(data.item.status)">
					{{ statusLabel(data.item.status) }}
				</b-badge>
			</template>
		</b-table>
	</div>
	<p v-else class="text-muted">No hay artículos para comparar.</p>
</b-modal>
</template>
<script>
export default {
	computed: {
		importDiff() {
			return this.$store.state.provider_order.import_diff || []
		},
		fields() {
			return [
				{ key: 'name',     label: 'Artículo' },
				{ key: 'pedida',   label: 'Pedida' },
				{ key: 'recibida', label: 'Recibida' },
				{ key: 'diff',     label: 'Diferencia' },
				{ key: 'status',   label: 'Estado' },
			]
		},
	},
	methods: {
		count(status) {
			return this.importDiff.filter(item => item.status === status).length
		},
		rowClass(item) {
			if (!item) return ''
			const map = {
				completo:    'table-success',
				parcial:     'table-warning',
				no_recibido: 'table-danger',
				exceso:      'table-info',
			}
			return map[item.status] || ''
		},
		badgeVariant(status) {
			const map = {
				completo:    'success',
				parcial:     'warning',
				no_recibido: 'danger',
				exceso:      'info',
			}
			return map[status] || 'secondary'
		},
		statusLabel(status) {
			const map = {
				completo:    'Completo',
				parcial:     'Parcial',
				no_recibido: 'No recibido',
				exceso:      'Exceso',
			}
			return map[status] || status
		},
		diffClass(item) {
			if (item.diff === 0) return 'text-success'
			if (item.diff > 0)  return 'text-info'
			return 'text-danger'
		},
	},
}
</script>
