<template>
	<div 
	class="card-component p-0 s-1 b-r-5 animate__animated animate__fadeIn">
		<b-skeleton type="img" height="300px" class="b-r-5"></b-skeleton>
		<div class="p-15">
			<b-skeleton width="100%" class="m-b-20"></b-skeleton>
			<b-skeleton 
			v-for="i in propertiesToShow(properties, false).length"
			:key="i"
			width="70%" 
			class="m-b-20"></b-skeleton>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		properties: Array,
	}
}
</script>