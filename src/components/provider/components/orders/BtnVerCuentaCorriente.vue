<template>
	<div
	class="btn-ver-cc-cont"
	v-if="model && model.provider_id">
		<!--
			Mision cuenta-corriente-proveedor-en-compras (30/9/2026). Va debajo del campo
			"Proveedor" del formulario de la compra, por el slot `prop_extras` de ModelForm (ver el
			comentario ahi y el consumidor en orders/Index.vue). Aparece apenas hay un proveedor
			elegido --tambien en una compra que todavia no se guardo-- y abre su cuenta corriente.

			Es `outline-primary` y `sm`, igual que el resto de los botones de accion secundaria de
			los formularios: es un atajo, no la accion principal de la compra.
		-->
		<b-button
		size="sm"
		variant="outline-primary"
		data-testid="btn-ver-cuenta-corriente-del-proveedor"
		:disabled="abriendo_cuenta_corriente"
		:title="'Abrir la cuenta corriente de este proveedor'"
		@click.stop="abrir">
			<i class="bi bi-journal-text"></i>
			Ver cuenta corriente
		</b-button>
	</div>
</template>
<script>
import abrir_cuenta_corriente_del_proveedor from '@/mixins/provider_order/abrir_cuenta_corriente_del_proveedor'
export default {
	mixins: [abrir_cuenta_corriente_del_proveedor],
	props: {
		// La compra del formulario (el `model` del scope de `prop_extras`).
		model: Object,
	},
	methods: {
		abrir() {
			this.abrir_cuenta_corriente_del_proveedor(this.model.provider_id, this.model.moneda_id)
		},
	},
}
</script>
<style scoped lang="sass">
.btn-ver-cc-cont
	margin-top: 8px

	// El icono `bi` no lleva el reset de los `icon-*`, pero el gap con el texto si lo necesita.
	i
		margin-right: 4px
</style>
