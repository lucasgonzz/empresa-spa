# Prompt 266 — Refactor precios/costos: UI de Capa 3 en empresa-spa — recargos por método/cuotas y modo precio_base_incluye_tarjeta en Vender

## Estado
bloqueado

## Descripción
UI de la Capa 3 construida en el prompt 263 (plan Fase 2, prompt B7). Dos frentes:

1. **Configuración:** los ABM existentes de reglas por método de pago
   (`current_acount_payment_method_discounts`) y de cuotas (`cuotas`) ganan los campos nuevos:
   una regla de método puede limitarse a una cantidad de cuotas, y una regla de cuotas puede
   atarse a un método de pago específico (Visa 3 cuotas +5% ≠ genérico 3 cuotas +3%).
   También la config del flag `precio_base_incluye_tarjeta` del usuario (en la sección de
   configuración donde viven los flags de precios del negocio).
2. **Vender:** cuando `precio_base_incluye_tarjeta` está activo, el precio mostrado es el de
   etiqueta (ya incluye la tarjeta más cara) y al elegir método de pago se muestra el descuento
   correspondiente ("Efectivo: $1100 (−9,1%)"). Con el flag apagado, comportamiento actual
   (precio base + recargo del método elegido). La resolución de la regla aplicable la hace la API
   (precedencia definida en el prompt 263) — el SPA consume y muestra.

## Ejecución sugerida

cursor

## Modelo sugerido
Claude Sonnet, esfuerzo alto — toca Vender (el módulo más crítico del SPA) y el modal de métodos
de pago con su lógica de pago múltiple ya construida, que NO debe romperse.

## Repositorio y rama
`empresa-spa` (rama `develop`). Depende del prompt 263 ya ejecutado en empresa-api (y del 265 para
convenciones si se ejecutan en orden).

---

## Contexto técnico

- Modal de métodos de pago de Vender: @src/components/vender/modals/payment-methods/ (Index.vue,
  Buttons.vue, select-payment-methods/). Leerlo COMPLETO antes de tocar: el flujo de pago
  múltiple con recálculo y re-pregunta de asignación (descrito en `refactor_empresa/ventas.md`)
  ya funciona y se preserva tal cual.
- Modelos a extender: buscar en `src/models/` los de cuotas y descuentos por método de pago;
  agregar las propiedades nuevas (`payment_method_id` en cuota, `cuotas` en la regla de método)
  como selects/inputs opcionales con su texto claro ("Dejar vacío para aplicar a cualquier
  método/cantidad de cuotas").
- Flag de usuario: buscar dónde el SPA edita los flags de configuración de precios del negocio
  (ej: `aplicar_iva_al_costo`, `aplicar_descuentos_en_articulos_antes_del_margen_de_ganancia`) y
  agregar `precio_base_incluye_tarjeta` ahí con el mismo patrón.

**Workstream de descripciones (obligatorio):** toda propiedad creada o tocada en `src/models/*.js`
lleva su `descriptions` autodocumentada (patrón existente en el repo). En particular, el flag
`precio_base_incluye_tarjeta` debe explicar el modo completo en su description.

## Tareas

1. Extender los modelos/formularios de cuotas y reglas por método con los campos nuevos
   (opcionales, con default vacío = comportamiento genérico actual).
2. Agregar el flag `precio_base_incluye_tarjeta` a la configuración del negocio.
3. En Vender, con el flag activo:
   - El precio unitario y el total mostrados son los de etiqueta (la API ya los entrega así).
   - En el modal de métodos de pago, mostrar por método el importe final y el descuento respecto
     de etiqueta cuando corresponda (datos provistos por la API del prompt 263).
   - Con el flag inactivo: ni un píxel cambia respecto de hoy.
4. Verificar el pago múltiple en ambos modos (flag on/off): el flujo de recálculo y re-asignación
   existente debe seguir funcionando idéntico.

## Criterio de éxito
- Configurar "Visa crédito 3 cuotas +5%" y "3 cuotas genérico +3%": vender con Visa 3 cuotas aplica
  5%, con otra tarjeta 3%.
- Reglas existentes (sin campos nuevos) siguen aplicando igual que siempre.
- Flag activo: artículo de etiqueta $1210 → elegir efectivo muestra $1100 con su descuento visible;
  elegir crédito 6 cuotas mantiene $1210.
- Flag inactivo: Vender se ve y comporta exactamente igual que hoy.
- Pago múltiple con re-asignación funciona en ambos modos.
- Modelos tocados con `descriptions` completas.

---

Al terminar, pushea empresa.

