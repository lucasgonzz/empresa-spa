<template>
	<div
	class="hojas-de-ruta">
		<div 
		v-for="i in 10"
		class="road-map-card">
			<div class="w-100">
				<b-skeleton-img></b-skeleton-img>
			</div>
		</div>
	</div>
</template>
