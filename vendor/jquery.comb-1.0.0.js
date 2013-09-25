/**
 * jQuery Comb - v1.0
 * http://fredhq.com/goods/comb
 * 
 * A simple (yet highly-customizable) search layer that helps users find
 * needles in data haystacks based on relevancy.
 *
 * Terms of Use // jQuery Comb
 *
 * Copyright (c) 2012, Fred LeBlanc
 * All Rights Reserved. 
 */
;(function($) {
	"use strict";

	var defaults, internalData, methods;

	defaults = {
		// matching & scoring
		matchWeights: {
			partialWord: 1,
			partialFirstWord: 2,
			partialWordStart: 1,
			partialFirstWordStart: 2,
			wholeWord: 5,
			wholeFirstWord: 5,
			partialWhole: 2,
			partialWholeStart: 2,
			whole: 10
		},
		minCharacters: 3,
		minWordCharacters: 2,
		scoreThreshold: 1,
		propertyWeights: {},

		// input
		queryMode: "boolean",
		stemming: false,
		customStemming: null,
		alternates: false,
		customAlternates: null,
		includeFullQuery: true,
		preformat: function(keyword) {
			return keyword.replace(/[^\w\d\-\+\s&Õ'Ô]/ig, "");
		},

		// output
		limit: false,
		enableTooManyResults: false,
		delay: null,
		sortByScore: true,
		groupByCategory: false,
		onNoQuery: function() {},
		onNotEnoughCharacters: function() {},
		onNoResultsFound: function() {},
		onError: function() {},
		onResultsFound: function(results) {},
		onComplete: function() {},
		onTooManyResultsFound: function() {},

		// data
		loadFrom: null,
		formatRemoteData: function(data) { return data; },
		forceReloadOnEachKeypress: false,
		haystack: {},
		excludeProperties: [],
		remoteDataType: "json",
		ajaxTimeout: 5000,

		// filtering
		filteredKeyCodes: [],
		filter: function() {},

		// debugging
		debug: false
	};

	internalData = {
		dataPrepared: false,
		isCategorizedHaystack: false,
		queryStartTime: null,
		delayTimeout: null,
		internalHaystack: []
	};

	methods = {

		// init
		// starts the search
		init: function(options) {
			var settings;

			options = options || {};
			settings = $.extend({}, defaults, options, internalData);

			this
				.data("comb", settings)
				.bind("keypress.comb", function() {
					var a,
					    self = $(this);

					// trap filtered key codes
					if (settings.filteredKeyCodes.length) {
						for (a in settings.filteredKeyCodes) {
							if (settings.filteredKeyCodes[a] === e.keyCode) {
								settings.filter.apply(self, [e.keyCode]);

								return this;
							}
						}
					}

					try {
						
						var query,
						key_pressed = String.fromCharCode(e.which);
						if (!key_pressed.match(/[a-zA-Z0-9 ]+/)) {
							key_pressed = '';
						};
						
						// preformat
						query = settings.preformat.apply(self, [$.trim($(this).val()+key_pressed)]);
						$(this).data('query', query); // store current query on input element
						
						// short-circuit if forcing reload on every keystroke
						// and minimum characters isn't reached
						if (settings.forceReloadOnEachKeypress && query.length < settings.minCharacters) {
							throw("");
						}
						
						methods.loadData.apply(self, [settings.forceReloadOnEachKeypress]);
					} catch (error) {
						if (settings.debug) {
							console.debug(error);
						}
					}
				});

			return this
				.each(function() {
					var self = $(this),
					    settings = self.data("comb");

					self
						.bind("keyup.comb", function(e) {
							var query;

							try {
								// for debugging purposes, measures search length
								settings.queryStartTime = $.now();

								// test keystroke
								methods.testRelevantKeystroke.apply(self, [e.keyCode]);

								// preformat
								query = settings.preformat.apply(self, [$.trim($(this).val())]);

								// short-circuit if forcing reload on every keystroke
								// and minimum characters isn't reached
								if (settings.forceReloadOnEachKeypress && query.length < settings.minCharacters) {
									throw("");
								}

								// search
								methods.lookUp.apply(self, [query]);
							} catch (error) {
								if (error && settings.debug) {
									console.debug("Error: " + error);
								}
								return false;
							}
						});
				});
		},


		// lookUp
		// takes a given query and performs search
		lookUp: function(query) {
			var params, data,
			    self = $(this),
			    settings = self.data("comb");

			// test for a valid query
			methods.testValidQuery.apply(self, [query]);

			// parse out search parameters
			params = methods.parseSearchParameters.apply(self, [query]);

			// trim haystack to fit query
			data = methods.removeDisallowedMatches.apply(self, [params, settings.internalHaystack]);

			// find
			if (settings.delay) {
				clearTimeout(settings.delayTimeout);
				settings.delayTimeout = setTimeout(function() {
					methods.searchOverData.apply(self, [params, data, query]);
				}, settings.delay);
			} else {
				if (settings.forceReloadOnEachKeypress && settings.loadFrom && settings.debug) {
					console.log("Pro Tip: Set the 'delay' setting for better performance.");
				}

				methods.searchOverData.apply(self, [params, data, query]);
			}
		},


		// loadData
		// loads data either locally or from remote source
		loadData: function(forceReload) {
			var cacheName, loadFromURL,
			    self = $(this),
			    settings = self.data("comb");

			// we've already loaded data
			if (settings.dataPrepared && !forceReload) {
				return;
			}

			// on our way to preparing data, flag instance as such
			settings.dataPrepared = true;

			// load via ajax if necessary
			if (settings.loadFrom) {
				// settings.loadFrom can be a function, allowing for dynamic ajax URLs
				loadFromURL = ($.isFunction(settings.loadFrom)) ? settings.loadFrom.apply(self) : settings.loadFrom;
				cacheName = "comb-cache_" + loadFromURL;

				// check for a cache already existing
				if ($("body").data(cacheName) === false) {
					// still waiting for a return ajax trip
					return this;
				} else if ($("body").data(cacheName)) {
					// the cache exists
					settings.internalHaystack = $("body").data(cacheName);
				} else {
					// set a false flag indicating we're waiting on ajax
					$("body").data(cacheName, false);

					$.ajax({
						url: loadFromURL,
						dataType: settings.remoteDataType,
						timeout: settings.ajaxTimeout,
						error: function(jqXHR, status, error) {
							throw("Ajax error: " + error);
						},
						success: function(data, status, jqXHR) {
							data = settings.formatRemoteData.apply(self, [data]);
							methods.prepareData.apply(self, [data, function() {
								$("body").data(cacheName, data);
								self.keyup();
							}]);
						}
					});

					return this;
				}

			// use locally-supplied data
			} else {
			  settings.haystack = settings.formatRemoteData($('body').html());
				methods.prepareData.apply(self, [settings.haystack]);
			}
		},


		// prepareData
		// parses and prepared data to be used 
		prepareData: function(data, callback) {
			var a, b, record,
			    self = $(this),
			    output = [];

			callback = callback || function() {};

			// find non-categorized data
			if ($.isArray(data)) {
				for (a = 0; a < data.length; a++) {
					record = data[a];
					record._category = "data";
					output.push(record);
				}

			// find categorized data
			} else {
				self.data("comb").isCategorizedHaystack = true;
				for (a in data) {
					if (data.hasOwnProperty(a)) {
						if (!$.isArray(data[a])) {
							continue;
						}

						for (b = 0; b < data[a].length; b++) {
							record = data[a][b];
							record._category = a;
							output.push(record);
						}
					}
				}
			}

			// remove any disallowed properties in the settings
			output = methods.removeDisallowedProperties.apply(self, [output]);

			// set the prepared data to this instance's haystack
			self.data("comb").internalHaystack = output;

			// call callback
			callback.apply(self);
		},


		// searchOverData
		// look through each result attempting to find good matches
		searchOverData: function(params, data, rawQuery) {
			var obj, found, regex, property, words, strength, result, score, 
			    categorizedOutput, cleaned, matchWeight, clonedData,
			    a, b, c, d, e, f, g, h, i, j,  // iterators
			    settings = this.data("comb"),
			    output = [],
			    info = {},
			    outputLength = 0;

			// make sure there's data to search over
			if (!data.length) {
				// the haystack is empty because it was parsed by a boolean 
				// search return that no results were found
				if (params.required) {
					settings.onComplete.apply(this);
					settings.onNoResultsFound.apply(this, [info]);
					settings.onError.apply(this);
					throw("No results found.");
					
				// otherwise, the haystack is empty and that's an error	
				} else {
					settings.onComplete.apply(self);
					settings.onError.apply(self);
					throw("Empty haystack.");
				}
				
				return;
			}

			// set up informational object to be returned alongside data object
			info = {
				totalResults: 0,
				rawQuery: rawQuery,
				parsedQuery: params,
				queryTime: 0.0
			};

			// loop over records
			for (a in data) {
				if (data.hasOwnProperty(a)) {
					obj = data[a].pruned;

					// counters
					found = {
						partialWord: 0,
						partialFirstWord: 0,
						partialWordStart: 0,
						partialFirstWordStart: 0,
						wholeWord: 0,
						wholeFirstWord: 0,
						partialWhole: 0,
						partialWholeStart: 0,
						whole: 0
					};

					// loop over each query chunk
					for (b = 0; b < params.chunks.length; b++) {
						regex = {
							whole: new RegExp("^" + params.chunks[b] + "$", "ig"),
							partial: new RegExp(params.chunks[b], "ig"),
							partialFromStart: new RegExp("^" + params.chunks[b], "ig")
						};

						// loop over each data property
						for (c in obj) {
							if (obj.hasOwnProperty(c)) {
								property = ($.isArray(obj[c])) ? obj[c].join(" ") : obj[c];

								if (typeof property !== "string") {
									continue;
								}

								words = property.split(/\s+/ig);
								strength = settings.propertyWeights[c] || 1;

								// reset iterator
								i = 0;

								// whole matching
								result = property.match(regex.whole);
								if (result) {
									found.whole += result.length;
								}

								result = property.match(regex.partial);
								if (result) {
									found.partialWhole += result.length;
								}

								result = property.match(regex.partialFromStart);
								if (result) {
									found.partialWholeStart += result.length;
								}

								// word matching
								for (d = 0; d < words.length; d++) {
									result = words[d].match(regex.whole);
									if (result) {
										found.wholeWord += strength * result.length;

										if (i === 0) {
											found.wholeFirstWord += strength * result.length;
										}
									}

									result = words[d].match(regex.partial);
									if (result) {
										found.partialWord += strength * result.length;

										if (i === 0) {
											found.partialFirstWord += strength * result.length;
										}
									}

									result = words[d].match(regex.partialFromStart);
									if (result) {
										found.partialWordStart += strength * result.length;

										if (i === 0) {
											found.partialFirstWordStart += strength * result.length;
										}
									}

									i++;
								}
							}
						}
					}

					// calculate score
					score = 0;

					// loop through match weights, taking user-set options if we can
					for (e in defaults.matchWeights) {
						if (defaults.matchWeights.hasOwnProperty(e)) {
							matchWeight = (typeof settings.matchWeights[e] !== "undefined") ? settings.matchWeights[e] : defaults.matchWeights[e];
							score += found[e] * matchWeight;
						}
					}

					data[a].score = score;
				}
			}

			// create a clone of data to not re-arrange master list
			clonedData = methods.cloneArray.apply(null, [data]);

			// perform sorting if needed
			if (settings.sortByScore) {
				clonedData.sort(function(a, b) {
					if (a.score > b.score) {
						return -1;
					} else if (a.score < b.score) {
						return 1;
					} else {
						return 0;
					}
				});
			}

			// only records whose score meets the threshold
			for (f in clonedData) {
				if (clonedData[f].score >= settings.scoreThreshold) {
					cleaned = $.extend({}, clonedData[f]);

					// remove our working object
					delete cleaned.pruned;

					output.push(cleaned);
				}
			}

			// add total results to info array
			info.totalResults = output.length;

			// if group by category, rearrange - will handle limiting
			if (settings.groupByCategory && settings.isCategorizedHaystack) {
				categorizedOutput = {};

				for (g = 0; g < output.length; g++) {
					if (!categorizedOutput[output[g].category]) {
						categorizedOutput[output[g].category] = [];
						outputLength++;
					}

					if (settings.limit && categorizedOutput[output[g].category].length < settings.limit) {
						categorizedOutput[output[g].category].push(output[g]);
					}
				}

				output = categorizedOutput;

			// or trim outputs to limit if it was set
			} else if (settings.limit) {
				// if we do not want more results than the limit
				if (settings.enableTooManyResults && output.length > settings.limit) {
					settings.onComplete.apply(this);
					settings.onTooManyResultsFound.apply(this, [info]);
					settings.onError.apply(this);
					throw("Too many results found.");
					return;
				}

				output = output.slice(0, settings.limit);
				outputLength = output.length;

			// otherwise, the size is the size
			} else {
				outputLength = output.length;
			}

			// add query time to info array
			info.queryTime = methods.markEndQueryTime.apply(this);

			// if nothing was found
			if (outputLength === 0) {
				settings.onComplete.apply(this);
				settings.onNoResultsFound.apply(this, [info]);
				settings.onError.apply(this);
				throw("No results found.");
				return;
			}

			// results found
			settings.onComplete.apply(this);
			settings.onResultsFound.apply(this, [output, info]);
		},


		// removeDisallowedProperties
		// removes data properties that are on the exclusion list
		removeDisallowedProperties: function(data) {
			var a, b,
			    output = [],
			    settings = this.data("comb");

			for (a = 0; a < data.length; a++) {
				var localData,
				    category = data[a]._category;

				delete data[a]._category;
				localData = $.extend(true, {}, data[a]);

				for (b = 0; b < settings.excludeProperties.length; b++) {
					delete localData[settings.excludeProperties[b]];
				}

				output.push({ 
					data: $.extend(true, {}, data[a]),
					pruned: localData,
					score: 0,
					category: category
				});
			}

			return output;
		},


		// removeDisallowedMatches
		// removes matches that have been disallowed by a boolean search
		removeDisallowedMatches: function(params, data) {
			var a, b, record,
			    settings = this.data("comb"),
			    newData = [],
			    disallowed = new RegExp(params.disallowed.join("|"), "i"),
			    required = new RegExp("(?=.*" + params.required.join(")(?=.*") + ")", "i");

			// this only applies to boolean mode
			if (settings.queryMode !== "boolean" || (params.disallowed.length === 0 && params.required.length === 0)) {
				return data;
			}

			// loop through all data
			for (a = 0; a < data.length; a++) {
				try {
					record = "";

					// loop through each property
					for (b in data[a].pruned) {
						if (data[a].pruned.hasOwnProperty(b)) {
							// string these together
							record += " " + data[a].pruned[b];
						}
					}

					if (params.disallowed.length && disallowed.test(record) === true) {
						// a disallowed was found, we don't want this
						throw("");
					}

					if (params.required.length && !required.test(record)) {
						// a required was missing, we don't want this
						throw("");
					}
				} catch (err) {
					continue;
				}

				newData.push(data[a]);
			}

			return newData;
		},


		// standardizeArray
		// removes duplicate values in a given array
		standardizeArray: function(array) {
			var a,
			    i = 0,
			    output = [],
			    sorted = array.sort();

			for (a = 0; a < sorted.length; a++) {
				if (typeof sorted[a] !== "string") {
					continue;
				}

				sorted[a] = sorted[a].toLowerCase();
			}

			for (i; i <= sorted.length - 1; i++) {
				if (sorted[i + 1] !== sorted[i]) {
					output.push(sorted[i]);
				}
			}

			return output;
		},


		// cloneArray
		// clones a given array to not alter the original
		cloneArray: function(array) {
			var i = 0,
			    newArray = [],
			    arrayLength = array.length;

			for (i; i < arrayLength; i++) {
				newArray.push($.extend(true, {}, array[i]));
			}

			return newArray;
		},



		// validation tests
		// -----------------------------------------------------------------------

		// testRelevantKeystroke
		// validates that the keystroke alters the query
		testRelevantKeystroke: function(keyCode) {
			switch (keyCode) {
				case 13:  // enter/return
				case 16:  // shift
				case 17:  // control
				case 18:  // alt/option
				case 91:  // command
				case 20:  // caps lock
				case 9:   // tab
				case 37:  // left-arrow
				case 38:  // up-arrow
				case 39:  // right-arrow
				case 40:  // down-arrow
				case 27:  // escape
					throw("");

				default:
					// console.log("KeyCode " + keyCode + " accepted.");
			}
		},


		// testValidQuery
		// validates that the query exists and is long enough
		testValidQuery: function(query) {
			var settings = this.data("comb");

			// no query
			if (query.length === 0) {
				settings.onComplete.apply(this);
				settings.onNoQuery.apply(this);
				settings.onError.apply(this);
				throw("No query.");

			// not enough characters have been typed
			} else if (query.length < this.data("comb").minCharacters) {
				settings.onComplete.apply(this);
				settings.onNotEnoughCharacters.apply(this);
				settings.onError.apply(this);
				throw("Not enough characters.");
			}
		},



		// helpers
		// -----------------------------------------------------------------------

		// parseSearchParameters
		// parses out search parameters based on search mode
		parseSearchParameters: function(query) {
			var words, word, stemmed, alternate, parts, x,
			    self = $(this),
			    settings = self.data("comb");

			// "words" - search each word individually
			if (settings.queryMode === "words") {
				parts = {
					chunks: [],
					required: [],
					disallowed: []
				};

				if (settings.stemming) {
					words = query.split(/\s+/ig);
					for (x = 0; x < words.length; x++) {
						word = words[x].toLowerCase();
						stemmed = methods.stemWord.apply(self, [word]);
						alternate = methods.getAlternateWords.apply(self, [word]);

						if (stemmed) {
							parts.chunks.push(stemmed);
						}

						if (alternate) {
							parts.chunks = $.merge(parts.chunks, alternate);
						}

						parts.chunks.push(word);
					}
				} else {
					parts.chunks = query.split(/\s+/ig);
				}

				if (settings.includeFullQuery) {
					parts.chunks.push(query);
				}

			// "boolean" - require words, disallow words
			} else if (settings.queryMode === "boolean") {
				words = query.split(/\s+/ig);

				parts = {
					chunks: [],
					required: [],
					disallowed: []
				};

				for (x = 0; x < words.length; x++) {
					word = words[x].toLowerCase();
					stemmed = methods.stemWord.apply(self, [word]);
					alternate = methods.getAlternateWords.apply(self, [word]);

					if (word.indexOf("-") === 0 && word.length >= settings.minWordCharacters + 1) {
						parts.disallowed.push(word.substring(1));
					} else if (word.indexOf("+") === 0 && word.length >= settings.minWordCharacters + 1) {
						parts.required.push(word.substring(1));
					} else if (word.length >= settings.minWordCharacters) {
						if (stemmed) {
							parts.chunks.push(stemmed);
						}

						if (alternate) {
							parts.chunks = $.merge(parts.chunks, alternate);
						}
						parts.chunks.push(word);
					}
				}

				if (parts.required.length > 0 && parts.chunks.length == 0) {
					parts.chunks = parts.required;
				}

				if (settings.includeFullQuery) {
					parts.chunks.push(query);
				}

			// default - search entire phrase at once
			} else {
				words = query.toLowerCase();
				stemmed = methods.stemWord.apply(self, [words]);
				alternate = methods.getAlternateWords.apply(self, [words]);

				if (stemmed) {
					words.push(stemmed);
				}

				if (alternate) {
					parts.chunks = $.merge(parts.chunks, alternate);
				}

				parts = {
					chunks: [words],
					required: [],
					disallowed: []
				};
			}

			// standardize arrays
			parts = {
				chunks: methods.standardizeArray.apply(self, [parts.chunks]),
				required: methods.standardizeArray.apply(self, [parts.required]),
				disallowed: methods.standardizeArray.apply(self, [parts.disallowed])
			};

			return parts;
		},


		// stemWord
		// attempts to stem the given word, returns word or false if unstemmable
		stemWord: function(word) {
			var self = $(this),
			    settings = self.data("comb");

			if (!settings.stemming) {
				return false;
			}

			// use custom stemming function instead
			if ($.isFunction(settings.customStemming)) {
				return settings.customStemming.apply(self, [word]);
			}

			// check for plural
			if (word.length >= 4 && word.substring(word.length - 1) === "s" && word.substring(word.length - 2) !== "ss") {
				return word.substring(0, word.length -1);
			}

			return false;
		},


		// getAlternateWords
		// attempts to find an alternate word, returns array of alternates or false if none
		getAlternateWords: function(word) {
			var matches = [],
			    self = $(this),
			    settings = self.data("comb");

			if (!settings.alternates) {
				return false;
			}

			// use custom stemming function instead
			if ($.isFunction(settings.customAlternates)) {
				return settings.customAlternates.apply(self, [word]);
			}

			// check for alternates
			switch (word) {
				case "and":
					return [ "&" ];

				case "&":
					return [ "and" ];
			}

			// check for regex match alternates
			if (word.indexOf("Õ") !== -1) {
				matches.push(word.replace(/Õ/g, "'"));
				matches.push(word.replace(/Õ/g, "Ô"));
			} else if (word.indexOf("'") !== -1) {
				matches.push(word.replace(/'/g, "Õ"));
				matches.push(word.replace(/'/g, "Ô"));
			} else if (word.indexOf("Ô") !== -1) {
				matches.push(word.replace(/Ô/g, "'"));
				matches.push(word.replace(/Ô/g, "Õ"));
			}

			if (matches.length) {
				return matches;
			}

			return false;
		},


		// markEndQueryTime
		// adds the time to query to the console (if debug is on)
		markEndQueryTime: function() {
			var time,
			    self = $(this),
			    settings = self.data("comb");

			time = (($.now() - settings.queryStartTime) / 1000).toFixed(3) + "s";

			if (settings.debug) {
				console.debug("Query time: " + time);
			}

			return time;
		}
	};


	// start the plugin
	$.fn.comb = function(method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === "object" || $.isFunction(method) || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error("Method " + method + " does not exist for jQuery.comb.");
		}
	};
})(jQuery);
