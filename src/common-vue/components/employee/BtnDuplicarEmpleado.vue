<template>
	<span class="btn-duplicar-empleado">
		<b-button
		size="sm"
		variant="outline-secondary"
		class="btn-duplicar-empleado__boton"
		v-b-tooltip.hover
		title="Crear un empleado nuevo con los mismos permisos y accesos"
		@click.stop="abrir">
			<i class="bi bi-files m-r-5"></i>
			Duplicar
		</b-button>

		<b-modal
		:id="id_del_modal"
		ref="modal"
		:title="'Duplicar a ' + model.name"
		ok-title="Crear empleado"
		cancel-title="Cancelar"
		:ok-disabled="guardando"
		no-close-on-backdrop
		@ok="guardar"
		@shown="enfocar_nombre">

			<p class="btn-duplicar-empleado__explicacion">
				Se crea un empleado nuevo con <strong>los mismos permisos y accesos</strong> que
				<strong>{{ model.name }}</strong>: sucursal, perfil de vendedor, cajas, alertas y
				todo lo que tiene tildado. Completá solo los datos de la persona nueva.
			</p>

			<b-form-group
			label="Nombre">
				<b-form-input
				ref="nombre"
				v-model="nombre"
				autocomplete="off"
				placeholder="Ej: Juan Pérez"
				@keydown.enter.prevent="guardar"></b-form-input>
			</b-form-group>

			<b-form-group
			label="N° de documento"
			description="Es con lo que va a ingresar al sistema. No puede repetirse.">
				<b-form-input
				v-model="doc_number"
				autocomplete="off"
				@keydown.enter.prevent="guardar"></b-form-input>
			</b-form-group>

			<b-form-group
			label="Contraseña">
				<b-form-input
				v-model="visible_password"
				autocomplete="off"
				@keydown.enter.prevent="guardar"></b-form-input>
			</b-form-group>

			<b-form-group
			label="Teléfono (opcional)">
				<b-form-input
				v-model="phone"
				autocomplete="off"
				@keydown.enter.prevent="guardar"></b-form-input>
			</b-form-group>

			<p
			v-if="error"
			class="btn-duplicar-empleado__error"
			role="alert">
				{{ error }}
			</p>
		</b-modal>
	</span>
</template>
<script>
/**
 * Duplicar un empleado desde la tabla del listado de empleados.
 *
 * Pide solo lo que es de la persona nueva (nombre, documento, contraseña, teléfono) y le manda
 * al API `POST employee/{id}/duplicate`, que copia el perfil de acceso completo: permisos, cajas,
 * sucursal, perfil de vendedor, alertas. El resultado se suma al store de empleados, igual que
 * cuando se crea uno desde el formulario.
 */
export default {
	props: {
		/**
		 * Empleado de la fila (con id y name).
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			nombre: '',
			doc_number: '',
			visible_password: '',
			phone: '',
			guardando: false,
			error: '',
		}
	},
	computed: {
		id_del_modal() {
			return 'duplicar-empleado-' + this.model.id
		},
	},
	methods: {
		abrir() {
			this.nombre = ''
			this.doc_number = ''
			this.visible_password = ''
			this.phone = ''
			this.error = ''
			this.guardando = false
			this.$bvModal.show(this.id_del_modal)
		},
		enfocar_nombre() {
			if (this.$refs.nombre) {
				this.$refs.nombre.focus()
			}
		},
		/**
		 * Manda el duplicado. El modal se cierra a mano solo si salió bien: si el documento ya
		 * existe queda abierto con el mensaje, para corregirlo sin volver a escribir todo.
		 *
		 * @param {Object} evento Evento `ok` del modal (o el keydown del input).
		 * @return {void}
		 */
		guardar(evento) {
			if (evento && evento.preventDefault) {
				evento.preventDefault()
			}
			if (this.guardando) {
				return
			}
			this.error = ''
			if (!this.nombre.trim() || !this.doc_number.trim() || !this.visible_password.trim()) {
				this.error = 'Completá el nombre, el número de documento y la contraseña.'
				return
			}
			this.guardando = true
			let self = this
			this.$api.post('employee/' + this.model.id + '/duplicate', {
				name: this.nombre,
				doc_number: this.doc_number,
				visible_password: this.visible_password,
				phone: this.phone,
			})
			.then(res => {
				self.guardando = false
				self.$store.commit('employee/add', res.data.model)
				self.$toast.success('Empleado creado con los permisos de ' + self.model.name)
				self.$bvModal.hide(self.id_del_modal)
			})
			.catch(err => {
				self.guardando = false
				let mensaje = 'No se pudo duplicar el empleado.'
				if (err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				self.error = mensaje
			})
		},
	},
}
</script>
<style lang="sass" scoped>
.btn-duplicar-empleado__boton
	white-space: nowrap

.btn-duplicar-empleado__explicacion
	font-size: 0.9rem
	color: var(--color-text-secondary, #6e6e73)

.btn-duplicar-empleado__error
	margin: 0
	font-size: 0.9rem
	color: var(--color-text-danger-strong, #c0392b)
</style>
