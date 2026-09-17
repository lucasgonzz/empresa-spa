<template>
	<div v-if="factura">

		<!--
			🔴 La leyenda del modo automatico. Aparece al ENTRAR a la factura, no cuando la persona
			intenta editar algo: lo que tiene que entender es por que esa tabla no se toca, y sobre
			todo como salir. La salida esta a un clic -- el modo de facturacion vive en la compra,
			en la solapa "Facturacion", no adentro de la factura.

			Dice lo mismo que contesta la API si alguien pega igual (la constante
			MENSAJE_MODO_AUTOMATICO de ProviderOrderAfipTicketIvaController): las dos puntas tienen
			que explicar la misma salida, porque un 422 con otro texto es un callejon.
		-->
		<b-alert
		v-if="es_modo_automatico"
		show
		variant="info"
		class="m-b-15">
			Las alicuotas de IVA de esta factura las calcula el sistema a partir de los articulos de
			la compra, porque el modo de facturacion es <strong>Automatico</strong>. Para editarlas a
			mano y cambiar el total, pasa el modo de facturacion de la compra a
			<strong>Manual</strong>.
		</b-alert>

		<!--
			MODO AUTOMATICO: la tabla, de solo lectura.

			🔴 `set_model_on_row_selected` en false es lo que la vuelve de solo lectura de verdad, y
			por eso aca NO se usa `<has-many>`. Con el has_many generico se puede apagar el boton
			"Agregar" (has_many.show_btn_create, HasMany.vue:79) pero no se puede evitar que un clic
			en la fila abra el modal de la alicuota -- HasMany no le pasa esa bandera a la tabla, ni
			tampoco `show_btn_delete` al modal. O sea que con `show_btn_create` solo, "no se pueden
			agregar" quedaba cumplido y "no se pueden editar ni borrar" no.

			Es la misma `table-component` con las mismas banderas que le pasa HasMany.vue, asi que
			se ve igual que en modo manual: lo unico que cambia es que la fila no abre nada.
		-->
		<table-component
		v-if="es_modo_automatico"
		disable_scroll
		is_from_has_many
		:set_model_on_row_selected="false"
		:models="alicuotas"
		:model_name="prop_alicuotas.has_many.model_name"></table-component>

		<!--
			MODO MANUAL: el has_many de siempre, entero.

			🔴 POR QUE ESTE COMPONENTE ENVUELVE A `<has-many>` EN VEZ DE REEMPLAZARLO.

			Los tres importes con calculo en vivo tienen que vivir adentro del modal de la ALICUOTA,
			que es un has_many adentro de otro has_many (compra -> factura -> alicuota). La cadena
			de slots del andamiaje generico llega a UN solo nivel: `HasMany.vue:13-22` reenvia
			`has-many-prop-<key>` usando las props del modelo HIJO, asi que las del NIETO
			(`has-many-prop-neto` y compania) nunca se declaran y se pierden en el camino.

			Montando `<has-many>` desde aca, este componente pasa a ser el padre directo del
			has_many de las alicuotas, y los slots llegan por el camino normal:

				AlicuotasIva -> HasMany -> model/Index -> ModelForm(alicuota) -> <slot :name="prop.key">

			Sin tocar una linea de ModelForm.vue, HasMany.vue ni GroupPorps.vue, que son el
			andamiaje de TODOS los ABM del sistema.

			Lo unico que se pierde son los eventos `modelSaved` / `modelDeleted`, que ModelForm
			reenviaba como `has_many_saved` / `has_many_deleted`: en este anidamiento no los escucha
			nadie igual (HasMany.vue solo engancha `modelDeleted` y `modelSaved` de su propio
			model-component), asi que no cambia ningun comportamiento.
		-->
		<has-many
		v-else
		:prop="prop_alicuotas"
		:parent_model="factura"
		parent_model_name="provider_order_afip_ticket">

			<template #has-many-prop-iva_id>
				<alicuota-campo campo="iva_id"></alicuota-campo>
			</template>

			<template #has-many-prop-neto>
				<alicuota-campo campo="neto"></alicuota-campo>
			</template>

			<template #has-many-prop-iva_importe>
				<alicuota-campo campo="iva_importe"></alicuota-campo>
			</template>

			<template #has-many-prop-bruto>
				<alicuota-campo campo="bruto"></alicuota-campo>
			</template>

		</has-many>

	</div>
</template>
<script>
/**
 * Las alicuotas de IVA de una factura de compra.
 *
 * Mision `compras-factura-manual-alicuotas` (17/9/2026). Se monta desde el slot
 * `has-many-prop-provider_order_afip_ticket_ivas`, o sea que reemplaza el input generico de esa
 * prop adentro del formulario de la factura -- `ModelForm.vue:87`. El label ("Alicuotas IVA") y el
 * ancho completo (`full_cols`) los sigue poniendo ModelForm: eso no se toca.
 *
 * 🔴 EL SLOT SE DECLARA EN LAS TRES PUERTAS AL MODAL DE COMPRA, no en una sola:
 *
 *   - src/components/provider/components/orders/Index.vue  (la pantalla de Compras)
 *   - src/views/Reportes.vue                               (el drill-down de un reporte)
 *   - src/components/common/current-acounts/Index.vue      (la cuenta corriente del proveedor)
 *
 * Un slot solo lo puede llenar un ANCESTRO, y las tres montan el modal por su cuenta. Con la
 * declaracion en una sola, la misma factura con los mismos datos se ve completa desde Compras y
 * pelada desde las otras dos --sin Bruto, sin calculo en vivo y sin la leyenda del modo
 * automatico--, que es peor que no tener la funcionalidad. Si aparece una cuarta puerta, va la
 * misma linea.
 *
 * Hace dos cosas: monta el has_many de las alicuotas con los tres importes de calculo en vivo
 * (ver el comentario del template), y aplica el bloqueo del modo de facturacion automatico.
 */
export default {
	components: {
		HasMany: () => import('@/common-vue/components/model/HasMany'),
		TableComponent: () => import('@/common-vue/components/display/table/Index'),
		AlicuotaCampo: () => import('@/components/provider/components/orders/afip-ticket/AlicuotaCampo'),
	},
	computed: {
		/**
		 * La factura en edicion, leida derecho del store. Es el mismo objeto que HasMany le pasa al
		 * formulario como `has_many_parent_model`.
		 */
		factura() {
			return this.$store.state.provider_order_afip_ticket.model
		},
		/**
		 * La compra a la que cuelga la factura: el modelo PADRE, donde vive `modo_facturacion`.
		 *
		 * Se lee del store de `provider_order` y no de una prop porque la cadena de slots no
		 * reenvia ningun scope: `HasMany.vue` declara `<slot :name="'has-many-prop-'+prop.key">`
		 * sin bindear nada, asi que lo que llega hasta aca no trae ni el modelo ni el padre. Es el
		 * mismo patron que usan los componentes de "modal-props" del listado.
		 */
		compra() {
			return this.$store.state.provider_order.model
		},
		/**
		 * Si la compra calcula sus alicuotas sola a partir de los articulos.
		 *
		 * La guarda del `provider_order_id` no es decorativa: el store de `provider_order` tiene
		 * una sola compra cargada, y si la factura que se esta editando colgara de otra (una
		 * pantalla que abre el modal sin pasar por la compra), estariamos bloqueando por el modo de
		 * una compra que no es la suya. Ante la duda NO se bloquea: la API igual rechaza el
		 * guardado con 422 y el mismo texto de la leyenda, asi que no hay forma de que se cuele un
		 * dato malo.
		 *
		 * @returns {Boolean}
		 */
		es_modo_automatico() {
			if (!this.compra || this.compra.modo_facturacion != 'automatico') {
				return false
			}

			if (this.factura.provider_order_id && this.factura.provider_order_id != this.compra.id) {
				return false
			}

			return true
		},
		/**
		 * La definicion de la prop `provider_order_afip_ticket_ivas`, tal cual esta declarada en
		 * src/models/provider_order_afip_ticket.js. Se lee del modelo y no se escribe a mano para
		 * que el has_many de aca sea exactamente el que hubiera montado ModelForm.
		 */
		prop_alicuotas() {
			return this.modelPropertiesFromName('provider_order_afip_ticket').find(model_prop => {
				return model_prop.key == 'provider_order_afip_ticket_ivas'
			})
		},
		/**
		 * Las filas de alicuotas de esta factura. Array vacio cuando la factura recien se esta
		 * creando: la prop del has_many no declara `value`, asi que el modelo nuevo que arma el
		 * store trae la clave en `undefined` y la tabla espera un array.
		 *
		 * @returns {Array}
		 */
		alicuotas() {
			if (!this.factura || !this.factura[this.prop_alicuotas.key]) {
				return []
			}

			return this.factura[this.prop_alicuotas.key]
		},
	},
}
</script>
