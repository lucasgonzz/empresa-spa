<template>
	<div>

		<!--
			Prompt 612: reemplaza el input generico de ModelForm (slot #cost en Listado.vue) para
			poder agregarle debajo una descripcion PERMANENTE (no popover). Reusa "field-text-input"
			(el mismo componente que renderiza ModelForm.vue para prop.type == 'text') para no
			duplicar el formateo de precio ni el resto del comportamiento del campo "costo".
		-->
		<field-text-input
		model_name="article"
		:prop="prop"
		:value="article.cost"
		:disabled="false"
		:prop_text="label_del_campo"
		:price_value="price(article.cost)"
		:has_bar_code_scanner="false"
		@input="set_costo($event)"></field-text-input>

		<!--
			Mision costo-bruto-por-condicion-fiscal (20/8/2026): el toggle solo existe para
			Responsable Inscripto, que es el unico que puede elegir. El Monotributista carga siempre
			el bruto (recibe Factura B, donde el IVA no viene discriminado y el neto no figura), asi
			que no se le muestra una opcion que no tiene.
		-->
		<div v-if="!cuenta_es_monotributista" class="m-t-5">
			<b-form-checkbox
			v-model="cost_incluye_iva"
			switch
			@change="cambiar_modo($event)">
				<span class="text-muted">El costo que estoy cargando incluye IVA</span>
			</b-form-checkbox>
		</div>

		<!--
			Descripcion permanente (Prompt 612): antes esta aclaracion solo estaba en el popover de
			"description" del prop (visible solo al hacer click en el label), lo que generaba
			confusion, sobre todo al Monotributista, que ve un costo distinto al de la factura de
			su proveedor. Ahora queda siempre visible y cambia segun la condicion de IVA de la cuenta.
		-->
		<small class="text-muted d-block m-t-5">
			<span v-if="modo_bruto">
				Carga el costo tal cual figura en la factura de tu proveedor, con IVA incluido. El sistema calcula solo el costo sin IVA.
				<template v-if="costo_neto_derivado !== null">
					Costo sin IVA: <strong>{{ price(costo_neto_derivado) }}</strong>.
				</template>
			</span>
			<span v-else>
				Costo base sin IVA. El IVA se suma al final segun la alicuota del articulo.
			</span>
		</small>

	</div>
</template>
<script>
export default {
	components: {
		FieldTextInput: () => import('@/common-vue/components/model/form/FieldTextInput'),
	},
	data() {
		return {
			/**
			 * Que representa el numero que hay AHORA en el input: true = bruto (con IVA),
			 * false = neto. Viaja al backend como "cost_incluye_iva" dentro del modelo, y es lo que
			 * ArticlePricesHelper::costo_tipeado_es_bruto() usa para decidir si descomponer.
			 *
			 * 🔴 Es una decision DE ENTRADA ("lo que estoy tipeando ahora incluye IVA"), no un
			 * estado del articulo: no se guarda ninguna columna con esto. A proposito NO se repite
			 * el patron de campos excluyentes de price / percentage_gain -- ese patron, escrito con
			 * tres criterios distintos en tres lugares, es el que dejaba articulos con los dos
			 * inputs bloqueados y sin salida (Mision 44, ver CriterioDePrecioHelper en la API).
			 */
			cost_incluye_iva: false,
		}
	},
	computed: {
		/**
		 * Articulo en edicion (modal de ModelForm), leido directo del store, mismo patron
		 * que el resto de los componentes de "modal-props" de este mismo modulo (PriceInput.vue,
		 * PercentageGainInput.vue).
		 */
		article() {
			return this.$store.state.article.model
		},
		/**
		 * Definicion declarativa del campo "cost" (src/models/article.js), necesaria para
		 * reusar "field-text-input" con el mismo comportamiento (formateo de precio, etc.)
		 * que usa ModelForm.vue para este mismo prop.
		 */
		prop() {
			return this.modelPropertiesFromName('article').find(model_prop => model_prop.key == 'cost')
		},
		/**
		 * Condicion fiscal leida del OWNER, no del usuario logueado.
		 *
		 * 🔴 Es a proposito que no se use la computed global "es_monotributista" (src/mixins/
		 * generals.js), que lee this.user: si un EMPLEADO edita un articulo, this.user es el
		 * empleado y no tiene condicion_iva_precios, asi que el front decidiria "Responsable
		 * Inscripto" mientras el backend decide por el owner (UserHelper::user() devuelve el owner).
		 * Las dos puntas discreparian y el costo se descompondria mal, en silencio.
		 *
		 * La computed global tiene ese mismo riesgo desde el prompt 612 y deberia alinearse, pero
		 * eso es de otra mision: aca no se hereda el problema.
		 */
		cuenta_es_monotributista() {
			return !!(this.owner && this.owner.condicion_iva_precios == 'MT')
		},
		/**
		 * El Monotributista no elige: siempre bruto. El Responsable Inscripto manda con el toggle,
		 * que arranca en el default de su cuenta (users.costos_cargados_con_iva).
		 */
		modo_bruto() {
			return this.cuenta_es_monotributista || this.cost_incluye_iva
		},
		/**
		 * El label dice en que moneda esta el campo. Sin esto, "Costo base" arriba de un numero con
		 * IVA adentro es exactamente la confusion que esta mision vino a sacar.
		 */
		label_del_campo() {
			if (this.modo_bruto) {
				return 'Costo con IVA'
			}
			return this.propText(this.prop)
		},
		/**
		 * Alicuota del articulo, resuelta con el helper que ya existe en el mixin generals: maneja
		 * la relacion iva, el iva_id y el pivot, y normaliza Exento / No Gravado / vacio a 0.
		 */
		alicuota() {
			return this.get_item_iva_percentage(this.article)
		},
		/**
		 * Preview de lo que va a quedar guardado en articles.cost. Se muestra para que el usuario
		 * vea la descomposicion en vivo y no tenga que confiar a ciegas. null cuando no hay nada que
		 * descomponer (sin costo, o alicuota 0 / Exento / No Gravado).
		 */
		costo_neto_derivado() {
			if (!this.article.cost || !this.alicuota) {
				return null
			}
			return parseFloat(this.article.cost) / (1 + (this.alicuota / 100))
		},
	},
	methods: {
		/**
		 * El input guarda SIEMPRE lo que el usuario ve y tipea, y "cost_incluye_iva" dice que es.
		 * El backend descompone segun ese flag, asi que abrir el modal y guardar sin tocar nada
		 * deja el mismo costo que habia: es idempotente.
		 */
		set_costo(valor) {
			this.$set(this.article, 'cost', valor)
			this.$set(this.article, 'cost_incluye_iva', this.modo_bruto)
		},
		/**
		 * Al cambiar el modo se convierte el numero que se esta viendo, para que el campo siga
		 * representando la misma plata. Sin esto, pasar de neto a bruto dejaria el mismo 1000 en
		 * pantalla significando dos cosas distintas.
		 */
		cambiar_modo(nuevo_valor) {
			let self = this

			if (self.article.cost && self.alicuota) {

				let factor = 1 + (self.alicuota / 100)

				let convertido = nuevo_valor
					? parseFloat(self.article.cost) * factor
					: parseFloat(self.article.cost) / factor

				self.$set(self.article, 'cost', convertido.toFixed(2))
			}

			self.$set(self.article, 'cost_incluye_iva', nuevo_valor || self.cuenta_es_monotributista)
		},
		/**
		 * Deja el campo mostrando el BRUTO cuando corresponde, apenas se abre el modal.
		 *
		 * Se prefiere cost_bruto (el valor exacto que se tipeo la vez anterior) sobre recalcularlo:
		 * el ida y vuelta sobre un decimal(22,2) puede correr un centavo, y ese centavo despues se
		 * amplifica con el margen. Si el articulo no tiene cost_bruto -- porque se cargo en neto, o
		 * viene de antes de esta mision -- se deriva de cost con la alicuota.
		 */
		iniciar_modo() {
			let self = this

			self.cost_incluye_iva = self.cuenta_es_monotributista
				? true
				: !!(self.owner && self.owner.costos_cargados_con_iva)

			if (!self.modo_bruto) {
				self.$set(self.article, 'cost_incluye_iva', false)
				return
			}

			if (self.article.cost_bruto) {

				self.$set(self.article, 'cost', self.article.cost_bruto)

			} else if (self.article.cost && self.alicuota) {

				let bruto = parseFloat(self.article.cost) * (1 + (self.alicuota / 100))

				self.$set(self.article, 'cost', bruto.toFixed(2))
			}

			self.$set(self.article, 'cost_incluye_iva', true)
		},
	},
	watch: {
		/**
		 * El modal reusa la instancia entre articulos, asi que la conversion inicial se dispara por
		 * el id y no por created(): sin esto, abrir un segundo articulo mostraria el neto crudo.
		 * immediate cubre la primera apertura.
		 */
		'article.id': {
			immediate: true,
			handler() {
				this.iniciar_modo()
			},
		},
	},
}
</script>
