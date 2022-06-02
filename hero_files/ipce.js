Ajax.InPlaceExternallyControlledEditor = Class.create(Ajax.InPlaceEditor, {
  initialize: function($super, element, url, options) {
    this._extraDefaultOptions = Ajax.InPlaceExternallyControlledEditor.DefaultOptions;
    $super(element, url, options);
  },
  getText: function() {
    return new String(this.element.innerHTML).unescapeHTML();
  }
});

Ajax.InPlaceExternallyControlledEditor.DefaultOptions = {
  ajaxOptions: {evalScripts: false},
  onComplete: null,
  onEnterHover: null,
  onLeaveHover: null,
  externalControlOnly: true,
  clickToEditText: ''
};

