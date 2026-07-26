<template>
	<!--
		Fila de override de liquidación/comisión para un método de pago puntual dentro de una
		caja. Los inputs se manejan a mano (no con ModelForm) porque necesitan un comportamiento
		muy puntual que ModelForm no soporta: "vacío" debe mostrarse como un placeholder en gris
		con el valor heredado de la caja (ej. "14 (heredado)"), no como un campo en blanco genérico.
	-->
	<div class="liquidacion-config-row m-b-15 p-10">
		<div class="j-between align-center m-b-10">
			<strong>{{ payment_method.name }}</strong>

			<b-button
			v-if="config && config.id"
			size="sm"
			variant="outline-danger"
			:disabled="saving"
			@click.stop="quitar_override">
				Quitar override
			</b-button>
		</div>

		<b-form-row>
			<b-col md="3">
				<label class="form-label">Días de liquidación</label>
				<b-form-input
				type="number"
				min="0"
				v-model="form.dias_liquidacion"
				:placeholder="placeholder_dias_liquidacion"></b-form-input>
			</b-col>

			<b-col md="3">
				<label class="form-label">% de comisión</label>
				<b-form-input
				type="number"
				step="0.01"
				min="0"
				v-model="form.comision_porcentaje"
				:placeholder="placeholder_comision_porcentaje"></b-form-input>
			</b-col>

			<b-col md="3">
				<label class="form-label">Alícuota IVA comisión</label>
				<b-form-input
				type="number"
				step="0.01"
				min="0"
				v-model="form.comision_iva_alicuota"
				:placeholder="placeholder_comision_iva_alicuota"></b-form-input>
			</b-col>

			<b-col md="3">
				<label class="form-label">% de comisión ya incluye IVA</label>
				<b-form-select
				v-model="form.comision_iva_incluido"
				:options="comision_iva_incluido_options"></b-form-select>
			</b-col>

			<b-col md="6" class="m-t-10">
				<label class="form-label">Concepto de gasto de la comisión</label>
				<b-form-select
				v-model="form.expense_concept_id"
				:options="expense_concept_options"></b-form-select>
			</b-col>

			<b-col md="6" class="m-t-10 j-end align-end">
				<btn-loader
				:loader="saving"
				variant="primary"
				@clicked="guardar"
				text="Guardar"></btn-loader>
			</b-col>
		</b-form-row>
	</div>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		caja: Object,
		payment_method: Object,
		// Override existente para esta caja + método de pago, o null si todavía no hay uno.
		config: Object,
	},
	data() {
		return {
			// Copia editable del override: arranca en los valores existentes (o vacío si no hay
			// override todavía). Vacío siempre significa "hereda de la caja".
			form: {
				dias_liquidacion: this.config ? this.config.dias_liquidacion : null,
				comision_porcentaje: this.config ? this.config.comision_porcentaje : null,
				comision_iva_alicuota: this.config ? this.config.comision_iva_alicuota : null,
				comision_iva_incluido: this.config ? this.config.comision_iva_incluido : null,
				expense_concept_id: this.config ? this.config.expense_concept_id : null,
			},
			// Loader local del botón guardar de esta fila puntual.
			saving: false,
		}
	},
	computed: {
		/**
		 * Opciones del select tri-estado de "% de comisión ya incluye IVA": vacío (hereda),
		 * sí o no. Un checkbox binario no alcanza porque acá "vacío" y "no" son cosas distintas.
		 *
		 * @returns {Array}
		 */
		comision_iva_incluido_options() {
			return [
				{ value: null, text: 'Hereda de la caja' },
				{ value: 1, text: 'Sí, ya incluye IVA' },
				{ value: 0, text: 'No, es neto de IVA' },
			]
		},

		/**
		 * Opciones del select de concepto de gasto, con la opción "hereda" primero.
		 *
		 * @returns {Array}
		 */
		expense_concept_options() {
			let options = [
				{ value: null, text: 'Hereda de la caja' },
			]
			this.$store.state.expense_concept.models.forEach(expense_concept => {
				options.push({
					value: expense_concept.id,
					text: expense_concept.name,
				})
			})
			return options
		},

		placeholder_dias_liquidacion() {
			if (this.caja.dias_liquidacion) {
				return this.caja.dias_liquidacion+' (heredado)'
			}
			return 'Sin días (heredado)'
		},

		placeholder_comision_porcentaje() {
			if (this.caja.comision_porcentaje) {
				return this.caja.comision_porcentaje+' (heredado)'
			}
			return 'Sin comisión (heredado)'
		},

		placeholder_comision_iva_alicuota() {
			if (this.caja.comision_iva_alicuota) {
				return this.caja.comision_iva_alicuota+' (heredado)'
			}
			return '21 (heredado)'
		},
	},
	methods: {
		/**
		 * Crea o actualiza el override de esta fila. El backend resuelve el upsert por
		 * caja_id + current_acount_payment_method_id, así que siempre se manda por POST,
		 * exista o no un override previo.
		 *
		 * @returns {void}
		 */
		guardar() {
			this.saving = true
			this.$store.commit('auth/setMessage', 'Guardando configuración de liquidación')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('caja-liquidacion-config', {
				caja_id: this.caja.id,
				current_acount_payment_method_id: this.payment_method.id,
				dias_liquidacion: this.form.dias_liquidacion === '' ? null : this.form.dias_liquidacion,
				comision_porcentaje: this.form.comision_porcentaje === '' ? null : this.form.comision_porcentaje,
				comision_iva_alicuota: this.form.comision_iva_alicuota === '' ? null : this.form.comision_iva_alicuota,
				comision_iva_incluido: this.form.comision_iva_incluido,
				expense_concept_id: this.form.expense_concept_id,
			})
			.then(res => {
				this.$store.commit('caja_liquidacion_config/add', res.data.model)
				this.$toast.success('Configuración guardada')
				this.saving = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('Error al guardar la configuración')
				this.saving = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},

		/**
		 * Elimina el override existente: la fila vuelve a heredar todo de la caja.
		 *
		 * @returns {void}
		 */
		quitar_override() {
			if (!this.config || !this.config.id) {
				return
			}

			this.$store.commit('auth/setMessage', 'Quitando override')
			this.$store.commit('auth/setLoading', true)

			this.$api.delete('caja-liquidacion-config/'+this.config.id)
			.then(() => {
				this.$store.commit('caja_liquidacion_config/setDelete', this.config)
				this.$store.commit('caja_liquidacion_config/delete')
				this.form.dias_liquidacion = null
				this.form.comision_porcentaje = null
				this.form.comision_iva_alicuota = null
				this.form.comision_iva_incluido = null
				this.form.expense_concept_id = null
				this.$toast.success('Override eliminado')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('Error al quitar el override')
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
		},
	},
}
</script>
<style scoped lang="sass">
.liquidacion-config-row
	border: 1px solid #e2e8f0
	border-radius: 8px
</style>
