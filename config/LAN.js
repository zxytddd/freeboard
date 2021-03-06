
var LANConfig = {
	"version": 1,
	"allow_edit": true,
	"plugins": [],
	"panes": [
		{
			"title": "EMSK SMARTHOME DEMO",
			"width": 1,
			"row": {
				"1": 1,
				"2": 1,
				"3": 1
			},
			"col": {
				"1": 1,
				"2": 1,
				"3": 1
			},
			"col_width": "3",
			"widgets": [
				{
					"type": "text_widget",
					"settings": {
						"size": "regular",
						"value": "EMSK SMARTHOME",
						"sparkline": false,
						"animate": true
					}
				}
			]
		},
		{
			"title": "CONNECTION STATUS",
			"width": 1,
			"row": {
				"1": 5,
				"2": 5,
				"3": 5
			},
			"col": {
				"1": 1,
				"2": 1,
				"3": 1
			},
			"col_width": 1,
			"widgets": [
				{
					"type": "interactive_indicator",
					"settings": {
						"title": "LOCAL SERVER CONNECTION STATUS",
						"value": "datasources[\"lan\"][\"connected\"]",
						"callback": "datasources[\"lan\"][\"connected\"]",
						"on_text": "CONNECTED",
						"off_text": "DISCONNECTED"
					}
				}
			]
		}
	],
	"datasources": [
		{
			"name": "lan",
			"type": "websocket_client",
			"settings": {
				"host": document.location.hostname,
				"port": 3001,
				"refresh_time": 500,
				"name": "lan"
			}
		}
	],
	"columns": 3
};
