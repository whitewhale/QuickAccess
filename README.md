QuickAccess
===========

Version 1.3.4 (2010-10-31)

###Requirements###

Any recent jQuery will do. (Load JQuery before QuickAccess.)

###Usage###

$('.inputselector').quickaccess(settingsObject);

.inputselector selects the container for the search input (so when the element has no other function than quickaccess it isn't shown) OR the search input itself.

settingsObject may contain:

* links : the selector for the links that are to be searched (i.e. '#linkslist a' or 'a.quickaccess'). To organize results into categories, selector may be an array of objects (i.e. [{selector:'#mammals a',title:'Mammals',className:'mammals'},{selector:'#reptiles a',title:'Reptiles',className:'reptiles'}])
  
* results : the container in which the results will be placed (default: they'll be placed in a .qa_results created immediately after the search box)

*	forceSelect : when true, an autocomplete option will always be selected; disable, for instance, if you'd like the quickaccess box to also function as a typical search box (default:true)

*	onSubmit(event,selected) : callback function for when the user hits the enter/return key; by default, this will take them to the selected link (args: the keypress event and the currently selected result)

*  placeholder : set the HTML5 placeholder attribute on the input (default: none)

*  maxResults : the maximum number of results to show at any one time (default: 10)

*  tooMany : the message to show when there are more matching results than maxResults (default: 'Keep typing...')

*  noneFound : the message to show when no results are found (default: 'No matches found.')

*  focus : true/false; should the search element grab focus upon page initialization? (default: false)

*  sort : true/false; should the search results be alphabetized? (default: false)

*  removeDuplicates : true/false; should duplicate URLs be allowed in the results? (default: false) 

###Example###

$('#quicksearch').quickaccess({links:'#offices li a', maxResults:10,noneFound:'Sorry, no matching links were found.'});
