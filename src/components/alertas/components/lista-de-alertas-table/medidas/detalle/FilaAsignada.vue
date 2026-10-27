<template>
<li
class="med-fila med-fila--asignada"
:class="{ 'med-fila--procesando': procesando }"
:data-testid="'medidas-item-' + item.id"
:data-status="item.status">

	<div class="med-fila__cuerpo">

		<div class="med-fila__linea">
			<span class="med-fila__nombre">{{ nombre }}</span>
			<span
			class="med-fila__consultas"
			:data-consultas="item.busquedas">
				{{ consultas }}
			</span>
		</div>

		<div class="med-fila__meta">
			<span
			v-if="item.article_bar_code"
			class="med-fila__codigo"
			title="Código de barras">
				<span class="med-fila__rotulo">Cód. barras</span>
				{{ item.article_bar_code }}
			</span>
			<span
			v-if="item.article_provider_code"
			class="med-fila__codigo"
			title="Código de proveedor">
				<span class="med-fila__rotulo">Cód. proveedor</span>
				{{ item.article_provider_code }}
			</span>
			<span v-if="criterio">{{ criterio }}</span>
		</div>

		<chips-de-medidas
		:campos="item.campos"
		:item_id="item.id"></chips-de-medidas>

		<div
		v-if="aprobada || motivo"
		class="med-fila__avisos">
			<span
			v-if="motivo"
			class="med-etiqueta"
			:class="'med-etiqueta--' + tono_del_motivo">
				{{ motivo }}
			</span>
			<span
			v-if="aprobada"
			class="med-etiqueta med-etiqueta--neutro"
			:data-testid="'medidas-aprobada-por-' + item.id">
				{{ texto_aprobada }}
			</span>
		</div>

		<p
		v-if="item.motivo_detalle"
		class="med-fila__detalle">
			{{ item.motivo_detalle }}
		</p>
		<p
		v-if="item.nota_ia"
		class="med-fila__detalle med-fila__detalle--ia"
		:data-testid="'medidas-nota-ia-' + item.id">
			{{ item.nota_ia }}
		</p>

		<fuente-de-medidas
		:fuentes="item.fuentes"
		:campos="item.campos"
		:item_id="item.id"></fuente-de-medidas>

	</div>

	<!-- Ayuda a la izquierda: el botón queda pegado al borde derecho del modal (ver FilaARevisar.vue). -->
	<div class="med-fila__acciones">
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="outline-secondary"
		data-ayuda-placement="left"
		:data-testid="'medidas-quitar-' + item.id"
		:disabled="procesando"
		@click="$emit('quitar')">
			Quitar
		</b-button>
	</div>

</li>
</template>
<script>
// Sincrónicos a propósito: son chicos y se dibujan en cada fila. Con un import perezoso, cada fila
// nueva parpadearía vacía hasta que llegara el componente.
import ChipsDeMedidas from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/ChipsDeMedidas'
import FuenteDeMedidas from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/FuenteDeMedidas'
import { CRITERIOS, MOTIVOS, MOTIVOS_DE_AVISO, texto_de, consultas_del_articulo } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * Un artículo al que la búsqueda le cargó las medidas (sola, o aprobada después de revisarla): los
 * cuatro chips con lo que se guardó, de dónde salió, las consultas que gastó, quién la aprobó si
 * pasó por revisión y la nota de la IA si la dejó. «Quitar» le saca esas medidas al artículo.
 *
 * Eventos: `quitar`.
 */
export default {
	components: {
		ChipsDeMedidas,
		FuenteDeMedidas,
	},
	props: {
		/** ItemPayload normalizado (contrato §2.6). */
		item: {
			type: Object,
			required: true,
		},
		/** true mientras viaja el «Quitar». */
		procesando: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		nombre() {
			return this.item.article_name || ('Artículo N° ' + this.item.article_id)
		},
		/** "Por código de barras" / "Por nombre". */
		criterio() {
			let texto = texto_de(CRITERIOS, this.item.criterio_usado)
			return texto ? 'Por ' + texto.charAt(0).toLowerCase() + texto.slice(1) : ''
		},
		consultas() {
			return consultas_del_articulo(this.item.busquedas)
		},
		/**
		 * El motivo de una asignada, si la API manda uno (por ejemplo, que se cargaron solo algunos
		 * campos porque el artículo ya tenía los demás).
		 *
		 * @returns {String}
		 */
		motivo() {
			return texto_de(MOTIVOS, this.item.motivo)
		},
		tono_del_motivo() {
			return MOTIVOS_DE_AVISO.indexOf(this.item.motivo) !== -1 ? 'aviso' : 'neutro'
		},
		/** true si llegó a «Asignadas» pasando por «A revisar». */
		aprobada() {
			return this.item.status === 'aprobada'
		},
		/**
		 * "Aprobada por Juan" o, si la API no mandó quién, "Aprobada a mano".
		 *
		 * @returns {String}
		 */
		texto_aprobada() {
			if (this.item.revisado_por) {
				return 'Aprobada por ' + this.item.revisado_por
			}
			return 'Aprobada a mano'
		},
	},
}
</script>
