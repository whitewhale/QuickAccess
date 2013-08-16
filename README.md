QuickAccess
===========

Version 1.5.1 (2013-08-16)

###Requirements###

QuickAccess is a jQuery plugin and requires the jQuery.comb plugin (1.0.0+) by Fred LeBlanc (White Whale alumnus 2012). jQuery.comb is included for convenience in the vendor folder.

###Usage###

$('.selector').quickAccess(options);

The selector is the container for the search `<input>` (so when the element has no other function than QuickAccess it isn't shown) OR the search `<input>` itself.

QuickAccess options is a configuration object that may contain:

* _links_ : The selector for the links that are to be searched (i.e. `'#linkslist a'` or `'a.quickaccess'`). To organize results into categories, selector may be an array of objects (i.e. `[{selector:'#mammals a',title:'Mammals',className:'mammals'},{selector:'#reptiles a',title:'Reptiles',className:'reptiles'}]`). The default is `.qa_links a`.
  
* _results_ : The container in which the results will be placed. The default is to place them in a `div.qa_results` element created immediately after the search `<input>`.

*	_forceSelect_ : When true, an autocomplete option will always be selected; disable this, for instance, if you'd like the quickaccess box to also function as a typical search box. The default is `true`.

*	_onSubmit(event,selected)_ : This is the callback function for when the user hits the enter/return key; by default, this will take them to the selected link. The arguments are the keypress event and the currently selected result.

* _maxResults_ : This is the maximum number of results to show at any one time. The default is `10`.

* _placeholder_ : This sets the HTML5 placeholder attribute on the `<input>`. The default is `null` or no placeholder.

* _tooMany_ : This is the message shown when there are more matching results than maxResults. The default is `'Keep typing...'`.

* _noneFound_ : This is the message shown when no results are found. The default is `'No matches found.'`.

* _focus_ : Should the search element assume focus upon page initialization? The default is `false`.

* _removeDuplicates_ : Should duplicate URLs be allowed in the results? The default is `false`. 

* _mouseControls_ : Should mouse scroll events move you up/down the results? The default is `true`. 

* _showScore_ : Should the relevance score be appended to the individual results? When true, the score is appended to the result wrapped by `<small>`. The default is `false`.

* _combOptions_ : Should you want to tweak the response/weighting of results provided by jQuery.comb, you may alter its settings through an options object that will be passed to it. The default is to use jQuery.comb's default settings or `{}`. Refer to jQuery.comb for its configuration options.

###Examples###

__Local Data Source (in page as HTML)__

```
$('#quicksearch').quickAccess({
  links: '#offices li a',
  results: '.js-qa-results'
});
```

__Remote Data Source (as HTML)__

Below, `/includes/quickaccess.html` is an HTML snippet than would minimally be a list of links. When the user clicks into the search input for the first time, the source file is requested and cached by the script for all further same-page requests. (After that any allowed browser cache would take over, per web server cache settings.)


```
$('#quicksearch').quickAccess({
  links:'.quickaccess .category a',
  results:'.js-qa-results',
	combOptions: {
    remoteDataType: "html",
    loadFrom: function () {
      return "/includes/quickaccess.html";
    }
  }
});
```
