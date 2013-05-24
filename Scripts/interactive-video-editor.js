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

//      // Edit element when it is dropped.
//      if (that.dnb.newElement) {
//        that.dnb.dnd.$element.dblclick();
//      }
    };

    this.$bar = $('<div class="h5peditor-dragnbar"></div>').prependTo(this.$editor);

    this.dnb.attach(this.$bar);
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
    });
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
    insertElement: 'Click and drag to place :type'
  }
};