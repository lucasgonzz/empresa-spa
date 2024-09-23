<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
export default {
	props: ['model_name'],
	extends: Bar,
	watch: {
		models() {
			this.setChart()
		}, 
	},
	computed: { 
		models() {  
			let models = this.$store.state.chart.models
			console.log(models)
			if (typeof models[this.model_name] != 'undefined') {
				console.log('this.model_name') 
				console.log(this.model_name)
				return models[this.model_name]
			} else {
				console.log('no enro con '+this.model_name)
			}
			return []
		},
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {
			let labels = []
			let data = []
			console.log(this.models)
			this.models.forEach(model => {
				labels.push(model.name)
				data.push(model.amount)
			})		
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Unidades vendidas',
						backgroundColor: '#28a745',
						data: data,
					}
				],
			}, {
				maintainAspectRatio: false
			})
		},
	},
}
</script>