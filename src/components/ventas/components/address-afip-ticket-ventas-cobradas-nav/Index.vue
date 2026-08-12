<template>
	<div class="ventas-cabecera">
		<!-- Sucursales: sigue arriba, a todo el ancho, como estaba. -->
		<address-nav></address-nav>

		<!--
			Empleados y filtros COMPARTEN FILA (misión 32, 11/8/2026). Antes eran dos filas apiladas
			—los filtros arriba a la derecha y los empleados abajo—, y entre las dos se comían el alto
			de la cabecera sin necesidad.

			🔴 El `min-width: 0` del nav de empleados es lo que sostiene esta fila y no es decorativo:
			un ítem flex nunca baja de su ancho de contenido a menos que se lo declare. Sin eso, con
			seis o siete empleados cargados el nav se lleva la fila entera y los filtros vuelven a
			caer abajo, que es exactamente el estado del que venimos. El que se encoge es el nav
			—tiene su propio scroll horizontal para eso—, nunca los filtros.
		-->
		<div class="ventas-cabecera__fila">
			<employee-nav class="ventas-cabecera__nav"></employee-nav>
			<afip-ticket-nav class="ventas-cabecera__filtros"></afip-ticket-nav>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		AddressNav: () =>import('@/components/ventas/components/address-afip-ticket-ventas-cobradas-nav/AddressNav'),
		AfipTicketNav: () =>import('@/components/ventas/components/address-afip-ticket-ventas-cobradas-nav/AfipTicketNav'),
		EmployeeNav: () =>import('@/components/ventas/components/EmployeeNav'),
	},
}
</script>
<style lang="sass">
.ventas-cabecera

	&__fila
		display: flex
		flex-direction: row
		flex-wrap: nowrap
		align-items: center
		gap: var(--toolbar-group-gap)
		margin-bottom: 15px

	// El nav es el que cede espacio. Ver la nota del template sobre el min-width.
	&__nav
		flex: 1 1 auto
		min-width: 0

	// Los filtros conservan su ancho: son cuatro controles de medida fija y encogerlos los vuelve
	// ilegibles antes que util.
	&__filtros
		flex: 0 0 auto

	// En telefono la fila se parte: los filtros bajan y ocupan el ancho, pero SIGUEN VISIBLES.
	// Lucas pidio "que se colapsen y se muestren debajo", no que se escondan.
	@media screen and (max-width: 800px)
		&__fila
			flex-wrap: wrap

		&__nav
			flex: 1 1 100%

		&__filtros
			flex: 1 1 100%
</style>
