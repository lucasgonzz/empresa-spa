<template>
	<!--
		Etapa 2 — Artículos y servicios.
		Siempre expandida, no colapsable.
		Index: orquesta el layout fijo; la lógica vive en cada subcomponente.
	-->
	<div class="vender-stage vender-stage--open vender-stage--no-collapse">

		<!-- Header informativo (sin toggle) -->
		<div class="vender-stage__header vender-stage__header--no-collapse">
			<span class="vender-stage__number">2</span>
			<div class="vender-stage__header-text">
				<span class="vender-stage__label">Artículos y servicios</span>
				<span class="vender-stage__sublabel">Buscar artículos, servicios, combos y promociones</span>
			</div>
		</div>

		<!-- Body siempre visible -->
		<div class="vender-stage__body vender-stage__body--always-open">

			<!-- Barra de contexto horizontal: total, cliente, método de pago y checklist -->
			<context-bar></context-bar>

			<!-- Buscadores de artículos -->
			<header-form></header-form>

			<!-- Indicador de ventas anteriores vinculadas -->
			<previus-sale-data></previus-sale-data>

			<!-- Tabla de artículos agregados -->
			<articles-table></articles-table>

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
