<template>
	<sale-print-buttons-common
	:sale="sale"
	model_name="sale"></sale-print-buttons-common>
</template>

<script>
import SalePrintButtonsCommon from '@/common-vue/sale-print-buttons/Index.vue'

export default {
	components: {
		SalePrintButtonsCommon,
	},
	props: {
		sale: Object,
	},
}
</script>