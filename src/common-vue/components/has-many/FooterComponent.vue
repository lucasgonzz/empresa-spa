<template>
	<div 
	class="j-end">
		<slot name="footer_buttons">
			<b-button
			@click="create(model_name)"
			variant="primary">
				Nuevo {{ singular(model_name) }}
			</b-button>
		</slot>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
}
</script>