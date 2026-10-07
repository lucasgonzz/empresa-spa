<template>
<div
v-if="total > 0"
class="paginacion-modulo m-t-15"
data-testid="categorias-capsula-paginacion">
	<div class="paginacion-modulo__barra">

		<span
		class="paginacion-modulo__meta"
		data-testid="categorias-paginacion-total"
		:data-total="total">
			{{ entero(total) }} {{ total == 1 ? 'artículo' : 'artículos' }}
		</span>

		<template v-if="total > por_pagina">
			<span
			class="paginacion-modulo__separador"
			aria-hidden="true"></span>
			<!--
				`@change` y no `@input`: change sale solo cuando la persona toca una pagina. Con
				input, cada vez que el padre corrige la pagina (por ejemplo, porque se vacio la
				ultima) b-pagination lo devolveria como si fuera un clic y pediria dos veces.
			-->
			<b-pagination
			class="paginacion-modulo__pages m-0"
			pills
			:value="pagina"
			:total-rows="total"
			:per-page="por_pagina"
			:disabled="cargando"
			@change="$emit('cambiar_pagina', $event)"></b-pagination>
		</template>

		<span
		class="paginacion-modulo__separador"
		aria-hidden="true"></span>

		<label class="cat-pag__por-pagina">
			<span>Por página</span>
			<select
			class="cat-pag__select"
			data-testid="categorias-por-pagina"
			:value="por_pagina"
			:disabled="cargando"
			@change="$emit('cambiar_por_pagina', Number($event.target.value))">
				<option
				v-for="opcion in opciones"
				:key="opcion"
				:value="opcion">
					{{ opcion }}
				</option>
			</select>
		</label>

	</div>
</div>
</template>
<script>
import { entero_es } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'

/**
 * Paginación de la revisión de categorías: la cápsula del sistema (`.paginacion-modulo`, de
 * _controles_modulo.sass) con el total, las páginas y el selector de 25 / 50 / 100 por página. Es la
 * misma que la del detalle de imágenes (imagenes/detalle/PaginacionItems.vue), con sus propios
 * testids y clases: la de imágenes tiene los suyos y su estilo vive en el chunk del detalle, que acá
 * puede no estar cargado.
 *
 * Solo dibuja y avisa (`cambiar_pagina`, `cambiar_por_pagina`): el pedido lo hace la revisión.
 */
export default {
	props: {
		/** Total de artículos de la solapa (con el buscador aplicado). */
		total: {
			type: Number,
			default: 0,
		},
		/** Página actual. */
		pagina: {
			type: Number,
			default: 1,
		},
		/** Artículos por página: 25 (el default del contrato), 50 o 100. */
		por_pagina: {
			type: Number,
			default: 25,
		},
		/** true mientras se pide una página: se apagan los controles para no pedir dos. */
		cargando: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/** Opciones del selector. La API acepta 25, 50 y 100 (cualquier otro valor es 25). */
			opciones: [25, 50, 100],
		}
	},
	methods: {
		entero(valor) {
			return entero_es(valor)
		},
	},
}
</script>
<style lang="sass">
// El selector "por pagina" no es parte de la capsula compartida (_controles_modulo.sass lo deja
// afuera a proposito): se dibuja aca con el mismo lenguaje que el de la paginacion del Display.
.cat-pag__por-pagina
	display: inline-flex
	align-items: center
	gap: 0.4rem
	flex-shrink: 0
	margin: 0
	font-size: 0.75rem
	font-weight: 500
	white-space: nowrap
	color: var(--color-text-secondary, #6c757d)

.cat-pag__select
	height: 26px
	padding: 0 6px 0 10px
	border-radius: 999px
	border: 1px solid var(--color-border, #dee2e6)
	background-color: var(--bg-section, #f8f9fa)
	color: var(--color-text-primary, #212529)
	font-size: 0.8125rem
	font-variant-numeric: tabular-nums
	box-shadow: none
	cursor: pointer

	&:focus
		outline: none
		border-color: var(--color-primary, #007bff)
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring, rgba(0, 123, 255, .15))

// En telefono la capsula se apila (ver _controles_modulo.sass): el selector va centrado.
@media (max-width: 575px)
	.cat-pag__por-pagina
		justify-content: center

	.cat-pag__select
		height: 34px
</style>
