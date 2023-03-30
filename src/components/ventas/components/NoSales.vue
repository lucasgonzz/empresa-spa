<template>
<b-row v-show="!is_loading && sales.length == 0 && !showing_statistics">
	<b-col>
		<p class="not-sales text-secondary">
			<i class="icon-not"></i>
			<strong>
				No hay ventas
			</strong>
		</p>
	</b-col>
</b-row>
</template>
<script>
export default {
	props: ['is_loading', 'sales', 'showing_statistics']
}
</script>
<style scoped>
.not-sales {
	text-align: center;
	font-size: 2rem;
}

.not-sales i {
	font-size: 5rem;
}

.not-sales strong {
	margin-top: -30px;
	display: block;
}
</style>