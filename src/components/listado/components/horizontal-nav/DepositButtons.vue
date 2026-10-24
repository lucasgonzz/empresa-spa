<template>
	<!--
		Misión sucursal-siempre (23/10/2026, D1): el menú de depósitos aparece desde la SEGUNDA
		sucursal. Hasta acá se veía siempre, también sin sucursales, y sus dos items abrían modales que
		solo se montan con sucursales (deposit-movements/Index.vue y stock-suggestion/Index.vue): el
		clic no hacía nada. El v-if va en la raíz para no dejar un item flex vacío en la barra (ver
		horizontal-nav/Index.vue).
	-->
	<b-dropdown
	v-if="muestra_sucursales"
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
		<!--
			Sugerencias de stock: parte de "Agentes de IA" (agentes_ia) desde el 22/10/2026. Sin la
			extension el item no se ofrece (el backend contestaria 403). hasExtencion devuelve
			undefined mientras auth/me no resolvio: se lee como "no" y no parpadea.
		-->
		<b-dropdown-item
		v-if="mostrador_tiene_extension"
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
			// la extension agentes_ia Y ser el dueño (o el acceso maestro), y ese par
			// lo decide el mixin mostrador_acceso, no solo la extension
			// (hasta el chequeo del 14/9 alcanzaba con una extension de sugerencias suelta,
			// que desde el 22/10/2026 es parte de agentes_ia). Quien no puede
			// entrar (un empleado, o un dueño sin agentes_ia) abre los modales
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
