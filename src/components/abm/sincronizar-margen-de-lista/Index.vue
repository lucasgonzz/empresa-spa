<template>
<!--
	Mision sincronizar-margen-lista-precios (1/10/2026): el boton "Sincronizar articulos" que va
	DEBAJO del campo "Margen por defecto" del formulario de la lista de precios.

	Lo monta src/common-vue/views/Abm.vue por el slot aditivo `prop_extras` de ModelForm, solo para
	`price_type` y solo debajo de `percentage`. Reemplaza a la vieja propiedad "Al actualizar el
	margen por defecto, actualizar los articulos que..." (`update_existing_articles_percentage_mode`):
	cambiar el margen ya no toca ningun articulo por su cuenta, todo pasa por este boton.

	Este componente es el orquestador y hace dos cosas nada mas:

	1. Las dos validaciones que no necesitan a la API (lista sin guardar y margen vacio), con un
	toast y sin abrir nada: abrir una ventana para decirle al usuario que no puede usarla es peor
	que decirselo en una linea.
	2. Abrir el modal (ModalSincronizarMargen.vue) con el margen que hay HOY en el formulario, que
	es el margen nuevo, el que se va a aplicar.

	Es el hermano del "Sincronizar articulos" de los descuentos del proveedor
	(src/components/provider/components/providers/SincronizarArticulos.vue), y por eso habla igual.
-->
<div class="sincronizar-margen-lista-cont">
	<b-button
	id="btn-sincronizar-margen-lista"
	data-testid="btn-sincronizar-margen-lista"
	size="sm"
	variant="outline-primary"
	title="Aplicar el margen por defecto a los articulos de esta lista"
	@click.stop="pedir_sincronizacion_de_margen">
		<i class="bi bi-arrow-repeat"></i>
		Sincronizar articulos
	</b-button>

	<modal-sincronizar-margen
	ref="modal_sincronizar_margen"></modal-sincronizar-margen>
</div>
</template>
<script>
import ModalSincronizarMargen from '@/components/abm/sincronizar-margen-de-lista/ModalSincronizarMargen'

export default {
	components: {
		ModalSincronizarMargen,
	},
	props: {
		/*
			La lista de precios del formulario: es el `model` del scope de `prop_extras`, o sea el
			MISMO objeto que esta editando ModelForm. Por eso `model.percentage` es lo que el
			usuario tiene tipeado ahora, guardado o no.
		*/
		model: Object,
	},
	methods: {
		/**
		 * Normaliza el margen tal como viene del formulario a un numero, o null si esta vacio.
		 *
		 * El campo es `type: 'number'`, pero el valor puede llegar como numero, como string con
		 * punto o con coma decimal ("35,5"), o vacio (string vacio, null, undefined). Para comparar
		 * contra el margen guardado hace falta un numero, y un vacio tiene que distinguirse de un 0
		 * (0 es un margen valido).
		 *
		 * @param {Number|String|null|undefined} valor
		 * @return {Number|null}
		 */
		normalizar_margen_del_formulario(valor) {
			if (valor === null || typeof valor == 'undefined') {
				return null
			}
			let texto = String(valor).trim().replace(',', '.')
			if (!texto.length) {
				return null
			}
			let numero = parseFloat(texto)
			if (isNaN(numero)) {
				return null
			}
			return numero
		},
		/**
		 * Handler del click del boton. Valida lo que se puede validar sin la API y, si todo esta
		 * en orden, abre el modal con el margen nuevo.
		 *
		 * @return {void}
		 */
		pedir_sincronizacion_de_margen() {
			/*
				Lista todavia sin guardar: no tiene id contra el cual pedir el preview, y tampoco
				tiene articulos atados. Mismo criterio y mismo tono que el boton del proveedor.
			*/
			if (!this.model || !this.model.id) {
				this.$toast.error('Guarda la lista antes de sincronizar sus articulos')
				return
			}

			/*
				Sin margen no hay que aplicar. La API dejaria los articulos sin margen propio (y
				pasarian a usar un margen por defecto vacio), que no es lo que alguien busca al
				apretar "Sincronizar": se frena aca.
			*/
			let margen_nuevo = this.normalizar_margen_del_formulario(this.model.percentage)
			if (margen_nuevo === null) {
				this.$toast.error('Completa el margen por defecto')
				return
			}

			this.$refs.modal_sincronizar_margen.abrir_sincronizar_margen(this.model.id, this.model.name, margen_nuevo)
		},
	},
}
</script>
<style scoped lang="sass">
.sincronizar-margen-lista-cont
	margin-top: 8px

	// El icono `bi` no lleva el reset de los `icon-*`, pero el gap con el texto si lo necesita.
	i
		margin-right: 4px
</style>
