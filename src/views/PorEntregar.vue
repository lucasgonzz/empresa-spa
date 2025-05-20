<template>
	<div>
	    
	    <nav-component></nav-component>

	    <ventas></ventas>	
	    <road-maps></road-maps>	
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/por-entregar/components/NavComponent'),
		Ventas: () => import('@/components/por-entregar/components/ventas/Index'),
		RoadMaps: () => import('@/components/por-entregar/components/road-maps/Index'),
	},
}
</script>