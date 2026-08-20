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
		:value="valor_visible"
		:disabled="false"
		:prop_text="label_del_campo"
		:price_value="price(valor_visible)"
		:has_bar_code_scanner="false"
		@input="set_costo($event)"></field-text-input>

		<!--
			Mision costo-bruto-por-condicion-fiscal (20/8/2026): el toggle solo existe para
			Responsable Inscripto, que es el unico que puede elegir. El Monotributista carga siempre
			el bruto (recibe Factura B, donde el IVA no viene discriminado y el neto no figura), asi
			que no se le muestra una opcion que no tiene.
			
			🔴 Se DESHABILITA cuando el articulo no tiene una alicuota real (Exento / No Gravado /
			0%): ahi no hay IVA adentro del numero por mas que alguien lo afirme, asi que el back-out
			no va a pasar ni aca ni en la API (ArticlePricesHelper::hasIva). Hasta este cambio el
			toggle se ofrecia igual y no hacia nada: el label decia "Costo con IVA" sobre un numero
			que se guardaba tal cual. Se deshabilita en vez de esconderse para que se entienda por
			que no esta disponible, en vez de que el control aparezca y desaparezca solo.
			
			OJO: `aplicar_iva = 0` ya NO lo bloquea. Desde el 20/8/2026 la declaracion explicita le
			gana a ese flag en el backend (back_out_iva, cuarto parametro), porque `aplicar_iva` es
			una decision sobre la VENTA y no sobre como leer lo que la persona acaba de tipear.
		-->
		<div v-if="!cuenta_es_monotributista" class="m-t-5">
			<b-form-checkbox
			:checked="cost_incluye_iva && hay_iva_aplicable"
			:disabled="!hay_iva_aplicable"
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
			<!--
				El caso "no hay IVA que descontar" va PRIMERO y es excluyente. Antes era una rama de
				adentro del modo bruto, asi que sobre un articulo Exento la pantalla mostraba las dos
				frases seguidas: "El sistema calcula solo el costo sin IVA" y, abajo, "Este articulo no
				tiene IVA que descontar". Se contradecian. Lo encontro el checker de la Fase 5.
			-->
			<span v-if="!hay_iva_aplicable">
				Este articulo no tiene IVA que descontar: el costo se guarda tal cual lo cargues.
			</span>
			<span v-else-if="modo_bruto">
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
			 * En que moneda se esta MIRANDO el campo: true = bruto (con IVA), false = neto.
			 *
			 * 🔴 Es una decision DE ENTRADA ("lo que estoy tipeando ahora incluye IVA"), no un
			 * estado del articulo: no se guarda ninguna columna con esto. A proposito NO se repite
			 * el patron de campos excluyentes de price / percentage_gain -- ese patron, escrito con
			 * tres criterios distintos en tres lugares, es el que dejaba articulos con los dos
			 * inputs bloqueados y sin salida (Mision 44, ver CriterioDePrecioHelper en la API).
			 */
			cost_incluye_iva: false,
			/**
			 * Si la persona TIPEO en el campo de costo durante esta apertura del modal.
			 *
			 * 🔴 Existe porque cambiar_modo() necesita distinguir "no toco nada" de "tipeo con el
			 * toggle apagado", y article.cost_incluye_iva NO alcanza para eso: vale false en los dos
			 * casos. Con ese guard, tipear 1500 en neto y despues prender el toggle no convertia nada
			 * y el 1500 desaparecia de la pantalla (valor_visible caia en el cost_bruto viejo), pero
			 * el 1500 se guardaba igual: la pantalla mostraba un numero y la base recibia otro.
			 * Lo encontro el checker de la Fase 5.
			 */
			tipeo_manual: false,
		}
	},
	computed: {
		/**
		 * Articulo en edicion (modal de ModelForm), leido directo del store, mismo patron
		 * que el resto de los componentes de "modal-props" de este mismo modulo (PriceInput.vue,
		 * PercentageGainInput.vue).
		 *
		 * 🔴 ES LA MISMA REFERENCIA que la fila del listado: __base_store.js hace
		 * `state.model = value.model` sin copiar. Cualquier $set sobre este objeto le cambia el
		 * numero a la tabla de atras. Ver el bloque de set_costo() sobre por que este componente
		 * NO lo toca hasta que la persona tipea.
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
		 * El Monotributista no elige: siempre bruto. El Responsable Inscripto manda con el toggle.
		 */
		modo_bruto() {
			return this.cuenta_es_monotributista || this.cost_incluye_iva
		},
		/**
		 * Alicuota del articulo, priorizando SIEMPRE el iva_id que hay ahora en el formulario.
		 *
		 * 🔴 No se usa get_item_iva_percentage() del mixin: ese helper mira primero la relacion
		 * `article.iva`, que el listado carga con withAll() y por lo tanto SIEMPRE viene. El select
		 * de IVA del modal escribe `iva_id` y nadie refresca la relacion, asi que el helper devuelve
		 * la alicuota VIEJA aunque la persona acabe de cambiarla. El backend, en cambio, descompone
		 * con la nueva (back_out_iva() fuerza load('iva') justamente por esto). Las dos puntas
		 * mostraban numeros distintos: con un articulo pasado de 21% a 10,5%, la pantalla convertia
		 * por 1,21 y la base guardaba dividiendo por 1,105.
		 */
		alicuota() {
			let self = this

			if (self.article && self.article.iva_id) {

				let iva_models = self.$store.state.iva ? self.$store.state.iva.models : []

				let iva_model = iva_models.find(model => {
					return model.id == self.article.iva_id
				})

				if (typeof iva_model != 'undefined') {
					return self.normalize_iva_percentage(iva_model.percentage)
				}
			}

			// Sin iva_id resuelto (o sin el store de ivas cargado) se cae al helper de siempre.
			return self.get_item_iva_percentage(self.article)
		},
		/**
		 * Si hay un IVA real que sacar. Replica el criterio de ArticlePricesHelper::hasIva():
		 * alicuota 0, Exento y No Gravado no cuentan. Sin esto la pantalla prometia una
		 * descomposicion que el backend no iba a hacer.
		 *
		 * 🔴 Ya NO mira `article.aplicar_iva`, y sacarlo fue un cambio deliberado del 20/8/2026.
		 * Este formulario SIEMPRE manda `cost_incluye_iva` (ver el watch de article.id), o sea que
		 * todo lo que sale de aca es una declaracion explicita, y desde esa fecha la declaracion
		 * explicita le gana a `aplicar_iva` en back_out_iva(). Si esta computed lo siguiera
		 * mirando, la pantalla mostraria "no hay IVA que descontar" sobre un articulo al que el
		 * backend SI le va a sacar el 21%: las dos puntas discrepando otra vez, que es el error
		 * que esta mision viene arrastrando desde el principio.
		 *
		 * Lo que queda: hasIva(), que es la unica puerta que la declaracion explicita no abre.
		 */
		hay_iva_aplicable() {
			return !!this.alicuota
		},
		/**
		 * El label dice en que moneda esta el campo. Sin esto, "Costo base" arriba de un numero con
		 * IVA adentro es exactamente la confusion que esta mision vino a sacar.
		 *
		 * Tambien exige `hay_iva_aplicable`: sobre un articulo Exento no hay IVA que sacar, el
		 * numero se guarda tal cual, y llamarlo "Costo con IVA" seria la misma confusion al reves.
		 */
		label_del_campo() {
			if (this.modo_bruto && this.hay_iva_aplicable) {
				return 'Costo con IVA'
			}
			return this.propText(this.prop)
		},
		/**
		 * Lo que se muestra en el input.
		 *
		 * 🔴 Es una computed DERIVADA, no un valor que se escriba en el store al abrir el modal.
		 * La primera version de esta mision convertia articles.cost a bruto dentro de un watcher, y
		 * como `article` es la misma referencia que la fila del listado, abrir un articulo le
		 * cambiaba el costo a la tabla; alternar entre dos articulos volvia a convertir sobre lo ya
		 * convertido y el numero se multiplicaba por 1,21 en cada vuelta, hasta que alguien tocaba
		 * Guardar y eso llegaba a la base.
		 *
		 * La regla, entonces: el store SOLO se toca cuando la persona tipea (set_costo).
		 *
		 * `cost_incluye_iva` en el modelo significa "lo que hay en article.cost ya es el bruto
		 * tipeado", asi que en ese caso se muestra tal cual y no se vuelve a convertir.
		 */
		valor_visible() {
			if (!this.article || !this.article.cost) {
				return this.article ? this.article.cost : null
			}

			if (this.article.cost_incluye_iva) {
				return this.article.cost
			}

			if (!this.modo_bruto || !this.hay_iva_aplicable) {
				return this.article.cost
			}

			// Se prefiere el bruto ya registrado (el valor exacto que se tipeo la vez anterior)
			// sobre recalcularlo: el ida y vuelta puede correr un centavo y despues se amplifica
			// con el margen.
			if (this.article.cost_bruto) {
				return this.article.cost_bruto
			}

			return (parseFloat(this.article.cost) * (1 + (this.alicuota / 100))).toFixed(2)
		},
		/**
		 * Preview de lo que va a quedar guardado en articles.cost, para que la descomposicion se vea
		 * y no haya que confiar a ciegas. null cuando no hay nada que descomponer.
		 */
		costo_neto_derivado() {
			if (!this.valor_visible || !this.hay_iva_aplicable || !this.modo_bruto) {
				return null
			}
			return parseFloat(this.valor_visible) / (1 + (this.alicuota / 100))
		},
	},
	methods: {
		/**
		 * Unico punto que escribe en el store, y corre solo cuando la persona tipea.
		 *
		 * Se guarda el numero tal cual se ve, y `cost_incluye_iva` dice que es. El backend
		 * descompone segun ese flag. Si nadie toca el campo, article.cost queda con el neto que
		 * vino del servidor y el flag no se prende: guardar sin tocar nada deja el costo igual.
		 */
		set_costo(valor) {
			this.tipeo_manual = true
			this.$set(this.article, 'cost', valor)
			this.$set(this.article, 'cost_incluye_iva', this.modo_bruto)
		},
		/**
		 * Cambiar el modo solo cambia COMO SE MIRA el campo. Si la persona ya habia tipeado, se
		 * convierte lo tipeado para que siga representando la misma plata; si no toco nada, no se
		 * escribe en el store (valor_visible se recalcula solo).
		 */
		cambiar_modo(nuevo_valor) {
			let self = this

			self.cost_incluye_iva = nuevo_valor

			/*
			 * Si nadie tipeo, el store NO se toca: valor_visible recalcula sola, y el flag tiene
			 * que quedarse en false para que un guardado sin tocar el costo no dispare el back-out
			 * sobre un numero que ya era neto (el bug de 1000 -> 826,45 -> 683,01).
			 *
			 * El guard mira tipeo_manual y no article.cost_incluye_iva: ese vale false tanto cuando
			 * nadie tipeo como cuando la persona tipeo con el toggle apagado, y en el segundo caso
			 * lo tipeado SI hay que convertirlo.
			 */
			if (!self.tipeo_manual) {
				return
			}

			if (self.article.cost && self.hay_iva_aplicable) {

				let factor = 1 + (self.alicuota / 100)

				let convertido = nuevo_valor
					? parseFloat(self.article.cost) * factor
					: parseFloat(self.article.cost) / factor

				self.$set(self.article, 'cost', convertido.toFixed(2))
			}

			self.$set(self.article, 'cost_incluye_iva', nuevo_valor || self.cuenta_es_monotributista)
		},
	},
	watch: {
		/**
		 * Al pasar a otro articulo se vuelve al default de la cuenta. No se escribe nada en el
		 * store: la conversion la resuelve valor_visible.
		 */
		'article.id': {
			immediate: true,
			handler() {
				this.tipeo_manual = false

				this.cost_incluye_iva = this.cuenta_es_monotributista
					? true
					: !!(this.owner && this.owner.costos_cargados_con_iva)

				/*
				 * 🔴 El flag SIEMPRE viaja, y arranca en false. No es opcional.
				 *
				 * `article.cost` en el store es el NETO que devolvio el servidor, y el backend
				 * decide si descomponer con costo_tipeado_es_bruto($user, $cost_incluye_iva): si la
				 * clave no llega, cae al default de la cuenta, que para Monotributista es "bruto"
				 * incondicional. O sea que un guardado que ni toca el costo -- corregir el nombre,
				 * cambiar la categoria -- le hacia el back-out a un numero que YA era neto:
				 * 1000 -> 826,45 -> 683,01, un 21% por guardado y sin necesidad de ninguna
				 * secuencia rara. Lo encontro el segundo checker de la Fase 5, midiendolo.
				 *
				 * Escribir este flag NO es "mutar la fila del listado" como hacia la version que
				 * introdujo ese bug: no existe ninguna columna `cost_incluye_iva`, no se muestra en
				 * ningun lado y no cambia el costo. Es una declaracion sobre el request que se esta
				 * por armar. El costo en si lo sigue tocando unicamente set_costo().
				 */
				this.$set(this.article, 'cost_incluye_iva', false)
			},
		},
	},
}
</script>
