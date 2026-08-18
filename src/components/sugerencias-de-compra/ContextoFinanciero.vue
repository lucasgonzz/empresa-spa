<template>
	<b-card
	v-if="contexto"
	class="contexto-financiero m-b-15">

		<h6 class="contexto-financiero__titulo">
			<i class="bi bi-cash-stack m-r-5"></i>
			Contexto financiero
			<span
			v-if="contexto.capturado_at"
			class="contexto-financiero__capturado text-muted">
				(capturado el {{ date(contexto.capturado_at, true) }})
			</span>
		</h6>

		<p class="contexto-financiero__disponible">
			Disponible en cajas (pesos): <strong>{{ price(contexto.caja_disponible_pesos) }}</strong>
		</p>

		<div
		v-if="contexto.proveedores && contexto.proveedores.length"
		class="tabla-modulo-wrapper">
			<b-table
			small
			responsive
			table-class="tabla-modulo contexto-financiero__tabla"
			:fields="fields"
			:items="contexto.proveedores">

				<template #cell(deuda_pesos)="data">
					{{ price(data.item.deuda_pesos) }}
				</template>

				<template #cell(deuda_dolares)="data">
					{{ price(data.item.deuda_dolares) }}
				</template>

				<template #cell(total_estimado)="data">
					{{ price(data.item.total_estimado) }}
				</template>

			</b-table>
		</div>

		<!--
			Leyenda fija y visible (PLAN §5.5/D9): la plata es dato de contexto, no
			recorte. Ninguna cantidad sugerida se ajusta por deuda o caja disponible.
		-->
		<p class="contexto-financiero__leyenda text-muted small m-b-0">
			<i class="bi bi-info-circle m-r-5"></i>
			Estos números son informativos: no se descontaron de las cantidades sugeridas.
		</p>

	</b-card>
</template>
<script>
/*
	Tarjeta informativa con la deuda por proveedor y la plata disponible en cajas
	al momento de cerrar la corrida (PLAN §5.5, ContextoFinancieroService::armar()).
	Nunca participa del calculo de cantidades: es solo para que quien compra vea
	el cuadro completo antes de decidir. Se auto-oculta (mismo criterio del
	estado null de ResumenIa.vue) mientras no haya datos: una corrida recien
	creada o todavia no terminada no tiene contexto_financiero.
*/
export default {
	props: {
		sugerencia: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * El backend guarda contexto_financiero como JSON en una columna longText.
		 * Si el modelo ya lo entrega parseado (cast de Eloquent) se usa tal cual;
		 * si llega como string se parsea aca. Cualquier valor invalido cae a null,
		 * que es lo que hace desaparecer la tarjeta entera.
		 */
		contexto() {
			let valor = this.sugerencia && this.sugerencia.contexto_financiero
			if (!valor) {
				return null
			}
			if (typeof valor == 'string') {
				try {
					return JSON.parse(valor)
				} catch (e) {
					return null
				}
			}
			return valor
		},
		fields() {
			return [
				{
					label: 'Proveedor',
					key: 'nombre',
				},
				{
					label: 'Deuda ($)',
					key: 'deuda_pesos',
				},
				{
					label: 'Deuda (USD)',
					key: 'deuda_dolares',
				},
				{
					label: 'Total estimado',
					key: 'total_estimado',
				},
				{
					label: 'Lineas',
					key: 'lineas',
				},
			]
		},
	},
}
</script>
<style lang="sass">
.contexto-financiero
	&__titulo
		font-weight: 600
	&__capturado
		font-weight: 400
		font-size: .8rem
	&__disponible
		margin-bottom: 10px
	&__leyenda
		margin-top: 10px
</style>
