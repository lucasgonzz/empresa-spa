<template>
	<div class="ofertas-activas">

		<div class="ofertas-activas__filtros j-start align-end m-b-10">
			<b-form-group
			class="m-r-25 m-b-0"
			label="Estado">
				<b-form-select
				v-model="estado"
				:options="opciones_estado"></b-form-select>
			</b-form-group>
			<b-form-group
			class="m-b-0"
			label="Cliente">
				<b-form-select
				v-model="client_id"
				:options="opciones_cliente"></b-form-select>
			</b-form-group>
		</div>

		<div
		v-if="loading"
		class="text-center m-t-20 m-b-20">
			<b-spinner></b-spinner>
		</div>

		<b-alert
		v-else-if="!ofertas.length"
		show
		variant="info">
			No hay ofertas con estos filtros.
		</b-alert>

		<template v-else>

			<!-- responsive + min-width en el sass: scroll horizontal en vez de celdas apretadas -->
			<b-table
			head-variant="dark"
			responsive
			class="ofertas-activas__tabla"
			:fields="fields"
			:items="ofertas">

				<template #cell(descuento)="data">
					<span v-if="data.item.tipo_descuento == 'cantidad'">
						{{ texto_tramos(data.item) }}
					</span>
					<strong v-else>
						{{ data.item.porcentaje }}%
					</strong>
				</template>

				<!--
					El aviso es un extra, no una precondicion: una oferta sin mail valido
					se activa igual y queda marcada como no avisada.
				-->
				<template #cell(aviso)="data">
					<b-badge
					v-if="data.item.notificada_email_at"
					variant="success"
					:title="data.item.email_destino">
						Mail enviado
					</b-badge>
					<b-badge
					v-else
					variant="secondary"
					title="No habia mail valido ni en el comprador de la tienda ni en el cliente">
						Sin mail
					</b-badge>
					<!--
						🔴 LA RAMA DEL LINK EXTERNO NO ES CÓDIGO MUERTO. No la borres.
						WhatsApp es una extension que se contrata aparte, y `SidebarHost.vue` NO
						MONTA el sidebar sin ella: sin esta rama, el comercio que no la tiene se
						queda con un icono que no hace absolutamente nada. Es el mismo criterio, y
						por el mismo motivo, que la rama wa.me de `mixins/model_functions.js`
						(`sendWhatsApp`), que esta marcada alla con estas mismas palabras.
						El `@click.stop` va por prudencia: la celda vive adentro de una b-table.
					-->
					<b-button
					v-if="data.item.whatsapp_url && puede_abrir_el_agente(data.item)"
					class="m-l-5"
					size="sm"
					variant="link"
					title="Abrir la conversación de WhatsApp con el mensaje ya escrito"
					@click.stop="avisar_por_el_agente(data.item)">
						<i class="bi bi-whatsapp text-success"></i>
					</b-button>
					<a
					v-else-if="data.item.whatsapp_url"
					class="m-l-5"
					target="_blank"
					rel="noopener"
					:href="data.item.whatsapp_url"
					title="Abrir WhatsApp con el mensaje ya escrito">
						<i class="bi bi-whatsapp text-success"></i>
					</a>
				</template>

				<template #cell(acciones)="data">
					<b-button
					v-if="data.item.estado == 'activa'"
					size="sm"
					variant="outline-danger"
					:disabled="cancelando_id == data.item.id"
					@click="cancelar(data.item)">
						Cancelar
					</b-button>
				</template>

			</b-table>

			<b-pagination
			v-if="paginacion.total > paginacion.per_page"
			class="m-0"
			pills
			v-model="pagina_actual"
			:total-rows="paginacion.total"
			:per-page="paginacion.per_page"></b-pagination>

		</template>

	</div>
</template>
<script>
import { telefono_de_chat_de_oferta, mensaje_de_oferta } from '@/utils/whatsapp_phone'
/*
	Las ofertas ya cargadas como promocion: lo que la tienda le muestra hoy a cada
	cliente. Sale del mismo store que las sugeridas, con action y token propios.
*/
export default {
	data() {
		return {
			// id de la oferta que se esta cancelando, para no dejar apretar dos veces.
			cancelando_id: null,
		}
	},
	computed: {
		ofertas() {
			return this.$store.state.offer_suggestion_line.activas
		},
		paginacion() {
			return this.$store.state.offer_suggestion_line.paginacion_activas
		},
		loading() {
			return this.$store.state.offer_suggestion_line.loading_activas
		},
		opciones_estado() {
			return [
				{value: 'activa', text: 'Vigentes'},
				{value: 'vencida', text: 'Vencidas'},
				{value: 'cancelada', text: 'Canceladas'},
			]
		},
		opciones_cliente() {
			let options = [{value: 0, text: 'Todos los clientes'}]
			this.$store.state.client.options.forEach(client => {
				options.push({
					value: client.id,
					text: client.name,
				})
			})
			return options
		},
		estado: {
			get() {
				return this.$store.state.offer_suggestion_line.filtros_activas.estado
			},
			set(value) {
				this.aplicar_filtro({estado: value})
			},
		},
		client_id: {
			get() {
				return this.$store.state.offer_suggestion_line.filtros_activas.client_id
			},
			set(value) {
				this.aplicar_filtro({client_id: value})
			},
		},
		pagina_actual: {
			get() {
				return this.paginacion.page
			},
			set(value) {
				if (value != this.paginacion.page) {
					this.$store.dispatch('offer_suggestion_line/getActivas', {page: value})
				}
			},
		},
		fields() {
			return [
				{label: 'Cliente', key: 'cliente', formatter: (value, key, item) => this.nombre_de(item, 'client')},
				{label: 'Articulo', key: 'articulo', formatter: (value, key, item) => this.nombre_de(item, 'article')},
				{label: 'Tipo', key: 'tipo_descuento', formatter: value => value == 'cantidad' ? 'Por cantidad' : 'Por unidad'},
				{label: 'Descuento', key: 'descuento'},
				{label: 'Desde', key: 'desde', formatter: value => value ? this.date(value) : '—'},
				{label: 'Hasta', key: 'hasta', formatter: value => value ? this.date(value) : '—'},
				{label: 'Aviso al cliente', key: 'aviso'},
				{label: '', key: 'acciones'},
			]
		},
	},
	created() {
		this.$store.dispatch('offer_suggestion_line/getActivas', {page: 1})
	},
	methods: {
		aplicar_filtro(filtro) {
			this.$store.commit('offer_suggestion_line/set_filtros_activas', filtro)
			this.$store.dispatch('offer_suggestion_line/getActivas', {page: 1})
		},
		/**
		 * Nombre del cliente o del articulo. Acepta las dos formas en que el
		 * endpoint puede mandarlo (clave aplanada client_nombre / article_nombre, o
		 * la relacion cargada): el contrato de endpoints no fijo cual, y esta tabla
		 * no es el lugar para romperse por eso.
		 */
		nombre_de(oferta, relacion) {
			if (oferta[relacion + '_nombre']) {
				return oferta[relacion + '_nombre']
			}
			return oferta[relacion] && oferta[relacion].name ? oferta[relacion].name : '—'
		},
		// Tramos por cantidad en una linea: "1 a 5: 10% · 6 o mas: 15%". El ultimo
		// tramo viene siempre con max null (sin techo).
		texto_tramos(oferta) {
			if (!Array.isArray(oferta.ranges) || !oferta.ranges.length) {
				return '—'
			}
			let partes = []
			oferta.ranges.forEach(tramo => {
				let rango = tramo.max ? tramo.min + ' a ' + tramo.max : tramo.min + ' o mas'
				partes.push(rango + ': ' + tramo.porcentaje + '%')
			})
			return partes.join(' · ')
		},
		/**
		 * true cuando el aviso puede salir por el agente en vez de por el link externo.
		 *
		 * El gate es `hasExtencion('whatsapp')` y no otra cosa: es el mismo criterio que ya usan
		 * `BtnWhatsappChat`, `model_functions.sendWhatsApp` y `SidebarHost`, y sin esa extension
		 * el sidebar NI SIQUIERA SE MONTA EN EL DOM, asi que abrirlo seria un click muerto.
		 */
		puede_abrir_el_agente(oferta) {
			return !!this.hasExtencion('whatsapp') && !!telefono_de_chat_de_oferta(oferta)
		},
		/**
		 * Abre el sidebar de WhatsApp con el mensaje de la oferta ya escrito en el composer, en
		 * vez de sacar al operador del sistema a una pestaña de api.whatsapp.com.
		 *
		 * Aca no hay ningun modal que cerrar: la tabla vive en la vista, no adentro de uno.
		 */
		avisar_por_el_agente(oferta) {
			this.abrir_chat_whatsapp({
				phone: telefono_de_chat_de_oferta(oferta),
				client_id: oferta.client_id,
				display_name: oferta.client && oferta.client.name ? oferta.client.name : '',
				borrador: mensaje_de_oferta(oferta.whatsapp_url),
			})
		},
		/**
		 * Cancela una oferta vigente. El backend no borra la fila: le pone
		 * estado 'cancelada', asi que el historial queda. Se recarga la pagina
		 * actual para que la fila salga del filtro "Vigentes".
		 */
		cancelar(oferta) {
			let self = this
			this.cancelando_id = oferta.id
			this.$api.delete('client-offer/' + oferta.id)
			.then(function() {
				self.cancelando_id = null
				self.$store.dispatch('offer_suggestion_line/getActivas', {page: self.paginacion.page})
				self.$bvToast.toast('La oferta ya no se muestra en la tienda.', {
					title: 'Oferta cancelada',
					variant: 'success',
					solid: true,
				})
			})
			.catch(function(err) {
				console.log(err)
				self.cancelando_id = null
				let mensaje = err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: 'No se pudo cancelar la oferta.'
				self.$bvToast.toast(mensaje, {
					title: 'Error',
					variant: 'danger',
					solid: true,
				})
			})
		},
	}
}
</script>
<style lang="sass">
.ofertas-activas
	&__filtros
		flex-wrap: wrap
		row-gap: 10px
	&__tabla
		min-width: 820px
</style>
