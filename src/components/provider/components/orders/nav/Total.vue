<template>
	<h4>
		<strong>
			Total: {{ price(total) }}
		</strong>
	</h4>
</template>
<script>
import models_to_show from '@/mixins/provider_order/models_to_show'
export default {
	mixins: [models_to_show],	
}
</script>