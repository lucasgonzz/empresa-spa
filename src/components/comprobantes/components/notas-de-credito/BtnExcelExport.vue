<template>
	<b-button
	v-if="is_admin"
	@click="export_excel"
	class="m-r-20"
	variant="outline-success"
	size="sm">
		<i class="icon-download"></i>
		Excel
	</b-button>
</template>

<script>
import generals from '@/common-vue/mixins/generals'

/**
 * Botón de exportación Excel para el listado de notas de crédito.
 * Usa las mismas fechas que el store `nota_credito` (listado por rango).
 */
export default {
	mixins: [generals],
	computed: {
		/** Fecha inicial del rango activo en el listado. */
		from_date() {
			return this.$store.state.nota_credito.from_date
		},
		/** Fecha final del rango; vacío implica solo el día from_date en backend. */
		until_date() {
			return this.$store.state.nota_credito.until_date
		},
	},
	methods: {
		/**
		 * Abre la URL de exportación web (misma sesión que el resto de exports Excel).
		 * Si hay `until_date`, se agrega al path como en `__base_store` para el GET del listado.
		 */
		export_excel() {
			let link = process.env.VUE_APP_API_URL + '/nota-credito/excel/export/' + this.from_date
			if (this.until_date != '') {
				link += '/' + this.until_date
			}
			window.open(link)
		},
	},
}
</script>
