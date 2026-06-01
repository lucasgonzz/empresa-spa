<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<dropdown-section-title
		title="Documentos PDF"
		icon="icon-pdf"></dropdown-section-title>

		<div
		v-if="hasExtencion('ventas_en_dolares')">
			<dropdown-option-item
			v-for="moneda in monedas"
			:key="moneda.id"
			icon="icon-pdf"
			@click="pdf(moneda)">
				PDF con imagenes ({{ moneda.name }})
			</dropdown-option-item>
		</div>
		<div
		v-else>
			<dropdown-option-item
			icon="icon-pdf"
			@click="pdf">
				Catalogo con imagenes
			</dropdown-option-item>

			<!-- <dropdown-option-item
			icon="icon-print"
			@click="listaPdf">
				Lista PDF
			</dropdown-option-item> -->
		</div>

	</div>
</template>
<script>
import alert_filtrados from '@/mixins/listado/alert_filtrados'
export default {
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	mixins: [alert_filtrados],
	computed: {
		selected() {
			return this.$store.state.article.selected 
		},
		filtered() {
			return this.$store.state.article.filtered 
		},
		monedas() {
			return this.$store.state.moneda.models 
		},
	},
	methods: {
		getIds() {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
			} else if (this.filtered.length) { 
				this.alert_filtrados()
				articles = this.filtered
			}
			articles.forEach(article => {
				ids.push(article.id)
			})
			return ids
		},
		pdf(moneda = null) {
			let ids = this.getIds()
			let link = process.env.VUE_APP_API_URL+'/article/pdf/'+ids.join('-') 
			
			if (moneda) {
				link += '/'+moneda.id
			}
			
			window.open(link)
		},
		listaPdf() {
			let ids = this.getIds()
			let link = process.env.VUE_APP_API_URL+'/article/list-pdf/'+ids.join('-') 
			window.open(link)
		},
	}
}
</script>
