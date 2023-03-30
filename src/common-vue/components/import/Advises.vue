<template>
	<div
	class="m-t-15"
	v-if="advises.length">
		ADVERTENCIAS
		<p
		v-for="(advise, i) in advises"
		:key="i">
			{{ advise }}
		</p>
	</div>
</template>
<script>
export default {
	props: {
		advises: Array,
	},
}
</script>