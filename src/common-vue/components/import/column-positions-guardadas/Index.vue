<template>
	<div
	class="j-start align-end m-b-15">
		<select-column-position></select-column-position>

		<btn-guardar
		:start_row="start_row"
		:positions_seted="positions_seted"
		:columns="columns"></btn-guardar>
	</div>
</template>
<script>
export default {
	props: {
		columns: Array,
		start_row: Number,
		positions_seted: Boolean,
	},
	components: {
		SelectColumnPosition: () => import('@/common-vue/components/import/column-positions-guardadas/SelectColumnPosition'),
		BtnGuardar: () => import('@/common-vue/components/import/column-positions-guardadas/BtnGuardar'),
	},
}
</script>