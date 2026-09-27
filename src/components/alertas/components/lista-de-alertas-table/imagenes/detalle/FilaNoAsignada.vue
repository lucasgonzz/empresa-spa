<template>
<li
class="img-det-fila img-det-fila--no-asignada"
:data-testid="'imagenes-item-' + item.id"
:data-status="item.status"
:data-motivo="item.motivo">

	<div class="img-det-fila__cuerpo">

		<div class="img-det-fila__linea">
			<span class="img-det-fila__nombre">{{ nombre }}</span>
			<span
			class="img-det-fila__busquedas"
			:data-busquedas="item.busquedas">
				{{ busquedas }}
			</span>
		</div>

		<div class="img-det-fila__meta">
			<span
			v-if="item.article_bar_code"
			class="img-det-fila__codigo">
				{{ item.article_bar_code }}
			</span>
			<span
			class="img-det-etiqueta"
			:class="'img-det-etiqueta--' + tono_del_motivo"
			data-testid="imagenes-motivo-articulo">
				{{ motivo }}
			</span>
		</div>

		<p
		v-if="item.motivo_detalle"
		class="img-det-fila__detalle">
			{{ item.motivo_detalle }}
		</p>

		<button
		v-if="tiene_diagnostico"
		type="button"
		class="img-det-fila__desplegar"
		:aria-expanded="abierto ? 'true' : 'false'"
		:data-testid="'imagenes-diagnostico-' + item.id"
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
import { MOTIVOS, texto_de, busquedas_del_articulo } from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'

/**
 * Motivos que son un problema del sistema o del cupo, no del artículo: van en ámbar para que se
 * distingan de "no se encontró", que es lo normal en esta solapa.
 */
const MOTIVOS_DE_AVISO = ['sin_cupo', 'error_de_busqueda', 'error_interno']

/**
 * Un artículo que quedó sin imagen: el motivo principal, la frase que resume lo que dio cada
 * criterio, las búsquedas que gastó y —desplegable— el diagnóstico completo con las candidatas.
 */
export default {
	components: {
		Diagnostico: () => import('@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/Diagnostico'),
	},
	props: {
		/** ItemPayload (contrato §5.2). */
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
			return texto_de(MOTIVOS, this.item.motivo) || 'Sin imagen'
		},
		tono_del_motivo() {
			return MOTIVOS_DE_AVISO.indexOf(this.item.motivo) !== -1 ? 'aviso' : 'neutro'
		},
		busquedas() {
			return busquedas_del_articulo(this.item.busquedas)
		},
		tiene_diagnostico() {
			return Array.isArray(this.item.diagnostico) && this.item.diagnostico.length > 0
		},
	},
}
</script>
