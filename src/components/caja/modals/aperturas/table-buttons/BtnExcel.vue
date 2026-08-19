<template>
	<btn-accion
	icono="bi bi-file-earmark-spreadsheet"
	texto="Excel"
	@clicked="excel"></btn-accion>
</template>
<script>
export default {
	props: {
		apertura_caja: Object,
	},
	components: {
		BtnAccion: () => import('@/components/caja/components/table-buttons/BtnAccion'),
	},
	methods: {
		excel() {
            let link = process.env.VUE_APP_API_URL+'/apertura-caja/excel/export/'+this.apertura_caja.id
            window.open(link)
		}
	}
}
</script>
