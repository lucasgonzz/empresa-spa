<template>
	<b-dropdown
	right
	class="toolbar-btn--icono toolbar-btn--tinte-violeta"
	size="sm"
	:toggle-attrs="{ title: 'Depósitos', 'aria-label': 'Depósitos' }">
		<!-- Botón del dropdown solo-ícono (sin texto), con tooltip descriptivo -->
		<template #button-content>
			<i class="bi bi-hdd-stack" aria-hidden="true"></i>
		</template>
		<b-dropdown-item
		dusk="btn_deposit_movements"
		@click="show_modal_movements">
			<i class="bi bi-arrow-left-right m-r-5"></i>
			Movimientos
		</b-dropdown-item>
		<b-dropdown-item
		@click="show_modal_sugerencias">
			<i class="bi bi-lightbulb m-r-5"></i>
			Sugerencias
		</b-dropdown-item>
	</b-dropdown>
</template>
<script>
export default {
	methods: {
		show_modal_sugerencias() {
			// Con la extension de sugerencias inteligentes, el item lleva a la vista
			// propia (los modales apilados se retiran para quien la tiene); sin la
			// extension, se abre el modal historico tal cual siempre.
			if (this.hasExtencion('sugerencias_inteligentes')) {
				this.$router.push({name: 'sugerencias_stock'})
				return
			}
			this.$store.dispatch('stock_suggestion/getModels')
			this.$bvModal.show('stock-suggestions')
		},
		show_modal_movements() {
			this.$store.dispatch('deposit_movement/getModels')
			this.$bvModal.show('deposit-movements')
		}
	}
}
</script>