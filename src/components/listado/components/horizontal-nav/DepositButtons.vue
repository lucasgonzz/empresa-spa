<template>
	<b-dropdown
	right
	data-testid="menu-depositos"
	class="toolbar-btn--icono toolbar-btn--tinte-violeta"
	size="sm"
	:toggle-attrs="{ title: 'Depósitos', 'aria-label': 'Depósitos' }">
		<!-- Botón del dropdown solo-ícono (sin texto), con tooltip descriptivo -->
		<template #button-content>
			<i class="bi bi-hdd-stack" aria-hidden="true"></i>
		</template>
		<b-dropdown-item
		dusk="btn_deposit_movements"
		data-testid="menu-depositos-movimientos"
		@click="show_modal_movements">
			<i class="bi bi-arrow-left-right m-r-5"></i>
			Movimientos
		</b-dropdown-item>
		<b-dropdown-item
		data-testid="menu-depositos-sugerencias"
		@click="show_modal_sugerencias">
			<i class="bi bi-lightbulb m-r-5"></i>
			Sugerencias
		</b-dropdown-item>
	</b-dropdown>
</template>
<script>
import mostrador_acceso from '@/mixins/mostrador_acceso'

export default {
	mixins: [mostrador_acceso],
	methods: {
		show_modal_sugerencias() {
			// Desde la mision "modulo-ia-mostrador" (14/9/2026) las sugerencias de stock
			// viven en la carpeta Stock del mostrador (modulo IA) y la vista propia
			// /sugerencias-de-stock ya no existe. Pero /ia no es para cualquiera: exige
			// la extension asistente_ia Y ser el dueño (o el acceso maestro), y ese par
			// lo decide el mixin mostrador_acceso, no la extension
			// sugerencias_inteligentes como hasta el chequeo del 14/9. Quien no puede
			// entrar (un empleado, o un dueño sin asistente_ia) abre los modales
			// historicos, que stock-suggestion/Index.vue monta justo para esa persona.
			if (this.puede_entrar_al_mostrador) {
				if (this.$route.name != 'ia') {
					this.$router.push({name: 'ia'})
				}
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
