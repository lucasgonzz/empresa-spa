<template>
	<div class="integrations-section">
		<hr>

		<h5 class="m-b-5">Integraciones</h5>
		<p class="text-muted m-b-15">
			Conectá tu propia cuenta de Mercado Pago y de Zippin para cobrar y ofrecer envíos desde tu tienda online.
		</p>

		<b-row>
			<b-col
			md="6"
			class="m-b-15">
				<mercado-pago-card :model="model"></mercado-pago-card>
			</b-col>
			<b-col
			md="6"
			class="m-b-15">
				<zippin-card :model="model"></zippin-card>
			</b-col>
		</b-row>
	</div>
</template>
<script>
/**
 * Orquestador de la sección "Integraciones" dentro de Configuración online (prompt 600).
 *
 * Responsabilidad única: armar el layout de las dos tarjetas de integración (Mercado Pago
 * y Zippin) y pasarles el model de online_configuration ya cargado. Toda la lógica de
 * estado, conexión y desconexión vive en cada tarjeta (MercadoPagoCard, ZippinCard).
 */
export default {
	name: 'IntegrationsIndex',
	components: {
		MercadoPagoCard: () => import('@/components/online/config/integrations/MercadoPagoCard'),
		ZippinCard: () => import('@/components/online/config/integrations/ZippinCard'),
	},
	props: {
		// Modelo online_configuration ya cargado, con el estado de cada integración
		// (mp_enabled, mp_connected, mp_token_expires_at, zippin_enabled, zippin_connected, zippin_token_expires_at, etc.)
		model: {
			type: Object,
			required: true,
		},
	},
}
</script>
<style lang="sass">
.integrations-section
	width: 100%
// Estilos base compartidos por ambas tarjetas de integración (Mercado Pago y Zippin)
.integration-card
	height: 100%
	.integration-card__actions
		display: flex
		gap: 10px
</style>
