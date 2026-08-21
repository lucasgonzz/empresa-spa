<template>
	<!--
		Confirmar y anular un presupuesto como acciones propias.

		Antes esto era un efecto colateral de guardar el presupuesto con el select de estado en
		"Confirmado", y desconfirmarlo no se podía: el select solo se cambia guardando, y el botón de
		guardar está escondido cuando el presupuesto ya está confirmado.

		El mismo componente sirve para el listado y para el header del modal, así la regla de cuál de
		los dos botones va no queda escrita en dos lugares.
	-->
	<b-button
	class="m-l-5"
	size="sm"
	:variant="esta_confirmado ? 'outline-danger' : 'primary'"
	:disabled="loading"
	@click.stop="accionar"
	v-b-tooltip.hover
	:title="esta_confirmado ? 'Anular el presupuesto y eliminar su venta' : 'Confirmar el presupuesto y generar la venta'">
		<i
		class="m-r-5"
		:class="esta_confirmado ? 'icon-cancel' : 'icon-check'"></i>
		{{ esta_confirmado ? 'Anular' : 'Confirmar' }}
	</b-button>
</template>
<script>
export default {
	props: {
		/**
		 * Presupuesto: una fila del listado, o el modelo abierto en el modal.
		 */
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/** Evita dobles POST mientras la petición está en curso. */
			loading: false,
			/**
			 * Ids de `budget_statuses`, que es una tabla global, sembrada y de solo lectura.
			 * Ya estaban hardcodeados en `Budget.vue` y en `BtnActualizarEnVender`.
			 */
			ESTADO_CONFIRMADO: 2,
			/**
			 * 🔴 Estado tal como está GUARDADO, no el que muestra el formulario.
			 *
			 * En el modal, `model` es `$store.state.budget.model`, que es el mismo objeto que el
			 * formulario escribe en vivo: `ModelForm.vue` hace `$set(model, prop.key, $event)` en
			 * cada `@input`, y `models/budget.js` sigue exponiendo el select "Estado del
			 * presupuesto". Si el botón leyera `model.budget_status_id`, cambiar ese select SIN
			 * guardar lo daba vuelta a "Anular", y al apretarlo salía un 422 "El presupuesto no
			 * esta confirmado" sobre algo que en la base seguía sin confirmar.
			 *
			 * En el listado el problema no existe (ahí `props.model` es la fila persistida), pero la
			 * foto sirve igual y deja el componente andando igual en los dos lugares.
			 */
			estado_persistido: null,
		}
	},
	computed: {
		esta_confirmado() {
			return this.estado_persistido == this.ESTADO_CONFIRMADO
		},
	},
	watch: {
		/**
		 * Se re-saca la foto cuando el botón pasa a representar OTRO presupuesto. No alcanza con
		 * hacerlo en `created`: en el modal el componente se reusa entre presupuestos distintos.
		 *
		 * Se mira el id y no el estado, justamente para que la mutación del select —que no cambia el
		 * id— no vuelva a disparar esto.
		 */
		'model.id': {
			immediate: true,
			handler() {
				this.estado_persistido = this.model ? this.model.budget_status_id : null
			},
		},
	},
	methods: {
		accionar() {
			if (this.loading) {
				return
			}
			if (!this.model || !this.model.id) {
				return
			}

			if (this.esta_confirmado) {
				this.anular()
			} else {
				this.confirmar()
			}
		},
		/**
		 * Confirma sin preguntar: es constructivo y se deshace con Anular.
		 */
		confirmar() {
			this.pedir('confirmar', 'Confirmando presupuesto', 'Presupuesto confirmado')
		},
		/**
		 * Anular elimina la venta que generó el presupuesto, así que sí pregunta.
		 *
		 * El texto no nombra el número de la venta a propósito: el presupuesto no la trae
		 * (`Budget::scopeWithAll` no carga la relación `sale`) y agregarla obligaría a hidratar una
		 * venta por cada fila del listado solo para escribir un cartel.
		 */
		anular() {
			if (!confirm('¿Seguro que quiere anular este presupuesto? Se va a eliminar la venta que generó y el presupuesto vuelve a "Sin confirmar".')) {
				return
			}

			this.pedir('anular', 'Anulando presupuesto', 'Presupuesto anulado')
		},
		/**
		 * Las dos acciones comparten el mismo ciclo: loading global, refresco del listado, refresco
		 * del modelo abierto si es el mismo, y recarga del cliente para que el saldo de su cuenta
		 * corriente quede al día (igual que hace `Budget.vue` en `modelSaved`).
		 */
		pedir(accion, mensaje_cargando, mensaje_ok) {
			this.loading = true
			this.$store.commit('auth/setMessage', mensaje_cargando)
			this.$store.commit('auth/setLoading', true)

			this.$api.post('budget/' + this.model.id + '/' + accion, {})
				.then(res => {
					this.terminar()
					this.$toast.success(mensaje_ok)

					let budget = res.data.model

					/** La foto se actualiza con lo que devolvió el servidor, no con lo que se supuso. */
					this.estado_persistido = budget.budget_status_id

					this.$store.commit('budget/add', budget)

					/** Si el modal está abierto sobre este mismo presupuesto, que no quede viejo. */
					let abierto = this.$store.state.budget.model
					if (abierto && abierto.id == budget.id) {
						this.$store.commit('budget/setModel', {
							model: budget,
							properties: [],
						})
					}

					if (budget.client_id) {
						this.loadModel('client', budget.client_id)
					}
				})
				.catch(err => {
					this.terminar()

					/*
						Si el back mandó un mensaje, acá no se muestra nada: ya lo mostró el handler
						global (`main.js` despacha `errorEvent` para cualquier 4xx que no sea
						validación de Laravel, y `common-vue/components/error/Index.vue` hace el
						`$toast.warning`). Un toast local encima sería el mismo texto dos veces.

						Los 422 de `anular` vienen de
						`SaleHelper::motivo_por_el_que_no_se_puede_editar()`, que ya está redactado
						para el usuario: "La venta ya fue facturada...", "El comercio tiene cajas
						configuradas...".
					*/
					let hay_mensaje_del_back = Boolean(err.response && err.response.data && err.response.data.message)

					if (!hay_mensaje_del_back) {
						this.$toast.error('No se pudo completar la acción', {
							duration: 8000
						})
					}
				})
		},
		terminar() {
			this.loading = false
			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
		},
	},
}
</script>
