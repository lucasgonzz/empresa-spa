<template>
	<!--
		Elemento `servicio` del diseño de Vender (mision diseno-vender-configurable, 28/9/2026): la
		raiz era un <b-col cols="12" :md="services_col_header_lg"> con margenes para apilarse; ahora
		es un div suelto y el ancho y el aire entre campos los pone el diseño en uso
		(layout/GrillaDeEtapa.vue). La cuenta del ancho se mudo al `cols` de `servicio` en
		layout/elementos.js.
	-->
	<div>
		<service
		:service="service"></service>
		<b-form-input
		id="service_name"
		@keyup.enter="setService"
		v-model="service.name"
		placeholder="Servicio"></b-form-input>
	</div>
</template>
<script>
import Service from '@/components/vender/modals/Service'

import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components: {
		Service,
	},
	data() {
		return {
			service: {
				name: '',
				price: '',
			},
		}
	},
	methods: {
		setService() {
			if (this.check()) {
				this.$bvModal.show('service')
				setTimeout(() => {
					document.getElementById('service_price').focus()
				}, 500)
			}
		},
		check() {
			if (this.service.name == '') {
				this.$toast.error('Ingrese un nombre para el servicio')
				return false 
			}
			return true 
		}
	}
}
</script>