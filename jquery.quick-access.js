/**
 * QuickAccess
 */
;(function($) {
	"use strict";

	var defaults, internalData, methods;

	defaults = {
		links: ".qa_links a",
		result: null,
		forceSelect: true,
		onSubmit: function(e, selected) {
			if (selected.length) {
				e.preventDefault();
				window.location = selected.eq(0).find("a").attr("href");
				return;
			}
		},
		maxResults: 10,
		placeholder: null,
		tooMany: "Keep typing…",
		noneFound: "No matches found.",
		focus: false,
		removeDuplicates: false,
		mouseControls: true,
		showScore: false,
		combOptions: {}
	};

	internalData = {
		inputField: null,
		resultTarget: null,
		categories: [],
		selectionIndex: false
	};

	methods = {

		// init
		// starts the search
		init: function(options) {
			var settings;

			options = options || {};
			settings = $.extend({}, defaults, options, internalData);

			if (!$.isFunction($.fn.comb)) {
				alert("QuickAccess requires jQuery.Comb");
			}

			return this
				.data("quickAccess", settings)
				.each(function() {
					var defaultCombSettings,
					    self = $(this),
					    settings = self.data("quickAccess");

					// verify that this is attached to an input field
					methods.verifyInputField.apply(self);

					// verify the result target
					methods.verifyResultTarget.apply(self);

					// set categories
					methods.createCategories.apply(self);

					defaultCombSettings = {
						limit: settings.maxResults,
						enableTooManyResuls: false,
						remoteDataType: "json",
						minCharacters: 2,
						minWordCharacters: 2,
						alternates: true,
						groupByCategory: true,
						formatRemoteData: function(data) {
							var match,
							    output = {};

							// wrap data in a div so that we can access all of it
							data = $("<div>" + data + "</div>");
							
							// loop through categories
							$.each(settings.categories, function(i, category) {
								if (!output.hasOwnProperty("category" + i)) {
									output["category" + i] = [];
								}

								$(data)
									.find(category.selector)
									.each(function() {
                    var record = {}, $a = $(this), commentKeywords, dataKeywords, keywords = '';
                    
                    commentKeywords = $a.html().match(/<!--([\s\w\d,]+)-->/i);
                    if (commentKeywords && commentKeywords[1]) {
                      keywords += commentKeywords[1].replace(/,/ig, ' ') + ' ';
                    }
                    dataKeywords = $a.attr('data-keywords');
                    if (typeof dataKeywords !== 'undefined') {
                      keywords += $.trim(dataKeywords.replace(/,/ig, ' '));
                    }
    
                    record.keywords = $.trim(keywords);
                    record.link = $a.attr('href');
                    record.title = $a.text();
                    output["category" + i].push(record);
									});
								});

							return output;
						},
						onComplete: function() {
							// fires after every search
							settings.resultTarget.empty();
						},
						onResultsFound: function(results, info) {
							var a, b, i, category, categoryRef, result, score, resultItems, currentResultList, queryRegExp,
							    queryParts = [],
							    toRemove = new RegExp(/[^a-zA-Z 0-9&]+/g);

							// prepare highlight
							for (i = 0; i < info.parsedQuery.chunks.length; i++) {
								queryParts.push(info.parsedQuery.chunks[i].replace(toRemove, ""));
							}
							for (i = 0; i < info.parsedQuery.required.length; i++) {
								queryParts.push(info.parsedQuery.required[i].replace(toRemove, ""));
							}

							// sort query parts, putting longest items first for best highlighting
							queryParts.sort(function(a, b) {
								if (a.length > b.length) {
									return -1;
								} else if (a.length < b.length) {
									return 1;
								} else {
									return 0;
								}
							});
							queryRegExp = new RegExp('(' + queryParts.join("|") +')','ig');

							// remove no query tag
							settings.resultTarget.removeClass("qa_noquery");

							// loop over categories
							for (a in results) {
								var a_class=a.replace(/\s+/g,'_'); // convert space to underscore in categories
								if (results.hasOwnProperty(a)) {
									// each category
									category = results[a];

									// make category element
									settings.resultTarget.append('<div class="qa_category_' + a_class + '"><ul></ul></div>');
									currentResultList = settings.resultTarget.find(".qa_category_" + a_class + " ul");
									categoryRef = a.replace("category", "");

									// if a title was given for this category, add it
                  if (a === 'category0') { a = 'Results'; } // hard-coded hack to skip category0
									if (a) {
										settings.resultTarget.find(".qa_category_" + a_class).prepend('<div class="qa_category_title">' + a + '</div>');
									}

									for (b = 0; b < category.length; b++) {
										result = category[b];
										score = (settings.showScore) ? ' <small>' + result.score + '</small>' : '';
										currentResultList.append('<li><a href="' + result.data.link + '">' + result.data.title.replace(queryRegExp, '<span class="qa_highlight">$1</span>') + '</a>' + score + '</li>');
									}
								}
							}

							// grab result list-items
							resultItems = settings.resultTarget.find("li");

							// load up selection
							if (settings.selectionIndex === false) {
								// nothing selected yet, should we select?
								if (settings.forceSelect) {
									settings.selectionIndex = 0;
								}
							} else if (settings.selectionIndex > resultItems.length) {
								settings.selectionIndex = (resultItems.length > 0) ? resultItems.length - 1 : 0;
							}

							// set selection
							if (settings.selectionIndex !== false) {
								resultItems
									.removeClass("qa_selected")
									.eq(settings.selectionIndex)
										.addClass("qa_selected");
							}
						},
						onNoResultsFound: function() {
							settings.resultTarget
								.removeClass("qa_noquery")
								.append('<div class="qa_message qa_nonefound">' + settings.noneFound + '</div>');
						},
						onNotEnoughCharacters: function() {
							settings.resultTarget
								.removeClass("qa_noquery")
								.append('<div class="qa_message qa_toomany">' + settings.tooMany + '</div>');
						},
						onNoQuery: function() {
							settings.resultTarget
								.addClass("qa_noquery");
						}
					};

					// start up comb
					settings.inputField
						.comb($.extend({}, defaultCombSettings, settings.combOptions))
						.focus(function() {
							settings.resultTarget.removeClass("qa_blur");
						})
						.blur(function() {
							setTimeout(function() {
								settings.resultTarget.addClass("qa_blur");
							}, 200);
						})
						.keydown(function(e) {
							var selected, index;

							// handle keyboard navigation
							switch(e.keyCode) {
								case 38:  // up-arrow
									e.preventDefault()
									selected = settings.resultTarget.find(".qa_selected");
							   	index = settings.resultTarget.find("li").index(selected);
									selected.removeClass("qa_selected");

									if (index > -1) {
										// something is selected
										if (index > 0) {
											settings.selectionIndex = index - 1;
										} else if (settings.forceSelect) {
											settings.selectionIndex = settings.resultTarget.find("li").length - 1;
										} else {
											settings.selectionIndex = false;
										}
									} else {
										// nothing is selected, select the last item
										settings.selectionIndex = settings.resultTarget.find("li").length - 1;
									}

									if (settings.selectionIndex !== false) {
										settings.resultTarget.find("li").eq(settings.selectionIndex).addClass("qa_selected");
									}
									break;
								case 40:  // down-arrow
									e.preventDefault()
									selected = settings.resultTarget.find(".qa_selected");
							   	index = settings.resultTarget.find("li").index(selected);
									selected.removeClass("qa_selected");

									if (index > -1) {
										// something is selected
										if (index < settings.resultTarget.find("li").length - 1) {
											settings.selectionIndex = index + 1;
										} else if (settings.forceSelect) {
											settings.selectionIndex = 0;
										} else {
											settings.selectionIndex = false;
										}
									} else {
										// nothing is selected, select the last item
										settings.selectionIndex = 0;
									}

									if (settings.selectionIndex !== false) {
										settings.resultTarget.find("li").eq(settings.selectionIndex).addClass("qa_selected");
									}
									break;
								case 13:  // enter/return
									settings.onSubmit.apply(self, [e, settings.resultTarget.find("li.qa_selected")]);
									break;
							}
						});

					if (settings.mouseControls) {
						settings.resultTarget
							.addClass("qa_mouse")
							.delegate("li", "mouseenter", function() {
								settings.selectionIndex = settings.resultTarget.find("li").index($(this));
								settings.resultTarget
									.find("li")
									.removeClass("qa_selected")
										.eq(settings.selectionIndex)
										.addClass("qa_selected");
							})
							.delegate("li", "click", function() {
								window.location = $(this).find("a").eq(0).attr("href");
							});
					}


					// handle focus option
					if (settings.focus) {
						settings.inputField.focus();
					}

					// handle placeholder option
					if (settings.placeholder) {
						settings.inputField.attr("placeholder", settings.placeholder);
					}

					// run in case field is pre-populated
					if (settings.inputField.val()) {
						settings.inputField.keyup();
					}
				});
		},


		// verifyInputField
		// verify that the attachment is on an input field, if not, make one
		verifyInputField: function() {
			var self = $(this),
			    settings = self.data("quickAccess");

			if (self.is("input[type=text], textarea")) {
				settings.inputField = self;
			} else {
				settings.inputField = $('<input type="text" class="qa_search_query" />').prependTo(self);
			}
		},


		// verifyResultTarget
		// verify that a target is specified for results, if not, make one
		verifyResultTarget: function() {
			var self = $(this),
			    settings = self.data("quickAccess");

			if (settings.results) {
				settings.resultTarget = $(settings.results).eq(0);
			} else {
				settings.resultTarget = $('<div class="qa_results"></div>').insertAfter((settings.inputField.next() && (settings.inputField.next().attr('type')=='submit' || settings.inputField.next().attr('type')=='button')) ? settings.inputField.next() : settings.inputField);
			}

			settings.resultTarget
				.addClass("qa_blur")
				.addClass("qa_noquery");
		},


		// createCategories
		// creates a list of categories based on the selectors entered
		createCategories: function() {
			var self = $(this),
			    settings = self.data("quickAccess");

			if (typeof settings.links === "string") {
				settings.categories = [ { selector: settings.links } ];
			} else {
				settings.categories = settings.links;
			}
		}
	};


	// start the plugin
	$.fn.quickAccess = function(method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === "object" || $.isFunction(method) || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error("Method " + method + " does not exist for jQuery.quickAccess.");
		}
	};
})(jQuery);