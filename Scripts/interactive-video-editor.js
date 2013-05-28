var H5PEditor = H5PEditor || {};

/**
 * Interactive Video editor widget module
 *
 * @param {jQuery} $
 */
H5PEditor.widgets.interactiveVideo = H5PEditor.InteractiveVideo = (function ($) {

  /**
   * Initialize interactive video editor.
   *
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   * @returns {_L8.C}
   */
  function C(parent, field, params, setValue) {
    var that = this;

    this.parent = parent;
    this.field = field;

    this.findVideoField(function (field) {
      if (field.params !== undefined) {
        that.setVideo(field.params);
      }

      field.changes.push(function (file) {
        that.setVideo(field.params);
      });
    });

    this.params = params;
    this.setValue = setValue;
    this.children = [];

    this.passReadies = true;
    parent.ready(function () {
      that.passReadies = false;
    });
  };

  /**
   * Find the video field to use for the video, then run the callback.
   *
   * @param {function} callback
   * @returns {undefined}
   */
  C.prototype.findVideoField = function (callback) {
    var that = this;

    // Find field when tree is ready.
    this.parent.ready(function () {
      var path = that.field.video;

      that.field.video = H5PEditor.findField(that.field.video, that.parent);
      if (!that.field.video) {
        throw H5PEditor.t('core', 'unknownFieldPath', {':path': path});
      }
      if (that.field.video.field.type !== 'video') {
        throw C.t('notVideoField', {':path': path});
      }

      callback(that.field.video);
    });
  };

  /**
   * Our tab has been set active. Create a new player if necessary.
   *
   * @returns {unresolved}
   */
  C.prototype.setActive = function () {
    if (this.IV !== undefined) {
      return;
    }
    if (this.video === undefined) {
      this.$editor.html(C.t('selectVideo')).removeClass('h5p-interactive-video');
      return;
    }

    var that = this;

    // Create new player.
    this.IV = new H5P.InteractiveVideo({
      interactiveVideo: {
        video: this.video,
        interactions: this.params
      }
    }, H5PEditor.contentId);
    this.IV.editor = this;
    this.IV.attach(this.$editor);

    // Add DragNBar.
    this.dnb = new H5P.DragNBar(that.getButtons(), this.IV.$videoWrapper);

    // Update params when the element is dropped.
    this.dnb.stopMovingCallback = function (x, y) {
      var params = that.params[that.dnb.dnd.$element.data('id')];
      params.x = x;
      params.y = y;
    };

    this.dnb.dnd.releaseCallback = function () {
      if (that.IV.playing) {
        that.IV.play(true);
      }

      // Edit element when it is dropped.
      if (that.dnb.newElement) {
        that.dnb.dnd.$element.dblclick();
      }
    };

    this.$bar = $('<div class="h5peditor-dragnbar"></div>').prependTo(this.$editor);
    this.dnb.attach(this.$bar);

    if (this.forms === undefined) {
      // Process semantics to make forms
      this.forms = [];
      for (var i = 0; i < this.params.length; i++) {
        this.processInteraction(i);
      }
    }
  };

  /**
   * Create form for interaction.
   *
   * @param {type} index
   * @returns {undefined}
   */
  C.prototype.processInteraction = function (index) {
    if (this.children[index] === undefined) {
      this.children[index] = [];
    }
    var tmpChildren = this.children;

    var $form = H5P.jQuery('<div></div>');
    H5PEditor.processSemanticsChunk(this.field.field.fields, this.params[index], $form, this);
    $form.children('.library:first').children('label, select').hide().end().children('.libwrap').css('margin-top', '0');

    tmpChildren[index] = this.children;
    this.children = tmpChildren;

    this.forms[index] = $form;
  };

  /**
   * Called when rendering a new interaction.
   *
   * @param {jQuery} $interaction
   * @returns {undefined}
   */
  C.prototype.newInteraction = function ($interaction) {
    var that = this;

    $interaction.mousedown(function (event) {
      if (that.IV.playing) {
        that.IV.pause(true);
      }
      that.dnb.dnd.press($interaction, event.pageX, event.pageY);
      return false;
    }).dblclick(function () {
      var id = $interaction.data('id');
      var $form = that.forms[id];
      that.IV.$dialog.children('.h5p-dialog-interaction').html('').attr('class', 'h5p-dialog-interaction').append($form);

      that.IV.showDialog();

      // Make room for buttons
      var $content = that.IV.$dialog.children('.h5p-dialog-interaction');
      var heightEm = ($content.height() / parseFloat($content.css('fontSize')));
      $content.css({
        height: (heightEm - 2) + 'em',
        width: '100%'
      });

      that.IV.$dialog.children('.h5p-dialog-hide').hide();
      $('<div class="h5p-dialog-buttons"><a href="#" class="h5p-button h5p-done">' + C.t('done') + '</a><a href="#" class="h5p-button h5p-remove">' + C.t('remove') + '</a></div>').appendTo(that.IV.$dialog).children('.h5p-done').click(function () {
        if (that.validDialog(id)) {
          that.hideDialog();
        }
        return false;
      }).end().children('.h5p-remove').click(function () {
        if (confirm(C.t('removeInteraction'))) {
          that.removeInteraction(id);
          that.hideDialog();
        }
        return false;
      });
    });
  };

  /**
   * Validate the current dialog to see if it can be closed.
   *
   * @param {Integer} id Dialog index.
   * @returns {Boolean}
   */
  C.prototype.validDialog = function (id) {
    var valid = true;
    var elementKids = this.children[id];
    for (var i = 0; i < elementKids.length; i++) {
      if (elementKids[i].validate() === false) {
        valid = false;
      }
    }

    if (valid) {
      this.forms[id].detach();
      this.IV.toggleInteraction(id);
      if (this.dnb.dnd.$coordinates !== undefined) {
        this.dnb.dnd.$coordinates.remove();
        delete this.dnb.dnd.$coordinates;
      }
    }

    return valid;
  };

  /**
   * Revert our customization to the dialog.
   *
   * @returns {undefined}
   */
  C.prototype.hideDialog = function () {
    this.IV.hideDialog();
    this.IV.$dialog.children('.h5p-dialog-interaction').css({
      height: '',
      width: ''
    });
    this.IV.$dialog.children('.h5p-dialog-hide').show();
    this.IV.$dialog.children('.h5p-dialog-buttons').remove();
  };

  /**
   * Remove interaction from video.
   *
   * @param {Integer} id
   * @returns {undefined}
   */
  C.prototype.removeInteraction = function (id) {
    this.forms.splice(id, 1);
    this.params.splice(id, 1);
    H5PEditor.removeChildren(this.children[id]);
    this.children.splice(id, 1);
    this.IV.visibleInteractions[id].remove();
    this.IV.visibleInteractions.splice(id, 1);

    // Update ids
    for (var i = 0; i < this.params.length; i++) {
      if (this.IV.visibleInteractions[i] !== undefined) {
        this.IV.visibleInteractions[i].data('id', i);
      }
    }

    if (this.dnb.dnd.$coordinates !== undefined) {
      // Remove coordiantes picker
      this.dnb.dnd.$coordinates.remove();
      delete this.dnb.dnd.$coordinates;
    }
  };

  /**
   * Returns buttons for the DragNBar.
   *
   * @returns {Array}
   */
  C.prototype.getButtons = function () {
    var options = this.field.field.fields[0].options;

    var buttons = [];
    for (var i = 0; i < options.length; i++) {
      buttons.push(this.getButton(options[i]));
    }

    return buttons;
  };

  /**
   * Returns button data for the given library.
   *
   * @param {String} library
   * @returns {_L8.C.prototype.getButton.Anonym$3}
   */
  C.prototype.getButton = function (library) {
    var that = this;
    var id = library.split(' ')[0].split('.')[1].toLowerCase();

    return {
      id: id,
      title: C.t('insertElement', {':type': id}),
      createElement: function () {
        if (that.IV.playing) {
          that.IV.pause(true);
        }

        var time = Math.floor(that.IV.video.getTime());
        var interaction = {
          action: {
            library: library,
            params: {}
          },
          x: 0,
          y: 0,
          from: time,
          to: time + 10
        };

        that.params.push(interaction);
        var i = that.params.length - 1;
        that.processInteraction(i);
        return that.IV.toggleInteraction(i, time);
      }
    };
  };

  /**
   * Set new video params and remove old player.
   *
   * @param {Object} files
   * @returns {undefined}
   */
  C.prototype.setVideo = function (files) {
    this.video = files;

    if (this.IV !== undefined) {
      this.IV.remove();
      delete this.IV;

      if (this.dnb.dnd.$coordinates !== undefined) {
        this.dnb.dnd.$coordinates.remove();
        delete this.dnb.dnd.$coordinates;
      }
    }
  };

  /**
   * Append field to wrapper.
   *
   * @param {type} $wrapper
   * @returns {undefined}
   */
  C.prototype.appendTo = function ($wrapper) {
    this.$item = $(this.createHtml()).appendTo($wrapper);
    this.$editor = this.$item.children('.h5peditor-interactions');
    this.$errors = this.$item.children('.errors');
    this.$bar = this.$item.children('.h5peditor-dragnbar');
  };

  /**
   * Create HTML for the field.
   *
   * @returns {@exp;H5PEditor@call;createItem}
   */
  C.prototype.createHtml = function () {
    return H5PEditor.createItem(this.field.widget, '<div class="h5peditor-interactions">' + C.t('selectVideo') + '</div>');
  };

  /**
   * Validate the current field.
   *
   * @returns {Boolean}
   */
  C.prototype.validate = function () {
    return true;
  };

  /**
   * Remove this item.
   *
   * @returns {undefined}
   */
  C.prototype.remove = function () {
    this.$item.remove();
  };

  /**
   * Collect functions to execute once the tree is complete.
   *
   * @param {function} ready
   * @returns {undefined}
   */
  C.prototype.ready = function (ready) {
    if (this.passReadies) {
      this.parent.ready(ready);
    }
    else {
      this.readies.push(ready);
    }
  };

  /**
   * Translate UI texts for this library.
   *
   * @param {String} key
   * @param {Object} vars
   * @returns {@exp;H5PEditor@call;t}
   */
  C.t = function (key, vars) {
    return H5PEditor.t('H5PEditor.InteractiveVideo', key, vars);
  };

  return C;
})(H5P.jQuery);

// Default english translations
H5PEditor.language['H5PEditor.InteractiveVideo'] = {
  libraryStrings: {
    selectVideo: 'You must select a video before adding interactions.',
    notVideoField: '":path" is not a video.',
    insertElement: 'Click and drag to place :type',
    popupTitle: 'Edit :type',
    done: 'Done',
    remove: 'Remove',
    removeInteraction: 'Are you sure you wish to remove this interaction?'
  }
};