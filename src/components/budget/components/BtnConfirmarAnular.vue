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
		}
	},
	computed: {
		/**
		 * 🔴 Se lee `model.budget_status_id` DIRECTO, y eso recién ahora es correcto.
		 *
		 * Hasta el 24/8/2026 acá había una foto (`estado_persistido`) tomada en un watcher de
		 * `model.id`, porque el formulario exponía el select "Estado del presupuesto" y
		 * `ModelForm.vue` escribe `$set(model, prop.key, $event)` en vivo sobre el mismo objeto
		 * del store: tocar el select sin guardar daba vuelta el botón a "Anular" y al apretarlo
		 * salía un 422 sobre un presupuesto que en la base seguía sin confirmar.
		 *
		 * Con el select en `only_show` esa mutación ya no existe, y la foto pasó de seguro a
		 * defecto: el watcher mira el id, así que NO se re-dispara cuando el store reemplaza el
		 * objeto conservando el id — que es justo lo que hacen `budget/add` y `budget/setModel`
		 * después de confirmar o anular. Como el `b-modal` de `model/Index.vue` no es `lazy`, la
		 * instancia sobrevive al cierre: anular desde la fila y reabrir el modal dejaba el botón
		 * diciendo "Anular" con el presupuesto ya sin confirmar.
		 *
		 * Leyendo la prop se resuelve solo: es reactiva en los dos usos (en el listado la fila es
		 * `props.model`; en el modal es el computed sobre `$store.state.budget.model`).
		 */
		esta_confirmado() {
			return this.model && this.model.budget_status_id == this.ESTADO_CONFIRMADO
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

					/**
					 * El botón se redibuja solo: `add` reemplaza la fila del listado y `setModel`
					 * el modelo del modal, y `esta_confirmado` lee la prop. Por eso acá no hay que
					 * sincronizar ningún estado local — el que había (`estado_persistido`) es
					 * justamente el que se quedaba viejo.
					 */
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
