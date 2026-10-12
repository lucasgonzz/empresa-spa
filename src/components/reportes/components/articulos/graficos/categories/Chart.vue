<script>
import { Bar } from 'vue-chartjs'
import chart_datalabels from '@/mixins/reportes/chart_datalabels'
import grafico_articulos from '@/components/reportes/components/articulos/graficos/grafico_articulos'
export default {
	extends: Bar,
	mixins: [chart_datalabels, grafico_articulos],
	computed: { 
		categories() {  
			return this.$store.state.reportes.article_purchase.categories
		},
		loading() {  
			return this.$store.state.reportes.article_purchase.loading
		},
	},
	watch: {
		categories() {
			this.setChart()
		},
		loading() {
			this.setChart()
		},
	},
	mounted() {
		this.setChart()
	},
	methods: {
		/*
			Las barras (12 primeras + «Otros»), los dos ejes y el formato de etiquetas y tooltip son
			los mismos que los del grafico de proveedores: viven en grafico_articulos.js.
		*/
		setChart() {	
			this.render_grafico_articulos(this.categories, 'category_name')
		},
	},
}
</script>
