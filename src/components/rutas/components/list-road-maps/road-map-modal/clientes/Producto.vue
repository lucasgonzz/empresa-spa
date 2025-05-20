<template>
	<div
	class="venta s-1">
		<p
		class="m-0">
			<strong>{{ producto.name }}</strong>
		</p>
		<hr>
		<p>
			Cantidad: {{ producto.amount }}
		</p>
	</div>
</template>
<script>
export default {
	props: {
		producto: Object,
	},
}
</script>
<style lang="sass">
.venta
	background: #FFF
	margin: 10px
	padding: 20px
	border-radius: 10px
	cursor: pointer

	@media screen and (max-width: 768px)
		width: 94%
	@media screen and (min-width: 768px)
		width: 300px
</style>