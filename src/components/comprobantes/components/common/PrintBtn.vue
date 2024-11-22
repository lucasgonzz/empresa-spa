<template>
	<b-button
	v-if="!model.afip_ticket"
	variant="danger"
	@click.stop="printPago(model)">
		<i class="icon-print"></i>
	</b-button>
</template>
<script>
import print from '@/mixins/current_acounts/print' 
export default {
	mixins: [print],
	props: {
		model: Object,
	},
}
</script>