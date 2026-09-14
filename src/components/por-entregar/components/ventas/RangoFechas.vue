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
		<b-col
		class="align-end"
		lg="3">
			<b-button
			variant="primary"
			@click="get_sales">
				Buscar
			</b-button>
		</b-col>
		<!--
			Boton de columnas de la tabla de abajo, con su propio ambito (`por_entregar`): esta
			vista no monta el view-header, asi que el boton va aca, en la fila de Buscar, alineado
			abajo como el. Misma columna lg="3" que las otras tres: en escritorio cierran la fila
			de a cuatro y por debajo de lg se apilan de a una; el margen superior es solo para
			cuando se apila, para que no quede pegado al boton Buscar.
		-->
		<b-col
		class="align-end m-t-10 m-lg-t-0"
		lg="3">
			<props-to-show
			model_name="sale"
			preference_scope="por_entregar"></props-to-show>
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