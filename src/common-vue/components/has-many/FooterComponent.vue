<template>
	<div 
	class="j-end">
		<b-button
		@click="create(model_name)"
		variant="primary">
			Nuevo {{ singular(model_name) }}
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
}
</script>