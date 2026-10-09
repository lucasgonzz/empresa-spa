<template>
	<btn-loader
	v-if="model.id && !model.buyer && buyer_creado_para != model.id"
	variant="outline-primary"
	:loader="loading"
	@clicked="createBuyer"
	text="Crear usuario para la tienda" />
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	components: {
		BtnLoader,
	},
	props: {
		model: Object,
	},
	data() {
		return {
			loading: false,
			// Id del cliente al que esta instancia ya le creo el usuario de la tienda.
			// Va por id y no como booleano porque el modal puede reusar esta misma
			// instancia al abrir la ficha de otro cliente.
			buyer_creado_para: null,
		}
	},
	methods: {
		/**
		 * Crea el comprador de la tienda para el cliente de la ficha.
		 *
		 * Defecto medido el 8/10/2026 en demo2: el boton no desaparecia despues de crear
		 * el usuario y un segundo clic creaba OTRO comprador para el mismo cliente. El
		 * motivo es que `client` no tiene `full_reactivity`, asi que el modal le pasa a este
		 * componente una copia plana ({...state.client.model}) que Vue no observa: cargarle
		 * `buyer` a esa copia no re-renderiza nada. Por eso el boton se esconde con un dato
		 * local (`buyer_creado_para`) y no esperando a que `model.buyer` aparezca.
		 *
		 * Tampoco se toca `state.client.model` (ni se llama a `setModel`): eso recalcula la
		 * copia del modal y borra lo que la persona tipeo en la ficha sin guardar, y el caso
		 * tipico es justo ese: escribe el correo y aprieta "Crear usuario" sin guardar antes.
		 * Lo que si se actualiza es la fila del cliente en la lista (`client/add` la
		 * reemplaza con splice, sin mutar el objeto que el modal ya copio), asi al cerrar y
		 * volver a abrir la ficha el boton no reaparece.
		 */
		createBuyer() {
			if (this.loading) {
				return
			}
			if (this.check()) {
				// El id se guarda ahora: si mientras viaja el pedido el modal pasa a otro
				// cliente, la respuesta tiene que marcar al cliente al que se le creo.
				let client_id = this.model.id
				this.loading = true 
				this.$api.post('buyer', {
					...this.model,
				})
				.then(res => {
					this.loading = false
					this.$store.commit('buyer/add', res.data.model)
					this.buyer_creado_para = client_id
					this.actualizarFilaDelCliente(client_id, res.data.model)
					if (res.data.ya_existia) {
						this.$toast.info('Este cliente ya tenía usuario en la tienda')
					} else {
						this.$toast.success('Usuario creado')
					}
				})
				.catch(err => {
					this.loading = false
					console.log(err)
					this.$toast.error('Error al crear usuario')
				})
			}
		},
		/**
		 * Le carga el comprador a la fila del cliente en la lista (`models` o, si no esta
		 * ahi, `filtered`) para que reabrir la ficha sin recargar la app no traiga el boton
		 * de vuelta. Si el cliente no esta en ninguna de las dos listas no hay nada que
		 * actualizar y alcanza con `buyer_creado_para`.
		 */
		actualizarFilaDelCliente(client_id, buyer) {
			let state = this.$store.state.client
			let fila = state.models.find(item => item.id == client_id)
			if (!fila) {
				fila = state.filtered.find(item => item.id == client_id)
			}
			if (fila) {
				this.$store.commit('client/add', {
					...fila,
					buyer: buyer,
				})
			}
		},
		check() {
			if (!this.model.email || this.model.email == '') {
				this.$toast.error('Ingrese un email para el cliente')
				return false
			}
			return true
		}
	}
}
</script>