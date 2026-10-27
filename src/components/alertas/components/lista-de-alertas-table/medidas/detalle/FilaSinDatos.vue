<template>
<li
class="med-fila med-fila--sin-datos"
:data-testid="'medidas-item-' + item.id"
:data-status="item.status"
:data-motivo="item.motivo">

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
			<span
			class="med-etiqueta"
			:class="'med-etiqueta--' + tono_del_motivo"
			:data-testid="'medidas-motivo-' + item.id">
				{{ motivo }}
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

		<!--
			Qué se probó: cada plan de búsqueda con su consulta, los resultados, las páginas que se leyeron y
			por qué se descartó cada una. Siempre se ofrece: si la API no guardó el detalle, el panel lo dice.
		-->
		<button
		type="button"
		class="med-fila__desplegar"
		:aria-expanded="abierto ? 'true' : 'false'"
		:data-testid="'medidas-diagnostico-' + item.id"
		@click="abierto = !abierto">
			<i
			class="bi"
			:class="abierto ? 'bi-chevron-down' : 'bi-chevron-right'"
			aria-hidden="true"></i>
			{{ abierto ? 'Ocultar qué se probó' : 'Ver qué se probó' }}
		</button>

		<diagnostico
		v-if="abierto"
		:diagnostico="item.diagnostico"
		:item_id="item.id"></diagnostico>

	</div>

</li>
</template>
<script>
import { MOTIVOS, MOTIVOS_DE_AVISO, texto_de, consultas_del_articulo } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * Un artículo del que no se pudo sacar nada confiable: el motivo principal, la frase que resume lo
 * que pasó, las consultas que gastó y —desplegable— el diagnóstico con todo lo que se probó.
 *
 * Es la solapa «Sin datos». No lleva acciones: no hay nada para aprobar. Cargar las medidas a mano
 * se hace desde la ficha del artículo.
 */
export default {
	components: {
		Diagnostico: () => import('@/components/alertas/components/lista-de-alertas-table/medidas/detalle/Diagnostico'),
	},
	props: {
		/** ItemPayload normalizado (contrato §2.6). */
		item: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/** true con el diagnóstico desplegado. */
			abierto: false,
		}
	},
	computed: {
		nombre() {
			return this.item.article_name || ('Artículo N° ' + this.item.article_id)
		},
		motivo() {
			return texto_de(MOTIVOS, this.item.motivo) || 'Sin datos'
		},
		/**
		 * Los motivos que son un problema del sistema o del cupo van en ámbar; «no se encontró»,
		 * que es lo normal en esta solapa, va en gris.
		 *
		 * @returns {String}
		 */
		tono_del_motivo() {
			return MOTIVOS_DE_AVISO.indexOf(this.item.motivo) !== -1 ? 'aviso' : 'neutro'
		},
		consultas() {
			return consultas_del_articulo(this.item.busquedas)
		},
	},
}
</script>
