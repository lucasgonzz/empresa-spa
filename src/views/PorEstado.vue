
<template>
	<div>
	    
	    <nav-component></nav-component>

	    <ventas></ventas>	
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/por-estado/components/NavComponent'),
		Ventas: () => import('@/components/por-estado/components/Ventas'),
	},
}
</script>