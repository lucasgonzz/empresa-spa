<template>
<b-modal
@show="on_modal_opened"
:no-close-on-backdrop="backdrop"
:id="id" hide-footer hide-header size="sm">
	<p
	class="text-center">
		{{ confirm_text }}
	</p>
	<div
	v-if="show_compensar_caja_checkbox"
	class="m-b-10">
		<b-form-checkbox
		data-testid="confirm-compensar-caja"
		v-model="compensar_caja">
			Compensar caja (movimiento inverso por cada método de pago con caja)
		</b-form-checkbox>
	</div>
	<!--
		El testid lleva el id del modal porque este componente se usa para confirmar cosas muy
		distintas (borrar una venta, borrar registros de cualquier modelo) y puede haber mas de uno
		montado a la vez.
	-->
	<btn-loader
	:data-testid="'btn-confirmar-'+id"
	:variant="variant"
	@clicked="confirm"
	:text="btn_text"
	:loader="loading"></btn-loader>
	<slot name="footer">
	</slot>
</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	name: 'Confirm',
	components: {
		BtnLoader,
	},
	data() {
		return {
			loading: false,
			/**
			 * Marca si al confirmar el borrado se debe enviar `compensar_caja` al backend (movimientos de caja inversos).
			 * Se reinicia al abrir el modal según `compensar_caja_default`.
			 */
			compensar_caja: true,
		}
	},
	props: {
		text: {
			type: String,
			default: null,
		},
		actions: {
			type: Array,
			default: () => {
				return []
			}
		},
		id: String,
		toast: {
			type: String,
			default: 'Eliminado'
		},
		btn_text: {
			type: String,
			default: 'Eliminar'
		},
		variant: {
			type: String,
			default: 'danger'
		},
		not_show_delete_text: {
			type: Boolean,
			default: false,
		},
		emit: {
			type: String,
			default: null,
		},
		backdrop: {
			type: Boolean,
			default: false,
		},
		model_name: String,
		/**
		 * Si es true, muestra el checkbox para registrar compensación en caja al eliminar (venta, gasto, pago CC).
		 */
		show_compensar_caja_checkbox: {
			type: Boolean,
			default: false,
		},
		/**
		 * Valor inicial del checkbox cada vez que se abre el modal (por defecto marcado).
		 */
		compensar_caja_default: {
			type: Boolean,
			default: true,
		},
	},
	computed: {
		confirm_text() {
			/*
				Un texto que ya es una pregunta completa ("¿Seguro que quiere revertir…?") se muestra
				tal cual: envolverlo en "¿Seguro que quiere eliminar …?" lo duplica, aunque el que lo
				use se haya olvidado de not_show_delete_text (pasó en el historial de masivas, 4/10/2026).
			*/
			/*
				`not_show_delete_text` muestra el texto tal cual SOLO si hay texto. Sin texto cae en la
				pregunta por defecto del modelo: antes devolvía el `text` vacío y el cartel quedaba en
				blanco, con solo el botón Eliminar (pasó con el plan de pago, 4/10/2026).
			*/
			if (this.text_es_pregunta || (this.not_show_delete_text && this.text)) {
				return this.text
			} else if (this.text) {
				return '¿Seguro que quiere eliminar '+this.text+'?'
			} else if (this.model_name) {
				return '¿Seguro que quiere eliminar '+this.text_delete(this.model_name)+' '+this.singular(this.model_name).toLowerCase()+'?'
			}
			// Sin texto ni modelo no hay pregunta que armar (el require del modelo reventaría).
			return this.text
		},
		/**
		 * True si el texto recibido ya arranca con "¿", o sea que es una pregunta armada por quien
		 * usa el confirm y no un fragmento para completar "¿Seguro que quiere eliminar …?".
		 *
		 * @returns {Boolean}
		 */
		text_es_pregunta() {
			return typeof this.text === 'string' && this.text.trim().indexOf('¿') === 0
		},
	},
	methods: {
		/**
		 * Reinicia el estado del checkbox al valor por defecto cada vez que el usuario abre el modal.
		 *
		 * @returns {void}
		 */
		on_modal_opened() {
			this.compensar_caja = this.compensar_caja_default
		},
		async confirm() {
			if (this.emit) {
	            this.$emit(this.emit)
	            this.$bvModal.hide(this.id)
	            return
	        }

	        this.loading = true

	        try {

	            // El flag lo lee la acción de borrado: tiene que estar ANTES de despacharla.
	            if (this.show_compensar_caja_checkbox && this.model_name) {
	            	this.$store.commit(this.model_name + '/setCompensarCajaDelete', this.compensar_caja)
	            }
	            
	            // Ejecuta una por una, en orden. Si alguna falla, salta al catch.
	            for (let i = 0; i < this.actions.length; i++) {
	                await this.$store.dispatch(this.actions[i])
	            }

	            /*
	            	'confirmed' sale recién acá, cuando las acciones salieron bien. Salía antes de
	            	despacharlas: model/Index lo convierte en `modelDeleted` y caja recargaba sus
	            	movimientos aunque el borrado fallara (4/10/2026).
	            */
	            this.$emit('confirmed')

	            /*
	            	Si llegó acá, salieron todas bien. El aviso (por defecto "Eliminado") es del
	            	trabajo que hizo el confirm: si no corrió ninguna acción propia, lo único que hizo
	            	fue avisarle al padre con 'confirmed', y el aviso le toca al padre. Sin esta guarda,
	            	un confirm que no es de borrado y se olvida del emit muestra "Eliminado" encima del
	            	aviso propio (historial de masivas, 4/10/2026).
	            */
	            if (this.actions.length) {
	            	this.$toast.success(this.toast)
	            }
	            this.$bvModal.hide(this.id)
	            if (this.model_name) {
	                this.$bvModal.hide(this.model_name)
	            }
	            this.$emit('confirmed_final') 
	        } catch (err) {
	            // Corta acá en el primer error
	            this.$toast.error('Error al ejecutar la acción')

	            /*
	            	El detalle del servidor ya lo mostró el interceptor global (main.js → errorEvent →
	            	common-vue/components/error/Index.vue) cuando el error trae `response` y el pedido
	            	no pidió `skip_global_error_event`: repetirlo acá lo mostraba dos veces (medido con
	            	un 500, 4/10/2026). Se agrega cuando el error no trae el detalle del servidor: un error
	            	de red (el interceptor avisa solo que no hubo conexión, no qué acción falló), un
	            	pedido silenciado o un error que no vino de un pedido.
	            */
	            let ya_lo_mostro_el_interceptor = !!(err && err.response && !(err.config && err.config.skip_global_error_event))
	            if (!ya_lo_mostro_el_interceptor) {
	            	let msg = String(err)
	            	if (err && err.response && err.response.data && err.response.data.message) {
	            		msg = err.response.data.message
	            	} else if (err && err.message) {
	            		msg = err.message
	            	}
	            	this.$toast.error(msg)
	            }
	        } finally {
	            this.loading = false
	        }
		},
	}
}
</script>
