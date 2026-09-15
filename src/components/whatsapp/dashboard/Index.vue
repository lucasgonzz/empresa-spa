<template>
	<div
	class="whatsapp-dashboard"
	data-tour="whatsapp.tablero">
		<div
		v-for="tarjeta in tarjetas"
		:key="tarjeta.key"
		class="whatsapp-dashboard__tarjeta"
		:class="tarjeta.clase"
		:data-tour="tarjeta.tour">
			<i
			class="whatsapp-dashboard__icono bi"
			:class="tarjeta.icono"></i>
			<div class="whatsapp-dashboard__contenido">
				<span class="whatsapp-dashboard__valor">{{ tarjeta.valor }}</span>
				<span class="whatsapp-dashboard__etiqueta">{{ tarjeta.etiqueta }}</span>
			</div>
		</div>
	</div>
</template>
<script>
/**
 * Tablero fijo del módulo de WhatsApp (misión whatsapp-tablero-clientes, 14/9/2026): tres
 * tarjetas con el estado de la bandeja completa, a la derecha de la lista de chats.
 *
 * Los tres números salen de getters sobre `state.whatsapp_chat.chats` (el mismo array que ya
 * pinta la bandeja) y no de un endpoint propio: `estado_pendiente` ya viaja por chat desde el
 * índice y se mantiene al día en vivo por el broadcast `WhatsappChatUpdated`
 * (`WhatsappChatHelper::attach_estados_pendientes()` / `WhatsappChat::estado_pendiente()` en
 * empresa-api), así que el tablero queda sincronizado solo, sin pedir nada aparte.
 */
export default {
	computed: {
		tarjetas() {
			return [
				{
					key: 'sin_responder',
					icono: 'bi-exclamation-circle-fill',
					etiqueta: 'Sin responder',
					valor: this.$store.getters['whatsapp_chat/chats_sin_responder_count'],
					clase: 'whatsapp-dashboard__tarjeta--sin-responder',
					tour: 'whatsapp.tablero_sin_responder',
				},
				{
					key: 'esperando_aprobacion',
					icono: 'bi-hourglass-split',
					etiqueta: 'Esperando aprobación',
					valor: this.$store.getters['whatsapp_chat/chats_esperando_aprobacion_count'],
					clase: 'whatsapp-dashboard__tarjeta--pendiente',
					tour: 'whatsapp.tablero_esperando_aprobacion',
				},
				{
					key: 'hoy',
					icono: 'bi-chat-dots-fill',
					etiqueta: 'Conversaciones de hoy',
					valor: this.$store.getters['whatsapp_chat/chats_hoy_count'],
					clase: 'whatsapp-dashboard__tarjeta--hoy',
					tour: 'whatsapp.tablero_conversaciones_hoy',
				},
			]
		},
	},
}
</script>
<style lang="sass">
.whatsapp-dashboard
	height: 100%
	// 🔴 `--bg-section` y no `--wa-panel` (= `--bg-card`, blanco en modo claro): el tablero
	// vivía con el mismo fondo que la bandeja de chats de al lado y las dos quedaban
	// indistinguibles. `--bg-section` es el token que ya usa el resto del sistema para una
	// superficie "un escalón por debajo" de una tarjeta blanca (headers de tabla, paneles
	// secundarios) — mismo vocabulario, no un color inventado. Las tarjetas de adentro
	// (`--bg-hover`, con su propio borde) siguen leyéndose por encima de este fondo en los dos
	// temas, sin tocar nada más.
	background: var(--bg-section)
	padding: 24px
	display: grid
	grid-template-columns: repeat(3, 1fr)
	gap: 16px
	align-content: start
	&__tarjeta
		display: flex
		align-items: center
		gap: 14px
		padding: 18px
		border-radius: 12px
		background: var(--bg-hover)
		border: 1px solid var(--wa-borde)
		// Franja de color a la izquierda: mismo lenguaje que el resaltado de fila de ChatRow.vue,
		// para que la tarjeta y las filas que cuenta se lean como una sola cosa.
		border-left: 4px solid transparent
	&__icono
		font-size: 1.6rem
		flex-shrink: 0
	&__contenido
		display: flex
		flex-direction: column
		min-width: 0
	&__valor
		font-size: 1.7rem
		font-weight: 700
		line-height: 1.1
		color: var(--wa-texto)
	&__etiqueta
		font-size: .8rem
		color: var(--color-text-secondary)
		white-space: normal
	// --- Sin responder: rojo ---------------------------------------------------------------
	// Mismo par bg/borde que el resaltado de fila de ChatRow.vue: la tarjeta y las filas que
	// cuenta se leen como una sola cosa, no como dos vocabularios de color distintos.
	&__tarjeta--sin-responder
		background: var(--wa-sin-responder-bg)
		border-left-color: var(--wa-sin-responder-borde)
		.whatsapp-dashboard__icono
			color: var(--wa-sin-responder-borde)
		.whatsapp-dashboard__valor
			color: var(--wa-sin-responder-texto)
	// --- Esperando aprobación: amarillo -----------------------------------------------------
	&__tarjeta--pendiente
		background: var(--wa-pendiente-bg)
		border-left-color: var(--wa-pendiente-borde)
		.whatsapp-dashboard__icono
			color: var(--wa-pendiente-borde)
		.whatsapp-dashboard__valor
			color: var(--wa-pendiente-texto)
	// --- Conversaciones de hoy: verde de la marca -------------------------------------------
	// Sin token de fondo propio (no hace falta uno más): mismo velo translúcido que ya usa
	// ChatRow.vue para la fila activa, sobre --wa-verde.
	&__tarjeta--hoy
		background: rgba(37, 211, 102, .12)
		background: color-mix(in srgb, var(--wa-verde) 12%, transparent)
		border-left-color: var(--wa-verde)
		.whatsapp-dashboard__icono
			color: var(--wa-verde)
		.whatsapp-dashboard__valor
			color: var(--wa-texto)

// Tablet (768-1024px, ver CLAUDE.md — regla de los tres anchos): todavía entran las tres en
// fila, solo se acota el padding para que no se aprieten contra la lista de chats.
@media screen and (max-width: 1024px)
	.whatsapp-dashboard
		padding: 16px
		gap: 10px
		&__tarjeta
			padding: 14px
			gap: 10px
		&__valor
			font-size: 1.4rem

// Teléfono (<768px): la vista se apila (ver views/Whatsapp.vue) y el tablero pasa a ocupar el
// ancho completo arriba de la lista. Tres tarjetas chicas en fila siguen entrando: son número +
// etiqueta corta, no hace falta apilarlas también a ellas.
@media screen and (max-width: 767px)
	.whatsapp-dashboard
		height: auto
		grid-template-columns: repeat(3, 1fr)
		padding: 12px
		gap: 8px
		&__tarjeta
			flex-direction: column
			text-align: center
			padding: 10px 6px
			gap: 4px
		&__icono
			font-size: 1.25rem
		&__valor
			font-size: 1.15rem
		&__etiqueta
			font-size: .68rem
</style>
