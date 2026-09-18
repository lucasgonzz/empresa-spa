<template>
	<!--
		Footer de la sidebar del panel, bien abajo como en Claude (S2, misión
		foto-sucursal-y-asistente-configurable): el modo de pensamiento activo del agente y el
		uso de tokens del mes contra el tope del plan, con aviso al acercarse y al llegar.

		Lee del store (ai_chat.mi_consumo, que trae GET api/mi-consumo-ia). Si el consumo es
		null —API viejo sin ese endpoint, o todavía sin pedir— NO se dibuja nada: degradación
		limpia, el panel funciona igual que antes.
	-->
	<div
	v-if="consumo"
	class="asistente-ia-footer">
		<div class="asistente-ia-footer__modo">
			<span class="asistente-ia-footer__modo-activo">
				<i
				:class="icono_pensamiento"
				aria-hidden="true"></i>
				<span>{{ texto_pensamiento }}</span>
			</span>
			<span
			v-if="nombre_plan"
			class="asistente-ia-footer__plan">{{ nombre_plan }}</span>
		</div>

		<div class="asistente-ia-footer__uso">
			<template v-if="tiene_tope">
				<div
				class="asistente-ia-footer__barra"
				role="progressbar"
				:aria-valuenow="porcentaje"
				aria-valuemin="0"
				aria-valuemax="100">
					<div
					class="asistente-ia-footer__barra-relleno"
					:class="clase_estado"
					:style="{ width: porcentaje + '%' }"></div>
				</div>
				<p
				class="asistente-ia-footer__texto"
				:class="clase_estado">{{ texto_uso }}</p>
			</template>
			<p
			v-else
			class="asistente-ia-footer__texto">{{ texto_uso_sin_tope }}</p>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		/**
		 * El consumo del store, o null (ahí el footer no se dibuja).
		 *
		 * @returns {Object|null}
		 */
		consumo() {
			return this.$store.state.ai_chat.mi_consumo
		},
		plan() {
			return this.consumo && this.consumo.plan ? this.consumo.plan : {}
		},
		consumo_mes() {
			return this.consumo && this.consumo.consumo_mes ? this.consumo.consumo_mes : {}
		},
		nombre_plan() {
			return this.plan.nombre || ''
		},
		/**
		 * El modo de pensamiento activo. Cualquier valor que no sea 'profundo' se lee como
		 * ágil (el default del sistema), así una respuesta sin la clave no rompe el footer.
		 *
		 * @returns {String}
		 */
		texto_pensamiento() {
			return this.consumo && this.consumo.pensamiento == 'profundo' ? 'Pensando a fondo' : 'Pensando ágil'
		},
		icono_pensamiento() {
			return this.consumo && this.consumo.pensamiento == 'profundo' ? 'bi bi-lightbulb' : 'bi bi-lightning-charge-fill'
		},
		/**
		 * Tope de tokens del mes. null o 0 = sin tope: ahí no hay barra ni corte (es la
		 * guarda de compatibilidad del contrato).
		 *
		 * @returns {Number}
		 */
		tope_tokens() {
			return Number(this.plan.tope_tokens_mensual) || 0
		},
		tiene_tope() {
			return this.tope_tokens > 0
		},
		tokens_usados() {
			return Number(this.consumo_mes.tokens) || 0
		},
		/**
		 * Porcentaje del tope consumido, acotado a 0..100 (aunque el backend informe que se
		 * pasó, la barra no se desborda).
		 *
		 * @returns {Number}
		 */
		porcentaje() {
			if (!this.tiene_tope) {
				return 0
			}
			let pct = Math.round(this.tokens_usados / this.tope_tokens * 100)
			return Math.min(Math.max(pct, 0), 100)
		},
		/**
		 * Estado del uso, que decide el color de la barra y del texto. Lo resuelve el
		 * backend (`supero` / `cerca`): la SPA no repite el umbral.
		 *
		 * @returns {String}
		 */
		clase_estado() {
			if (this.consumo && this.consumo.supero) {
				return 'es-supero'
			}
			if (this.consumo && this.consumo.cerca) {
				return 'es-cerca'
			}
			return ''
		},
		texto_uso() {
			if (this.consumo && this.consumo.supero) {
				return 'Llegaste al límite de tu plan este mes.'
			}
			let base = 'Usaste ' + this.formato_corto(this.tokens_usados) + ' de ' + this.formato_corto(this.tope_tokens)
			if (this.consumo && this.consumo.cerca) {
				return base + ' · te estás acercando al límite'
			}
			return base
		},
		texto_uso_sin_tope() {
			return 'Usaste ' + this.formato_corto(this.tokens_usados) + ' tokens este mes'
		},
	},
	methods: {
		/**
		 * Número compacto para el footer: 2.300.000 -> "2,3M", 320.000 -> "320k". Los topes
		 * de tokens son grandes y el texto de abajo es chico; el número largo con separadores
		 * no entra en la columna de la sidebar.
		 *
		 * @param {Number} valor
		 * @returns {String}
		 */
		formato_corto(valor) {
			let num = Number(valor) || 0
			if (num >= 1000000) {
				let millones = num / 1000000
				let texto = millones >= 10 ? String(Math.round(millones)) : millones.toFixed(1).replace(/\.0$/, '')
				return texto.replace('.', ',') + 'M'
			}
			if (num >= 1000) {
				return Math.round(num / 1000) + 'k'
			}
			return String(num)
		},
	},
}
</script>
<style lang="sass" scoped>
// Ámbar del aviso "te estás acercando al límite". Es un color de ESTADO, igual en los dos
// temas (como los acentos de reportes en flujo-caja/Index.vue), y el sistema no tiene un
// token de warning: por eso va como literal documentado y no como var(). El rojo de "llegaste
// al límite" y el azul normal sí salen de tokens del sistema.
$aviso-cerca: #d97706

.asistente-ia-footer
	flex-shrink: 0
	border-top: 1px solid var(--color-border, #dee2e6)
	padding: 10px 12px
	display: flex
	flex-direction: column
	gap: 8px

	&__modo
		display: flex
		align-items: center
		justify-content: space-between
		gap: 8px
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)

	&__modo-activo
		display: inline-flex
		align-items: center
		gap: 6px
		min-width: 0

		span
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap

	&__plan
		flex-shrink: 0
		font-weight: 600
		color: var(--color-text-primary, #212529)

	&__uso
		display: flex
		flex-direction: column
		gap: 5px

	&__barra
		height: 5px
		border-radius: 999px
		background: var(--bg-hover, #f1f3f5)
		overflow: hidden

	&__barra-relleno
		height: 100%
		border-radius: 999px
		background: var(--color-primary, #007bff)
		transition: width .3s ease

		&.es-cerca
			background: $aviso-cerca

		&.es-supero
			background: var(--btn-peligro-borde, #b4443f)

	&__texto
		margin: 0
		font-size: .74rem
		line-height: 1.3
		color: var(--color-text-secondary, #6c757d)

		// El texto acompaña el color de la barra en los dos estados de aviso.
		&.es-cerca
			color: $aviso-cerca

		&.es-supero
			color: var(--btn-peligro-texto, #9c3a36)

@media (prefers-reduced-motion: reduce)
	.asistente-ia-footer__barra-relleno
		transition: none
</style>
