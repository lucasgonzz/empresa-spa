<template>
	<div
	v-if="puede_usar_discount_surchages">
		<surchages
		v-if="puede_crear_discount_surchages"></surchages>	
		<b-card
		class="m-b-15 b-r-1 shadow">
			<div
			class="j-between align-center">
				<p
				class="m-b-0">
					<strong>
						Seleccionar recargos
					</strong>
				</p>
				<b-button
				variant="outline-primary"
				v-b-modal="'surchages'">
					<i class="icon-eye"></i>
					Recargos
				</b-button>
			</div>

			<b-form-group>
				<b-form-checkbox
				v-for="surchage in surchages"
				:key="surchage.id"
				:value="surchage.id"
				v-model="sale_surchages">

					<div
					:id="'surchage_'+surchage.id">
						
						{{ surchage.name }} {{ surchage.percentage }}%

						<span
						v-if="surchage.deleted_at">
							(actualmente eliminado)
						</span>

						<span
						v-else-if="surchage.updated_percentage">
							({{ surchage.updated_percentage }}% en este momento)
						</span>

						<p
						class="text-muted"
						v-if="!surchage.deleted_at && surchage.updated_percentage">
							En caso de querer usar el valor actual del recargo ({{ surchage.updated_percentage }}%), desmarcar para quitar el recargo, guardar la venta sin el recargo, y editar la venta para agregarle el recargo con el valor actualizado.
						</p>
					</div>
				</b-form-checkbox>
			</b-form-group>

			<hr>
			<b-form-group
			label="Recargos en los servicios">
				<b-form-checkbox
				:value="1"
				:unchecked-value="0"
				v-model="surchages_in_services">
					<span
					id="aplicar_recargos_a_servicios">
						Aplicar recargos en los servicios
					</span>
				</b-form-checkbox>
			</b-form-group>
		</b-card>
	</div>
</template>
<script>
import Surchages from '@/components/vender/modals/clients/Surchages'
import vender from '@/mixins/vender'
import vender_set_total from '@/mixins/vender_set_total'
import discount_surchage_permissions from '@/mixins/vender/discount_surchage_permissions'
export default {
	mixins: [vender, vender_set_total, discount_surchage_permissions],
	components: {
		Surchages,
	},
	computed: {
		surchages() {
			return this.$store.state.surchage.models
		},
		sale_surchages: {
			get() {
				return this.$store.state.vender.surchages_id
			},
			set(value) {
				this.$store.commit('vender/setSurchagesId', value)
				this.setTotal()
				// this.$store.commit('vender/setTotal')
			}
		}
	}
}
</script>