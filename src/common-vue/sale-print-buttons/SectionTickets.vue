<template>
	<div>
		<b-dropdown-text>
			Tickets
		</b-dropdown-text>
		<b-dropdown-divider></b-dropdown-divider>

		<b-dropdown-item
		@click.stop="$emit('ticket_pdf')">
			Ticket venta
		</b-dropdown-item>

		<b-dropdown-item
		v-for="afip_ticket in afip_tickets_with_cae"
		:key="'afip-ticket-'+afip_ticket.id"
		@click.stop="$emit('factura_ticket_pdf', afip_ticket.id)">
			Ticket Fac N°{{ afip_ticket.cbte_numero }}
		</b-dropdown-item>

		<!--
			Misión diseno-ticket-comandera (D-L1): en lugar del renglón "Ticket 2.0", los diseños de
			ticket de comandera del negocio (ABM -> Diseño de PDF, con una comandera elegida en
			"Hoja o comandera"). Los de remito por su nombre; los de factura por su nombre y por cada
			comprobante con CAE, igual que Facturas A4. Salen directo a la comandera (ESC/POS por el
			agente o por QZ), no por PDF. El engranaje de cada renglón es el de la impresora y el
			ancho del puesto, el mismo que tenía el Ticket 2.0.
		-->
		<template
		v-if="hay_opciones_de_ticket">
			<b-dropdown-item
			v-for="profile in perfiles_de_ticket_remito"
			:key="'ticket-perfil-'+profile.id"
			:data-testid="'imprimir-ticket-perfil-'+profile.id"
			class="p-0"
			@click="$emit('ticket_perfil', profile.id, null)">
				<div class="sale-print-remito-profile-row">
					<span
					class="sale-print-remito-profile-label"
					role="button"
					tabindex="0"
					@keydown.enter.prevent="$emit('ticket_perfil', profile.id, null)">
						{{ profile.name }}
					</span>
					<b-button
					variant="link"
					size="sm"
					class="sale-print-remito-profile-config p-0"
					title="Configurar impresora y ancho de papel"
					aria-label="Configurar impresora y ancho de papel"
					@click.stop="$emit('configurar_impresora')">
						<i class="icon-configuration"></i>
					</b-button>
				</div>
			</b-dropdown-item>

			<b-dropdown-item
			v-for="option in opciones_de_ticket_factura"
			:key="'ticket-perfil-'+option.profile.id+'-'+option.afip_ticket_id"
			:data-testid="'imprimir-ticket-perfil-'+option.profile.id+'-'+option.afip_ticket_id"
			class="p-0"
			@click="$emit('ticket_perfil', option.profile.id, option.afip_ticket_id)">
				<div class="sale-print-remito-profile-row">
					<span
					class="sale-print-remito-profile-label"
					role="button"
					tabindex="0"
					@keydown.enter.prevent="$emit('ticket_perfil', option.profile.id, option.afip_ticket_id)">
						{{ option.profile.name }} N°{{ option.cbte_numero }}
					</span>
					<b-button
					variant="link"
					size="sm"
					class="sale-print-remito-profile-config p-0"
					title="Configurar impresora y ancho de papel"
					aria-label="Configurar impresora y ancho de papel"
					@click.stop="$emit('configurar_impresora')">
						<i class="icon-configuration"></i>
					</b-button>
				</div>
			</b-dropdown-item>
		</template>

		<!--
			Sin ningún renglón de comandera para esta venta (API vieja, el seeder de los diseños
			por defecto sin correr, o una venta remito en un negocio que solo tiene tickets de
			factura), o una venta con CAE sin ningún ticket de factura (lo borraron): el "Ticket 2.0"
			de siempre (ver mostrar_ticket_2 en Index.vue). Igual le pide a la API el ticket por
			defecto, así que si existe uno armado con cajas sale ese.
		-->
		<b-dropdown-item
		v-if="mostrar_ticket_2"
		class="p-0">
			<div class="sale-print-remito-profile-row">
				<span
				class="sale-print-remito-profile-label"
				role="button"
				@click.stop="$emit('ticket_2')">
					Ticket 2.0
				</span>
				<b-button
				variant="link"
				size="sm"
				class="sale-print-remito-profile-config p-0"
				title="Configurar impresora y ancho de papel"
				aria-label="Configurar impresora y ancho de papel"
				@click.stop="$emit('configurar_impresora')">
					<i class="icon-configuration"></i>
				</b-button>
			</div>
		</b-dropdown-item>
	</div>
</template>

<script>
export default {
	props: {
		afip_tickets_with_cae: {
			type: Array,
			default() {
				return []
			},
		},
		/**
		 * Diseños de ticket de comandera de remito (no fiscales), en el orden en que la API elige
		 * el por defecto.
		 */
		perfiles_de_ticket_remito: {
			type: Array,
			default() {
				return []
			},
		},
		/**
		 * Renglones de ticket de factura: {afip_ticket_id, cbte_numero, profile}, un diseño fiscal
		 * por cada comprobante con CAE de la venta.
		 */
		opciones_de_ticket_factura: {
			type: Array,
			default() {
				return []
			},
		},
		/**
		 * Si hay algún renglón de comandera para esta venta. En false se muestra el "Ticket 2.0"
		 * de siempre.
		 */
		hay_opciones_de_ticket: {
			type: Boolean,
			default: false,
		},
		/**
		 * Si va el renglón "Ticket 2.0" (el ticket por defecto). Por defecto true: sin la prop, el
		 * menú se ve como antes de esta misión.
		 */
		mostrar_ticket_2: {
			type: Boolean,
			default: true,
		},
	},
}
</script>
