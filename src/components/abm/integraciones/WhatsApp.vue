<template>
	<div class="integraciones-whatsapp">
		<p class="integraciones-whatsapp__intro">
			Acá ves si WhatsApp está conectado y prendés o apagás el bot. Los datos técnicos de la conexión los carga el equipo de ComercioCity.
		</p>

		<connection-config></connection-config>
	</div>
</template>
<script>
/**
 * Solapa "WhatsApp" del ABM de Integraciones.
 *
 * 🔴 Reemplaza al ABM generico del modelo `whatsapp_bot_config`, que mostraba y dejaba editar
 * (y borrar) la clave de Kapso y el secreto del webhook. Ahora solo envuelve el mismo
 * componente de estado de la solapa "Conexión" del modulo de WhatsApp: no hay forma de ver,
 * crear, editar ni borrar credenciales desde acá.
 */
export default {
	name: 'AbmIntegracionesWhatsApp',
	components: {
		ConnectionConfig: () => import('@/components/whatsapp/config/ConnectionConfig'),
	},
	created() {
		// El ABM generico cargaba el modelo solo; con componente propio lo pedimos nosotros.
		this.$store.dispatch('whatsapp_bot_config/getModels')
	},
}
</script>
<style lang="sass">
.integraciones-whatsapp
	width: 100%
	max-width: 780px

	.integraciones-whatsapp__intro
		margin: 0 0 18px
		padding-top: 4px
		color: var(--color-text-secondary)
		font-size: 14px
</style>
