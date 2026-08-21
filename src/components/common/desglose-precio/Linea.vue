<template>
	<div
	class="desglose-linea"
	:class="'desglose-linea--'+modificador">

		<div class="desglose-linea__icono">
			<i :class="'bi '+icono"></i>
		</div>

		<div class="desglose-linea__cuerpo">
			<span class="desglose-linea__etiqueta">
				{{ etiqueta }}
			</span>
			<span
			v-if="detalle"
			class="desglose-linea__detalle">
				{{ detalle }}
			</span>
		</div>

		<span
		v-if="valor"
		class="desglose-linea__valor">
			{{ valor }}
		</span>
	</div>
</template>
<script>
import { estilo_de } from '@/components/common/desglose-precio/tipos'

export default {
	props: {
		/*
			Una entrada del desglose, tal como la manda el backend:
			{ tipo, clave, etiqueta, detalle, valor, texto }.

			Se acepta tambien un string suelto. No es paranoia decorativa: si algun sitio de emision
			del backend quedara sin convertir, el array llega mezclado, y es mejor pintar ese
			renglon como una nota legible que romper el modal entero. El test
			DesgloseEstructuradoTest de empresa-api es el que denuncia la mezcla; esto solo evita que
			el usuario se coma una pantalla en blanco mientras tanto.
		*/
		entrada: {
			type: [Object, String],
			required: true,
		},
	},
	computed: {
		es_texto_suelto() {
			return typeof this.entrada == 'string'
		},
		icono() {
			return estilo_de(this.tipo).icono
		},
		modificador() {
			return estilo_de(this.tipo).modificador
		},
		tipo() {
			if (this.es_texto_suelto) {
				return 'nota'
			}
			return this.entrada.tipo
		},
		etiqueta() {
			if (this.es_texto_suelto) {
				return this.entrada
			}
			return this.entrada.etiqueta
		},
		detalle() {
			if (this.es_texto_suelto) {
				return null
			}
			return this.entrada.detalle
		},
		valor() {
			if (this.es_texto_suelto) {
				return null
			}
			return this.entrada.valor
		},
	},
}
</script>
