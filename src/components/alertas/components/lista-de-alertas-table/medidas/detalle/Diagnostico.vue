<template>
<div
class="med-diag"
:data-testid="'medidas-panel-diagnostico-' + item_id">

	<p
	v-if="!planes.length"
	class="med-diag__texto">
		No quedó registrado qué se probó con este artículo.
	</p>

	<div
	v-for="(plan, indice) in planes"
	:key="'plan-' + indice"
	class="med-diag__plan"
	:class="{ 'med-diag__plan--sin-usar': !plan.usado }"
	:data-criterio="plan.criterio"
	:data-usado="plan.usado ? 1 : 0">

		<div class="med-diag__cabecera">
			<span class="med-diag__nombre">{{ nombre_del_plan(plan) }}</span>
			<span
			v-if="plan.consulta"
			class="med-diag__consulta">
				{{ plan.consulta }}
			</span>
		</div>

		<!--
			Un plan que no se usó también se muestra, con el motivo: es la única forma de ver por qué no
			se buscó por código de barras (por ejemplo, porque no era un código real).
		-->
		<p
		v-if="!plan.usado"
		class="med-diag__texto"
		:data-testid="'medidas-plan-no-usado-' + item_id + '-' + indice">
			{{ plan.motivo_no_usado || 'No se buscó.' }}
		</p>

		<template v-else>
			<p class="med-diag__numeros">
				{{ consultas(plan) }} · {{ resultados(plan) }}
			</p>
			<p
			v-if="plan.error"
			class="med-diag__error">
				{{ plan.error }}
			</p>
			<p
			v-if="plan.resumen"
			class="med-diag__texto">
				{{ plan.resumen }}
			</p>
			<p
			v-if="plan.resultado"
			class="med-diag__texto"
			:data-testid="'medidas-plan-resultado-' + item_id + '-' + indice">
				{{ resultado_del_plan(plan.resultado) }}
			</p>

			<!--
				Lo que dijo la IA al leer las páginas: de qué producto le parecían y, por cada medida, si
				pasó la validación o por qué no. Un plan que no llegó a llamar a la IA no tiene este bloque.
			-->
			<div
			v-if="plan.ia"
			class="med-diag__ia"
			:data-testid="'medidas-plan-ia-' + item_id + '-' + indice">
				<p
				v-if="!plan.ia.respondio"
				class="med-diag__error">
					La IA no respondió{{ plan.ia.error ? ': ' + plan.ia.error : '.' }}
				</p>
				<p
				v-else-if="plan.ia.match"
				class="med-diag__texto">
					La IA vio {{ coincidencia_de_la_ia(plan.ia.match) }}.
				</p>
				<p
				v-if="plan.ia.nota"
				class="med-diag__texto med-diag__texto--ia">
					{{ plan.ia.nota }}
				</p>
				<ul
				v-if="plan.ia.campos.length"
				class="med-diag__campos">
					<li
					v-for="campo in plan.ia.campos"
					:key="campo.clave"
					class="med-diag__campo">
						<span
						class="med-etiqueta"
						:class="'med-etiqueta--' + (campo.ok ? 'ok' : 'neutro')">
							{{ campo.etiqueta }}: {{ campo.ok ? 'válida' : 'sin valor' }}
						</span>
						<span
						v-if="!campo.ok && campo.motivo"
						class="med-diag__motivo-pagina">
							{{ campo.motivo }}
						</span>
					</li>
				</ul>
			</div>

			<!--
				Cada página con lo que pasó con ella. El link abre la página en otra pestaña (solo si es
				una dirección web): así se puede juzgar el contexto.
			-->
			<ul
			v-if="plan.paginas.length"
			class="med-diag__paginas">
				<li
				v-for="(pagina, posicion) in plan.paginas"
				:key="'pagina-' + indice + '-' + posicion"
				class="med-diag__pagina"
				:data-leida="pagina.leida ? 1 : 0">
					<a
					v-if="pagina.url"
					class="med-diag__link"
					:href="pagina.url"
					:title="pagina.titulo || pagina.url"
					target="_blank"
					rel="noopener noreferrer">
						{{ pagina.dominio || pagina.url }}
						<i
						class="bi bi-box-arrow-up-right"
						aria-hidden="true"></i>
					</a>
					<span
					v-else
					class="med-diag__link med-diag__link--apagado">
						{{ pagina.dominio || pagina.titulo || 'Página sin dirección' }}
					</span>
					<span
					class="med-etiqueta"
					:class="'med-etiqueta--' + (pagina.leida ? 'neutro' : 'aviso')">
						{{ pagina.leida ? 'Se leyó' : 'No se leyó' }}
					</span>
					<span
					v-if="pagina.motivo"
					class="med-diag__motivo-pagina">
						{{ motivo_de_descarte(pagina.motivo) }}
					</span>
				</li>
			</ul>
		</template>

	</div>
</div>
</template>
<script>
import { CRITERIOS, MOTIVOS_DE_DESCARTE, RESULTADOS_DE_PLAN, COINCIDENCIAS_DE_LA_IA, texto_de, entero_es } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * Qué se probó con un artículo que quedó sin datos: un bloque por plan de búsqueda (código de
 * barras, código de proveedor y nombre, en ese orden), con la consulta, cuántas consultas gastó,
 * cuántos resultados trajo, el resumen y las páginas que se leyeron con el motivo por el que se
 * descartó cada una.
 *
 * Es el reemplazo, para medidas, del diagnóstico por candidatas de Imágenes: acá lo que se descarta
 * son páginas, no imágenes. Los datos llegan normalizados (`normalizar_diagnostico`).
 */
export default {
	props: {
		/** `diagnostico` del item normalizado: un objeto por plan. */
		diagnostico: {
			type: Array,
			default() {
				return []
			},
		},
		/** Id del item (solo para el data-testid). */
		item_id: {
			type: Number,
			default: null,
		},
	},
	computed: {
		planes() {
			return Array.isArray(this.diagnostico) ? this.diagnostico : []
		},
	},
	methods: {
		/**
		 * "Por código de barras" / "Por código de proveedor" / "Por nombre".
		 *
		 * @param {Object} plan
		 * @returns {String}
		 */
		nombre_del_plan(plan) {
			let texto = texto_de(CRITERIOS, plan.criterio)
			return texto ? 'Por ' + texto.charAt(0).toLowerCase() + texto.slice(1) : 'Búsqueda'
		},
		consultas(plan) {
			return plan.busquedas === 1 ? '1 consulta' : entero_es(plan.busquedas) + ' consultas'
		},
		resultados(plan) {
			return plan.resultados === 1 ? '1 resultado' : entero_es(plan.resultados) + ' resultados'
		},
		/**
		 * Cómo terminó un plan, en texto ("La IA dijo que las páginas eran de otro producto.").
		 *
		 * @param {String} codigo `resultado` del plan.
		 * @returns {String}
		 */
		resultado_del_plan(codigo) {
			return texto_de(RESULTADOS_DE_PLAN, codigo)
		},
		/**
		 * Qué tan seguro estaba la IA, en texto ("el mismo producto").
		 *
		 * @param {String} codigo `match` de la IA.
		 * @returns {String}
		 */
		coincidencia_de_la_ia(codigo) {
			return texto_de(COINCIDENCIAS_DE_LA_IA, codigo).toLowerCase()
		},
		/**
		 * Por qué se descartó una página, en texto.
		 *
		 * @param {String} codigo
		 * @returns {String}
		 */
		motivo_de_descarte(codigo) {
			return texto_de(MOTIVOS_DE_DESCARTE, codigo)
		},
	},
}
</script>
<style lang="sass">
// Sin scope: vive adentro del b-modal del detalle. Prefijo med-diag; colores por token.
.med-diag
	display: flex
	flex-direction: column
	gap: 10px
	align-self: stretch
	width: 100%
	margin-top: 4px
	padding: 12px 14px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)
	min-width: 0

.med-diag__plan
	display: flex
	flex-direction: column
	gap: 3px
	min-width: 0

	& + .med-diag__plan
		padding-top: 10px
		border-top: 1px dashed var(--color-border-secondary, #e9ecef)

.med-diag__plan--sin-usar
	opacity: .8

.med-diag__cabecera
	display: flex
	flex-wrap: wrap
	align-items: baseline
	gap: 2px 10px

.med-diag__nombre
	font-size: 0.8125rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.med-diag__consulta
	font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
	overflow-wrap: anywhere

.med-diag__numeros
	margin: 0
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.med-diag__texto
	margin: 0
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-primary, #212529)

.med-diag__texto--ia
	color: var(--color-text-secondary, #6c757d)

.med-diag__ia
	display: flex
	flex-direction: column
	gap: 3px
	margin-top: 2px
	min-width: 0

.med-diag__campos
	display: flex
	flex-direction: column
	gap: 3px
	margin: 0
	padding: 0
	list-style: none

.med-diag__campo
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 2px 8px

.med-diag__error
	margin: 0
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--btn-peligro-texto, #9c3a36)

.med-diag__paginas
	display: flex
	flex-direction: column
	gap: 6px
	margin: 4px 0 0
	padding: 0
	list-style: none

.med-diag__pagina
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 4px 10px
	min-width: 0

.med-diag__link
	display: inline-flex
	align-items: center
	gap: 5px
	font-size: 0.8125rem
	font-weight: 500
	color: var(--color-primary, #007bff)
	overflow-wrap: anywhere

	i
		font-size: 0.7rem

.med-diag__link--apagado
	color: var(--color-text-secondary, #6c757d)

.med-diag__motivo-pagina
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
</style>
