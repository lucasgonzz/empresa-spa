<template>
	<div>
		asdS
		<Bar
		id="my-chart-id"
		:options="chartOptions"
		:data="chartData"/>
	</div>
</template>
<script>
// import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

// ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

// import { Chart, registerables } from 'chart.js';
import {chart} from 'chart.js' 
import { Bar } from 'vue-chartjs'
// Chart.register(...registerables);
 
export default {
	name: 'BarChart',
	components: { Bar },
	props: {
		model_name: String,
	},
	data() {
		return {
			chartOptions: {
				responsive: true
			}
		}
	},
	computed: {
		models() {  
			let models = this.$store.state.chart.models
			console.log('models:')
			console.log(models)
			console.log('model_name:')
			console.log(this.model_name)
			if (typeof models[this.model_name] != 'undefined') {
				console.log(models[this.model_name])
				return models[this.model_name]
			} else {
				console.log('no enro con '+this.model_name)
			}
			return []
		},
		chartData() {
			let labels = []
			let data = []
			console.log(this.models)
			this.models.forEach(model => {
				labels.push(model.name)
				data.push(model.amount)
			})		
			let datasets = [ { data } ]
			console.log('return')
			console.log({
				labels,
				datasets
			})
			return {
				labels: labels,
				datasets: datasets
			}
			// this.renderChart({
			// 	labels: labels,
			// 	datasets: [
			// 		{
			// 			label: 'Unidades vendidas',
			// 			backgroundColor: '#28a745',
			// 			data: data,
			// 		}
				// ],
		}
	}
}
</script>