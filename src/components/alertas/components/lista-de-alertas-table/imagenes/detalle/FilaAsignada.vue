<template>
<li
class="img-det-fila img-det-fila--asignada"
:class="{ 'img-det-fila--procesando': procesando }"
:data-testid="'imagenes-item-' + item.id"
:data-status="item.status">

	<miniatura
	tamano="chica"
	ampliable
	:url="item.imagen_url"
	:alt="nombre"
	@ampliar="ampliar"></miniatura>

	<div class="img-det-fila__cuerpo">

		<span class="img-det-fila__nombre">{{ nombre }}</span>

		<div class="img-det-fila__meta">
			<span
			v-if="item.article_bar_code"
			class="img-det-fila__codigo">
				{{ item.article_bar_code }}
			</span>
			<span v-if="criterio">{{ criterio }}</span>
			<span :data-busquedas="item.busquedas">{{ busquedas }}</span>
		</div>

		<div
		v-if="avisos.length || aprobada"
		class="img-det-fila__avisos">
			<!-- "Fondo no blanco": se asigno igual, marcada (decision de Lucas). -->
			<span
			v-for="(aviso, indice) in avisos"
			:key="'aviso-' + indice"
			class="img-det-etiqueta img-det-etiqueta--aviso">
				{{ aviso }}
			</span>
			<span
			v-if="aprobada"
			class="img-det-etiqueta img-det-etiqueta--neutro"
			data-testid="imagenes-item-aprobada">
				{{ texto_aprobada }}
			</span>
		</div>

	</div>

	<div class="img-det-fila__acciones">
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="outline-secondary"
		:data-testid="'imagenes-quitar-' + item.id"
		:disabled="procesando"
		@click="$emit('quitar')">
			Quitar
		</b-button>
	</div>

</li>
</template>
<script>
// Sincronico a proposito: ver el comentario del mismo import en FilaARevisar.vue.
import Miniatura from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/Miniatura'
import { CRITERIOS, texto_de, busquedas_del_articulo } from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'

/**
 * Un artículo al que la búsqueda le puso imagen (sola, o aprobada después de revisarla): la
 * miniatura, por qué criterio se encontró, las búsquedas que gastó, los avisos ("Fondo no
 * blanco") y quién la aprobó si pasó por revisión. "Quitar" se la saca al artículo (y a la
 * tienda).
 *
 * Eventos: `quitar`, `ampliar(imagen)`.
 */
export default {
	components: {
		Miniatura,
	},
	props: {
		/** ItemPayload (contrato §5.2). */
		item: {
			type: Object,
			required: true,
		},
		/** true mientras viaja el "Quitar". */
		procesando: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		nombre() {
			return this.item.article_name || ('Artículo N° ' + this.item.article_id)
		},
		criterio() {
			let texto = texto_de(CRITERIOS, this.item.criterio_usado)
			return texto ? 'Por ' + texto.charAt(0).toLowerCase() + texto.slice(1) : ''
		},
		busquedas() {
			return busquedas_del_articulo(this.item.busquedas)
		},
		avisos() {
			return Array.isArray(this.item.avisos) ? this.item.avisos : []
		},
		/** true si llegó a "Asignadas" pasando por "A revisar". */
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
	methods: {
		ampliar() {
			let detalle = ''
			let imagen = this.item.imagen && typeof this.item.imagen === 'object' ? this.item.imagen : {}
			if (imagen.ancho && imagen.alto) {
				detalle = imagen.ancho + ' × ' + imagen.alto + ' px'
			}
			this.$emit('ampliar', {
				url: this.item.imagen_url,
				titulo: this.nombre,
				detalle: detalle,
			})
		},
	},
}
</script>
