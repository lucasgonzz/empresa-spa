<template>
<div
v-if="has_permission">
	<!--
		Variante suelta del control de fecha: la que se monta FUERA del view-header. Hoy la usan los
		reportes y los graficos de Caja vieja, que la montan con model_name="report" / "chart" y
		model_name_for_get_models="sale".

		Sin segmento de modo (esos modulos no cambian entre "Por fecha" e "Historico") y con los dias
		siempre visibles, que es exactamente lo que hacia este componente antes de la mision 3: lo
		unico que cambio es que adentro ahora vive ControlFecha en vez de Title + WeekDaysNav + el
		boton "Por fecha". El permiso se chequea una sola vez, aca, y por eso se le pasa
		check_permissions en false al hijo.
	-->
	<div class="cont-previus-days">
		<control-fecha
		:model_name="model_name"
		:model_name_for_get_models="model_name_for_get_models"
		:change_from_dates_option="false"
		:mostrar_dias="true"
		:check_permissions="false"
		:clear_selected="clear_selected"></control-fecha>
	</div>
</div>
</template>
<script>
import ControlFecha from '@/common-vue/components/previus-days/ControlFecha'

export default {
	name: 'PreviusDays',
	components: {
		ControlFecha,
	},
	props: {
		model_name: String,
		clear_selected: {
			type: Boolean,
			default: false
		},
		/**
		 * Se mantienen por compatibilidad con los consumidores que ya las pasan (Caja vieja), aunque
		 * el control nuevo muestre siempre el calendario y ya no tenga titulo. Sacarlas obligaria a
		 * tocar esos modulos, que estan fuera del alcance de la mision 3.
		 */
		show_modal: {
			type: Boolean,
			default: true,
		},
		show_title: {
			type: Boolean,
			default: true,
		},
		model_name_for_get_models: {
			type: String,
			default: null,
		},
		check_permissions: {
			type: Boolean,
			default: true,
		},
	},
	computed: {
		has_permission() {
			if (this.check_permissions) {
				return this.can(this.model_name+'.index.previus_days')
			}
			return true
		}
	}
}
</script>
<style scoped lang="sass">
.cont-previus-days
	margin-bottom: 15px
	display: flex
	flex-direction: row
	align-items: center
	flex-wrap: wrap
</style>
