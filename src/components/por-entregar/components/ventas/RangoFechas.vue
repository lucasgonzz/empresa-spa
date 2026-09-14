<template>
	<b-row
	class="j-start p-t-15">
		<b-col
		cols="12">
			<h4
			class="text-left">
				Fecha de entrega
			</h4>
		</b-col>
		<b-col
		class="align-end"
		lg="3">
			<b-form-group
			class="m-0 w-100"
			label="Desde">
				<b-form-input
				v-model="from_date"
				type="date"></b-form-input>
			</b-form-group>
		</b-col>
		<b-col
		class="align-end"
		lg="3">
			<b-form-group
			class="m-0 w-100"
			label="Hasta">
				<b-form-input
				v-model="to_date"
				type="date"></b-form-input>
			</b-form-group>
		</b-col>
		<!--
			Buscar y el boton de columnas van juntos en la misma celda, en fila: el boton de columnas
			abre el modal de la tabla de abajo con su propio ambito (`por_entregar`), y como esta
			vista no monta el view-header, este es su lugar. En una columna aparte quedaba huerfano
			por debajo de lg, apilado solo bajo Buscar (medido en 900 y 375 el 14/9/2026).
		-->
		<b-col
		class="align-end"
		lg="3">
			<div class="rango-fechas__acciones">
				<b-button
				variant="primary"
				@click="get_sales">
					Buscar
				</b-button>
				<props-to-show
				model_name="sale"
				preference_scope="por_entregar"></props-to-show>
			</div>
		</b-col>
	</b-row>
</template>
<script>
import moment from 'moment'
export default {
	components: {
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
	},
	data() {
		return {
			from_date: moment().format('YYYY-MM-DD'),
			to_date: moment().add(7, 'days').format('YYYY-MM-DD'),
		}
	},
	created() {
		this.get_sales()
	},
	methods: {
		get_sales() {
			this.$store.commit('sale/setLoading', true)
			this.$api.get('sale/por-entregar/'+this.from_date+'/'+this.to_date)
			.then(res => {
				this.$store.commit('sale/setLoading', false)
				this.$store.commit('sale/setModels', res.data.models)
			})
			.catch(err => {
				this.$store.commit('sale/setLoading', false)
				console.log(err)
			})
		}
	}
}
</script>
<style lang="sass" scoped>
// Buscar y el boton de columnas en una fila, alineados abajo como los inputs de fecha. El boton
// de columnas es un btn-sm y el de Buscar no: align-items center los deja a la misma altura.
.rango-fechas__acciones
	display: flex
	align-items: center
	gap: 10px
</style>
