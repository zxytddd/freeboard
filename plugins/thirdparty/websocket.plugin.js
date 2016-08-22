// # A Freeboard Plugin that work as websocket client.
(function() {
	// ## A Datasource Plugin
	//
	// -------------------
	// ### Datasource Definition
	//
	// -------------------
	freeboard.loadDatasourcePlugin({
		"type_name": "websocket_client",
		"display_name": "WebSocket Client",
		"description": "A WebSocket client",
		"external_scripts": [
			"js/bower_components.min.js",
		],
		"settings": [{
			"name": "host",
			"display_name": "Server host",
			"type": "text",
			"default_value": "127.0.0.1",
			"description": "IP address of server",
			"required": true
		}, {
			"name": "port",
			"display_name": "Port",
			"type": "number",
			"default_value": 3001,
		}, {
			"name": "refresh_time",
			"display_name": "Refresh time",
			"type": "number",
			"default_value": 500,
		}, ],
		// **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
		// * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
		// * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
		// * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
		newInstance: function(settings, newInstanceCallback, updateCallback) {
			// webSocketClientPlugin is defined below.
			newInstanceCallback(new webSocketClientPlugin(settings, updateCallback));
		}
	});


	// ### Datasource Implementation
	//
	// -------------------
	var webSocketClientPlugin = function(settings, updateCallback) {
		// Always a good idea...
		var self = this;
		var client = null;
		var currentSettings = settings;
		var oldSettings = settings;
		var homeState = {
			state: {
				reported: {},
				desired: {}
			},
			connected: false
		};
		var panesLoaded = {};
		var col = [1, 1],
			row = [
				[9, 5],
				[9, 5, 5]
			];

		function clientDisconnect() {
			console.log("Try to disconnect current client.");
			if (client && client.readyState == client.OPEN) {
				client.close();
			}
		}

		function clientConnect() {
			clientDisconnect();
			console.log("Try to connect a new client.");
			client = creatWSClient(currentSettings);
		}

		self.onSettingsChanged = function(newSettings) {
			currentSettings = newSettings;
			oldSettings = newSettings;
		};

		self.updateNow = function() {
			if (client && client.readyState == client.OPEN) {
				console.log("Always in connected state!");
			} else {
				clientConnect();
			}
		};

		self.onDispose = function() {};

		self.send = function(datasource, value) {
			var re = /\[\"([\w\_\-\$]+)\"\]/g;
			var msg2send = {};
			var match;
			var msg = "";
			var match_cnt = 0;
			var last_match;
			console.log(datasource);
			var thing = re.exec(datasource)[1];
			if (thing === "connected") { // Connect or disconnect
				if (value) {
					clientConnect();
				} else {
					clientDisconnect();
				}
			} else if (thing === "state") {
				while ((match = re.exec(datasource))) {
					last_match = match[1];
					msg += '{' + '"' + last_match + '":';
					match_cnt += 1;
					console.log("cnt" + match_cnt);
				}
				msg += value.toString();
				do {
					msg += '}';
					match_cnt--;
				} while (match_cnt);
				msg2send = JSON.parse(msg);
				msg = JSON.stringify(msg2send);
				client.sendMessage(msg);

			}
			updateCallback(homeState);
		};

		function creatWSClient(settings) {
			var ServerURL = "ws://" + settings.host + ":" + settings.port;
			client = new WebSocket(ServerURL);

			client.onopen = function(e) {
				homeState.connected = true;
				updateCallback(homeState);
				getHomeState();
				console.log("Web socket opened");
			};

			client.onclose = function(e) {
				homeState.connected = false;
				updateCallback(homeState);
				console.log("Web socket closed");

			};

			client.onmessage = function(e) {
				console.log("RECEIVED: " + e.data, e);
				onMessageArrived(e);
			};

			client.onerror = function(e) {
				console.log('Error occured: ' + e.data, e);
				//read config in WAN
				setTimeout(function() {
					freeboard.loadDashboard(WANConfig);
					freeboard.setEditing(false);
				}, 1000);
			};
			client.sendMessage = function(msg) {
				if (client && client.readyState == client.OPEN) {
					client.send(msg);
					console.log("SEND: : " + msg);
				} else {
					console.log("Not connected, unable to send any messages!");
				}
			};
			return client;
		}

		function onMessageArrived(e) {
			var key, endpoint, Oid, i, Rid,
				msg = e.data,
				homeStateNew = JSON.parse(msg).state;
			for (endpoint in homeStateNew.reported) {
				if (homeStateNew.reported[endpoint] === null) {
					//delete UI
				} else {
					if (homeState.state.reported[endpoint] === undefined && panesLoaded[endpoint] === undefined) {
						//add UI
						var pane = {};
						var widgets = [];
						var widget = {};
						pane.title = endpoint;
						pane.width = 1;
						pane.col_width = 1;
						pane.row = {
							"1": row[0][0] + row[0][1] - 5,
							"2": row[0][col[0]],
							"3": row[1][col[1]]
						};
						pane.col = {
							"1": 1,
							"2": col[0] + 1,
							"3": col[1] + 1
						};
						widget.type = "indicator";
						widget.settings = {
							"title": "connected",
							"value": '!(datasources["' + ["lan", "state", "reported", endpoint].join('"]["') + '"] == undefined)',
							"on_text": "ONLINE",
							"off_text": "OFFLINE"
						};
						row[0][col[0]] += 1;
						row[1][col[1]] += 1;
						widgets.push(widget);
						widget = {};
						for (Oid in homeStateNew.reported[endpoint]) {
							for (i in homeStateNew.reported[endpoint][Oid]) {
								if (Oid == "3303") {
									//temp
									widget.type = "sparkline";
									widget.settings = {
										"title": "temperature" + i,
										"value": ['datasources["' + ["lan", "state", "reported", endpoint, Oid, i, "5700"].join('"]["') + '"]'],
										"include_legend": true,
										"legend": "C"
									};
									row[0][col[0]] += 6;
									row[1][col[1]] += 6;
								} else if (Oid == "3311") {
									//light
									widget.type = "interactive_indicator";
									widget.settings = {
										"title": "light" + i,
										"value": 'datasources["' + ["lan", "state", "reported", endpoint, Oid, i, "5850"].join('"]["') + '"]',
										"callback": 'datasources["' + ["lan", "state", "desired", endpoint, Oid, i, "5850"].join('"]["') + '"]',
										"on_text": "ON",
										"off_text": "OFF"
									};
								} else {
									continue;
								}
								row[0][col[0]] += 2;
								row[1][col[1]] += 2;
								widgets.push(widget);
								widget = {};
							}
						}
						pane.widgets = widgets;
						freeboard.addPane(pane);
						col[0] += 1;
						col[0] %= 2;
						col[1] += 1;
						col[1] %= 3;
						panesLoaded[endpoint] = true;
					}
				}
			}
			for (key in homeStateNew) {
				if (homeState.state[key] === undefined) {
					homeState.state[key] = {};
				}
				for (endpoint in homeStateNew[key]) {
					if (homeStateNew[key][endpoint] === null) {
						homeState.state[key][endpoint] = undefined;
					} else {
						if (homeState.state[key][endpoint] === undefined) {
							homeState.state[key][endpoint] = {};
						}
						for (Oid in homeStateNew[key][endpoint]) {
							if (homeState.state[key][endpoint][Oid] === undefined) {
								homeState.state[key][endpoint][Oid] = {};
							}
							for (i in homeStateNew[key][endpoint][Oid]) {
								if (homeState.state[key][endpoint][Oid][i] === undefined) {
									homeState.state[key][endpoint][Oid][i] = {};
								}
								for (Rid in homeStateNew[key][endpoint][Oid][i]) {
									homeState.state[key][endpoint][Oid][i][Rid] = homeStateNew[key][endpoint][Oid][i][Rid];
								}
							}
						}
					}
				}
			}
			updateCallback(homeState);
		}

		function getHomeState() {
			if (client && client.readyState == client.OPEN) {
				client.sendMessage("{}");
			}
		}
	};
}());