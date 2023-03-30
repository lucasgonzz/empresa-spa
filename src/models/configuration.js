export default {
    properties: [
        {
            text: 'IVA incluido en los precios',
            description: 'Si se deja desmarcado, se aumentara el porcentaje de iva al precio final de cada producto',
            key: 'iva_included',
            type: 'checkbox',
            value: 0,
        },
        {
            text: 'Mostrar articulos sin Stock en la tienda (con un aviso de no disponibilidad)',
            key: 'show_articles_without_stock',
            type: 'checkbox',
            value: 0,
        },
        {
            text: 'Aplicar margen de TIPOS DE PRECIO en los servicios',
            key: 'apply_price_type_in_services',
            type: 'checkbox',
            value: 0,
        },
    ],
    singular_model_name_spanish: 'Configuracion',
    plural_model_name_spanish: 'Configuraciones',
    create_model_name_spanish: 'Nueva',
    text_delete: 'la',
}