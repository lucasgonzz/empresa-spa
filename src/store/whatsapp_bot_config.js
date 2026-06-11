import __base_store from '@/store/__base_store'

export default __base_store({
	state: {
		model_name: 'whatsapp_bot_config',
		from_dates: false,
		use_per_page: false,
		api_url: 'whatsapp-bot/config',
	},
})
