<template>
	<div class="prueba-confirmar-importacion">
		<p class="prueba-confirmar-importacion__introduccion">
			Al importar tus datos, el sistema elimina los datos de ejemplo.
		</p>
		<div class="prueba-modal__bloque prueba-modal__bloque--aviso">
			<i class="bi bi-trash3 prueba-modal__icono" aria-hidden="true"></i>
			<div>
				<strong>Se elimina</strong>
				<p>Artículos, clientes, proveedores y movimientos de ejemplo. También las ventas, presupuestos y cobros que hiciste con esos datos para probar.</p>
			</div>
		</div>
		<div class="prueba-modal__bloque prueba-modal__bloque--seguro">
			<i class="bi bi-shield-check prueba-modal__icono" aria-hidden="true"></i>
			<div>
				<strong>Se conserva</strong>
				<p>Los artículos, clientes y proveedores que cargaste con tus propios datos, junto con sus operaciones.</p>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'PruebaConfirmarImportacion',
}
</script>

<style lang="sass" src="./modales.sass"></style>

<style lang="sass" scoped>
.prueba-confirmar-importacion
	display: grid
	gap: 0.75rem

.prueba-confirmar-importacion__introduccion
	margin: 0
</style>
