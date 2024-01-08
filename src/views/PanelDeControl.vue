<template>
	<div>
		<nav-component></nav-component>

		<proveedores></proveedores>	
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/panel-control/components/Nav'),
		Proveedores: () => import('@/components/panel-control/components/proveedores/Index'),
	},
}
</script>