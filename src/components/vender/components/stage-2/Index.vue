<template>
	<!--
		Etapa 2 — Artículos y servicios.
		Siempre expandida, no colapsable.
		Index: orquesta el layout fijo; la lógica vive en cada subcomponente.
	-->
	<div class="vender-stage vender-stage--open vender-stage--no-collapse">

		<!--
			Bloque pegado (sticky): header + total + buscador de artículos.
			Se mantiene visible arriba al scrollear la tabla de abajo, respetando el mismo
			margen que esta etapa tiene con la anterior (ver $vender_stage_gap en el sass).
		-->
		<div class="vender-stage__pinned">

			<!-- Header informativo (sin toggle) -->
			<div class="vender-stage__header vender-stage__header--no-collapse">
				<span class="vender-stage__number">2</span>
				<div class="vender-stage__header-text">
					<span class="vender-stage__label">Artículos y servicios</span>
					<span class="vender-stage__sublabel">Buscar artículos, servicios, combos y promociones</span>
				</div>
			</div>

			<div class="vender-stage__body vender-stage__body--always-open vender-stage__body--pinned">

				<!-- Barra de contexto horizontal: total, cliente, método de pago y checklist -->
				<context-bar></context-bar>

				<!-- Buscadores de artículos -->
				<header-form data-tour="vender.buscador_articulos"></header-form>

			</div>
		</div>

		<!-- Body que sigue scrolleando debajo del bloque pegado -->
		<div class="vender-stage__body vender-stage__body--always-open vender-stage__body--scroll">

			<!-- Indicador de ventas anteriores vinculadas -->
			<previus-sale-data></previus-sale-data>

			<!-- Tabla de artículos agregados -->
			<articles-table data-tour="vender.lista_articulos"></articles-table>

		</div>
	</div>
</template>

<script>
import HeaderForm from '@/components/vender/components/remito/header-form/Index.vue'
import PreviusSaleData from '@/components/vender/components/remito/PreviusSaleData.vue'
import ArticlesTable from '@/components/vender/components/remito/ArticlesTable.vue'

export default {
	name: 'VenderStage2',
	components: {
		/* Barra de contexto específica de la etapa 2 */
		ContextBar: () => import('./ContextBar'),
		HeaderForm,
		PreviusSaleData,
		ArticlesTable,
	},
}
</script>
