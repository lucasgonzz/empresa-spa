<template>
	<display
	class="m-b-15"
	:model_name="model_name">
		<template v-slot:default="props">
			<slot :model="props.model"></slot>
		</template>
	</display>
</template>
<script>
import Display from '@/common-vue/components/display/Index'
export default {
	props: {
		model_name: String,
	},
	components: {
		Display,
	},
}
</script>