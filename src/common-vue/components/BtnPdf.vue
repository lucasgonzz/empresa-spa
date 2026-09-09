<template>
	<b-button
	v-if="model.id"
	@click="print"
	variant="outline-danger">
		<i class="icon-print"></i>
		Imprimir
	</b-button>
</template>
<script>
import { env } from '@/runtime_config'
export default {
	props: {
		model_name: String,
		model: Object,
	},
	methods: {
		print() {
            var link = env('VUE_APP_API_URL')+'/'+this.routeString(this.model_name)+'/pdf/'+this.model.id
            window.open(link)
		},
	}
}
</script>